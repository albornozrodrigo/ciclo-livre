import { buildCycleModel, type CycleInputs, dayInfo, pregnancyWeek } from '@/domain/cycle/model';

const TODAY = '2026-10-22';

const base: CycleInputs = {
  flowDates: [],
  seed: null,
  temperatures: {},
  eggWhiteDates: [],
  positiveOvulationTests: [],
  profileCycleLength: 28,
  profilePeriodLength: 5,
};

/** Três menstruações de 5 dias com ciclos de 28 dias: 01/08, 29/08, 26/09; a próxima prevista é 24/10. */
const flow28 = [
  ...['01', '02', '03', '04', '05'].map((d) => `2026-08-${d}`),
  ...['29', '30', '31'].map((d) => `2026-08-${d}`),
  '2026-09-01', '2026-09-02',
  ...['26', '27', '28', '29', '30'].map((d) => `2026-09-${d}`),
];

describe('buildCycleModel', () => {
  it('sem nenhuma menstruação não há modelo de ciclo', () => {
    expect(buildCycleModel(base, TODAY)).toBeNull();
  });

  it('prevê a próxima menstruação pela média dos ciclos, com janela de incerteza', () => {
    const model = buildCycleModel({ ...base, flowDates: flow28 }, TODAY)!;

    expect(model.next).toEqual({ start: '2026-10-24', earliest: '2026-10-23', latest: '2026-10-25' });
  });

  it('a duração da menstruação prevista é a média das registradas', () => {
    const model = buildCycleModel({ ...base, flowDates: flow28 }, TODAY)!;
    expect(model.periodLength).toBe(5);
  });

  it('com só a semente usa as durações do perfil e confiança baixa', () => {
    const model = buildCycleModel({ ...base, seed: { start: '2026-10-10', length: 5 }, profileCycleLength: 30 }, TODAY)!;
    expect(model.next.start).toBe('2026-11-09');
    expect(model.confidence).toBe('low');
  });

  it('ciclo atual usa a ovulação confirmada pela temperatura', () => {
    const temperatures: Record<string, number> = {};
    // 26/09 a 08/10 baixas, a partir de 09/10 altas → ovulação 08/10
    for (let d = 26; d <= 30; d++) temperatures[`2026-09-${d}`] = 36.3;
    for (let d = 1; d <= 8; d++) temperatures[`2026-10-0${d}`] = 36.4;
    temperatures['2026-10-09'] = 36.7;
    temperatures['2026-10-10'] = 36.8;
    temperatures['2026-10-11'] = 36.8;
    const model = buildCycleModel({ ...base, flowDates: flow28, temperatures }, TODAY)!;

    expect(model.current.ovulation).toEqual({ date: '2026-10-08', method: 'bbt' });
  });

  it('sem sinais, ovulação do ciclo atual = próxima menstruação − 14', () => {
    const model = buildCycleModel({ ...base, flowDates: flow28 }, TODAY)!;
    expect(model.current.ovulation).toEqual({ date: '2026-10-10', method: 'calendar' });
  });
});

describe('dayInfo', () => {
  const model = () => buildCycleModel({ ...base, flowDates: flow28 }, TODAY)!;

  it.each([
    ['2026-09-27', 2, 'menstruation', false],
    ['2026-10-03', 8, 'follicular', false],
    ['2026-10-05', 10, 'fertile', false],
    ['2026-10-10', 15, 'fertile', false],
    ['2026-10-11', 16, 'fertile', false],
    ['2026-10-12', 17, 'luteal', false],
    ['2026-10-22', 27, 'luteal', false],
    ['2026-10-24', 1, 'menstruation', true],
    ['2026-10-28', 5, 'menstruation', true],
    ['2026-10-29', 6, 'follicular', true],
  ])('%s → dia %i, %s, previsto=%p', (date, cycleDay, phase, predicted) => {
    expect(dayInfo(model(), date as string, TODAY)).toEqual(expect.objectContaining({ cycleDay, phase, predicted }));
  });

  it('dias de ciclos passados usam o próximo início real', () => {
    expect(dayInfo(model(), '2026-08-28', TODAY)).toEqual(expect.objectContaining({ cycleDay: 28, phase: 'luteal', predicted: false }));
  });

  it('previsões seguem para os meses seguintes sem limite', () => {
    const info = dayInfo(model(), '2027-06-01', TODAY)!;
    expect(info.predicted).toBe(true);
    expect(info.cycleDay).toBeGreaterThanOrEqual(1);
  });

  it('antes da primeira menstruação conhecida não há informação', () => {
    expect(dayInfo(model(), '2026-07-01', TODAY)).toBeNull();
  });
});

describe('confiança', () => {
  it.each([
    [['2026-08-01', '2026-08-29', '2026-09-26'], 'medium'],
    [['2026-06-06', '2026-07-04', '2026-08-01', '2026-08-29', '2026-09-26'], 'high'],
    [['2026-06-01', '2026-07-10', '2026-07-30', '2026-09-05', '2026-09-26'], 'low'],
  ])('%j → %s', (starts, expected) => {
    expect(buildCycleModel({ ...base, flowDates: starts as string[] }, TODAY)!.confidence).toBe(expected);
  });
});

describe('pregnancyWeek', () => {
  it('conta semanas a partir de 280 dias antes da data prevista', () => {
    expect(pregnancyWeek('2027-05-01', '2026-10-22')).toEqual({ week: 12, day: 5, daysToDue: 191 });
  });

  it('não fica negativo perto do início', () => {
    expect(pregnancyWeek('2027-07-29', '2026-10-22').week).toBe(0);
  });
});

describe('menstruação atrasada', () => {
  it('quando a data esperada já passou, marca atraso e espera a partir de hoje', () => {
    const model = buildCycleModel({ ...base, flowDates: flow28 }, '2026-10-30')!;

    expect(model.late).toBe(true);
    expect(model.next.start).toBe('2026-10-30');
  });
});

describe('fase lútea medida', () => {
  it('com ovulação confirmada por temperatura no ciclo passado, prevê com a fase lútea da pessoa', () => {
    const temperatures: Record<string, number> = {};
    // ciclo 29/08–25/09: baixas até 13/09, altas a partir de 14/09 → ovulação 13/09; lútea = 26/09 − 13/09 = 13
    for (let d = 1; d <= 13; d++) temperatures[`2026-09-${String(d).padStart(2, '0')}`] = 36.3;
    for (let d = 14; d <= 25; d++) temperatures[`2026-09-${d}`] = 36.8;
    const model = buildCycleModel({ ...base, flowDates: flow28, temperatures }, TODAY)!;

    expect(model.lutealLength).toBe(13);
    expect(model.current.ovulation).toEqual({ date: '2026-10-11', method: 'calendar' });
  });
});
