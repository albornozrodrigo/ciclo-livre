import { bbtChart, cycleHistory, cycleSummary, measureSeries, sleepHours, symptomFrequency } from '@/domain/analysis/analysis';
import { buildCycleModel } from '@/domain/cycle/model';

const TODAY = '2026-10-22';
const flow = [
  '2026-07-04',
  '2026-07-05',
  '2026-07-06',
  '2026-08-01',
  '2026-08-02',
  '2026-08-03',
  '2026-08-04',
  '2026-08-30',
  '2026-08-31',
  '2026-09-01',
  '2026-09-26',
  '2026-09-27',
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
];
const model = buildCycleModel(
  {
    flowDates: flow,
    seed: null,
    temperatures: {},
    eggWhiteDates: [],
    positiveOvulationTests: [],
    profileCycleLength: 28,
    profilePeriodLength: 5,
  },
  TODAY,
)!;

describe('cycleHistory', () => {
  it('ciclos do mais recente para o mais antigo; o atual sem duração', () => {
    expect(cycleHistory(model)).toEqual([
      {
        start: '2026-09-26',
        length: null,
        periodLength: 5,
        ovulation: { date: '2026-10-10', method: 'calendar' },
        atypical: false,
        diffFromUsual: null,
      },
      {
        start: '2026-08-30',
        length: 27,
        periodLength: 3,
        ovulation: { date: '2026-09-12', method: 'calendar' },
        atypical: false,
        diffFromUsual: -1,
      },
      {
        start: '2026-08-01',
        length: 29,
        periodLength: 4,
        ovulation: { date: '2026-08-16', method: 'calendar' },
        atypical: false,
        diffFromUsual: 1,
      },
      {
        start: '2026-07-04',
        length: 28,
        periodLength: 3,
        ovulation: { date: '2026-07-18', method: 'calendar' },
        atypical: false,
        diffFromUsual: 0,
      },
    ]);
  });

  it('menstruação em andamento mostra só os dias registrados, não a duração estendida', () => {
    const ongoing = buildCycleModel(
      {
        flowDates: ['2026-09-24', '2026-09-25', '2026-09-26', '2026-10-21', '2026-10-22'],
        seed: null,
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      TODAY,
    )!;
    expect(cycleHistory(ongoing)[0]).toMatchObject({ start: '2026-10-21', length: null, periodLength: 2 });
  });

  it('menstruação só informada no cadastro (semente) não tem duração medida', () => {
    const seeded = buildCycleModel(
      {
        flowDates: ['2026-10-01', '2026-10-02'],
        seed: { start: '2026-09-03', length: 5 },
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      TODAY,
    )!;
    expect(cycleHistory(seeded).map((r) => r.periodLength)).toEqual([2, null]);
  });
});

describe('cycleSummary', () => {
  it('média, mínima, máxima, desvio, menstruação média e contagem', () => {
    expect(cycleSummary(model)).toEqual({ count: 3, mean: 28, min: 27, max: 29, sd: expect.closeTo(0.816, 3), periodMean: 4, excluded: 0 });
  });

  it('ignora durações implausíveis (menstruação esquecida), como a previsão', () => {
    const gap = buildCycleModel(
      {
        flowDates: ['2026-03-06', '2026-03-07', '2026-03-08', ...flow],
        seed: null,
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      TODAY,
    )!;
    expect(cycleSummary(gap)).toMatchObject({ count: 3, mean: 28, min: 27, max: 29 });
  });

  it('menstruação média só com menstruações registradas; sem nenhuma terminada, null', () => {
    const seeded = buildCycleModel(
      {
        flowDates: ['2026-10-01'],
        seed: { start: '2026-09-03', length: 5 },
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      '2026-10-02',
    )!;
    expect(cycleSummary(seeded)).toMatchObject({ count: 1, periodMean: null });
  });

  it('sem ciclos completos não há resumo', () => {
    const one = buildCycleModel(
      {
        flowDates: ['2026-10-10'],
        seed: null,
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      TODAY,
    )!;
    expect(cycleSummary(one)).toBeNull();
  });
});

describe('symptomFrequency', () => {
  const selections = [
    { date: '2026-07-04', category: 'pain', option: 'cramps' },
    { date: '2026-08-01', category: 'pain', option: 'cramps' },
    { date: '2026-08-02', category: 'pain', option: 'cramps' },
    { date: '2026-09-20', category: 'feelings', option: 'anxious' },
    { date: '2026-08-20', category: 'feelings', option: 'anxious' },
    { date: '2026-07-10', category: 'skin', option: 'breakouts' },
    { date: '2026-10-01', category: 'pain', option: 'cramps' },
    { date: '2026-08-05', category: 'period', option: 'heavy' },
  ];

  it('em quantos ciclos completos cada opção apareceu e em que fase mais', () => {
    expect(symptomFrequency(model, selections, TODAY)).toEqual([
      { category: 'pain', option: 'cramps', cycles: 2, total: 3, phase: 'menstruation' },
      { category: 'feelings', option: 'anxious', cycles: 2, total: 3, phase: 'luteal' },
      { category: 'skin', option: 'breakouts', cycles: 1, total: 3, phase: 'follicular' },
    ]);
  });

  it('ignora estados neutros ou bons (corrimento normal, energia boa, calma), mantém o atípico', () => {
    const neutral = [
      { date: '2026-07-04', category: 'discharge', option: 'creamy' },
      { date: '2026-08-01', category: 'discharge', option: 'creamy' },
      { date: '2026-07-05', category: 'feelings', option: 'calm' },
      { date: '2026-08-02', category: 'energy', option: 'good' },
      { date: '2026-07-06', category: 'discharge', option: 'atypical' },
    ];
    expect(symptomFrequency(model, neutral, TODAY).map((r) => r.option)).toEqual(['atypical']);
  });

  it('o total conta só os ciclos desde o primeiro sintoma registrado', () => {
    const late = [
      { date: '2026-08-20', category: 'pain', option: 'cramps' },
      { date: '2026-09-01', category: 'pain', option: 'cramps' },
    ];
    expect(symptomFrequency(model, late, TODAY)).toEqual([
      { category: 'pain', option: 'cramps', cycles: 2, total: 2, phase: expect.any(String) },
    ]);
  });

  it('ignora categorias que não são sintomas (fluxo, coleta, testes, contracepção)', () => {
    expect(symptomFrequency(model, selections, TODAY).some((s) => s.category === 'period')).toBe(false);
  });

  it('conta as opções da v0.2 que são sintomas (coágulos, boca, mamas, inchaço, corrimento acinzentado, humores)', () => {
    const v02 = [
      { date: '2026-07-04', category: 'clots', option: 'present' },
      { date: '2026-07-10', category: 'mouth', option: 'bleeding_gums' },
      { date: '2026-07-11', category: 'breasts', option: 'nipple_discharge' },
      { date: '2026-07-12', category: 'swelling', option: 'limbs' },
      { date: '2026-07-13', category: 'discharge', option: 'gray' },
      { date: '2026-07-14', category: 'discharge', option: 'clumpy_white' },
      { date: '2026-07-15', category: 'feelings', option: 'self_critical' },
    ];
    expect(symptomFrequency(model, v02, TODAY).map((r) => `${r.category}:${r.option}`)).toEqual(
      expect.arrayContaining([
        'clots:present',
        'mouth:bleeding_gums',
        'breasts:nipple_discharge',
        'swelling:limbs',
        'discharge:gray',
        'discharge:clumpy_white',
        'feelings:self_critical',
      ]),
    );
  });

  it('autocuidado e sexo não são sintomas', () => {
    const notSymptoms = [
      { date: '2026-07-04', category: 'self_care', option: 'breathing' },
      { date: '2026-08-01', category: 'sex', option: 'orgasm' },
    ];
    expect(symptomFrequency(model, notSymptoms, TODAY)).toEqual([]);
  });

  it('com menos de 2 ciclos completos não calcula', () => {
    const one = buildCycleModel(
      {
        flowDates: ['2026-09-26', '2026-10-20'],
        seed: null,
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      TODAY,
    )!;
    expect(symptomFrequency(one, selections, TODAY)).toEqual([]);
  });
});

describe('bbtChart', () => {
  it('pontos do ciclo, ovulação e linha de cobertura', () => {
    const temps: Record<string, number> = {};
    const lows = [36.3, 36.4, 36.3, 36.5, 36.4, 36.3, 36.4, 36.3];
    lows.forEach(
      (t, i) =>
        (temps[
          `2026-09-${String(26 + i).padStart(2, '0')}`
            .replace('2026-09-31', '2026-10-01')
            .replace('2026-09-32', '2026-10-02')
            .replace('2026-09-33', '2026-10-03')
        ] = t),
    );
    temps['2026-10-04'] = 36.8;
    temps['2026-10-05'] = 36.8;
    temps['2026-10-06'] = 36.9;

    const chart = bbtChart(temps, '2026-09-26', '2026-10-22');

    expect(chart.points[0]).toEqual({ cycleDay: 1, value: 36.3 });
    expect(chart.points).toHaveLength(11);
    expect(chart.ovulationDay).toBe(8);
    expect(chart.coverLine).toBe(36.5);
  });

  it('sem subida confirmada não há ovulação nem linha', () => {
    expect(bbtChart({ '2026-09-26': 36.4 }, '2026-09-26', '2026-10-22')).toEqual({
      points: [{ cycleDay: 1, value: 36.4 }],
      ovulationDay: null,
      coverLine: null,
    });
  });
});

describe('measureSeries', () => {
  it('pontos dos últimos 90 dias e resumo', () => {
    const series = measureSeries({ '2026-10-01': 60, '2026-10-20': 61.5, '2026-06-01': 70 }, TODAY);
    expect(series.points).toEqual([
      { date: '2026-10-01', value: 60 },
      { date: '2026-10-20', value: 61.5 },
    ]);
    expect(series.summary).toEqual({ last: 61.5, mean: 60.75, min: 60, max: 61.5 });
  });

  it('sem dados no período: resumo nulo', () => {
    expect(measureSeries({}, TODAY)).toEqual({ points: [], summary: null });
  });
});

describe('sleepHours', () => {
  it('converte a faixa registrada no ponto médio em horas', () => {
    expect(
      sleepHours([
        { date: '2026-10-01', category: 'sleep', option: '6_9h' },
        { date: '2026-10-02', category: 'sleep', option: 'under_3h' },
        { date: '2026-10-02', category: 'energy', option: 'low' },
      ]),
    ).toEqual({ '2026-10-01': 7.5, '2026-10-02': 1.5 });
  });
});
