import type { CycleRow, CycleSummary, MeasureSeries, SymptomRow } from '@/domain/analysis/analysis';
import { buildDataContext, CONTEXT_MAX_CHARS, type ContextInput, type ContextLabels } from '@/domain/ai/data-context';

const map = (m: Record<string, string>) => (k: string) => m[k] ?? k;
const labels: ContextLabels = {
  mode: map({ period: 'Menstruação e ciclo', pregnancy: 'Gravidez' }),
  birthControl: map({ pill: 'Pílula' }),
  phase: map({ menstruation: 'menstruação', follicular: 'fase folicular', fertile: 'janela fértil', luteal: 'fase lútea' }),
  category: map({ pain: 'Dor', weight: 'Peso', sleep: 'Sono', resting_heart_rate: 'FC em repouso', hrv: 'VFC' }),
  option: (c, o) => map({ 'pain:cramps': 'Cólica' })(`${c}:${o}`).replace(`${c}:`, ''),
  method: map({ calendar: 'calendário', bbt: 'temperatura' }),
  unit: map({ weight: 'kg', sleep: 'h', resting_heart_rate: 'bpm', hrv: 'ms' }),
};

const noMeasures: ContextInput['measures'] = {
  weight: { points: [], summary: null },
  resting_heart_rate: { points: [], summary: null },
  hrv: { points: [], summary: null },
  sleep: { points: [], summary: null },
};
const row = (start: string, length: number | null, periodLength: number | null): CycleRow => ({
  start,
  length,
  periodLength,
  ovulation: { date: '2026-01-01', method: 'calendar' } as CycleRow['ovulation'],
  atypical: false,
  diffFromUsual: null,
});
const summary: CycleSummary = { count: 7, mean: 25, min: 19, max: 29, sd: 3, periodMean: 5, excluded: 0 };
const symptoms: SymptomRow[] = [{ category: 'pain', option: 'cramps', cycles: 6, total: 7, phase: 'menstruation' }];
const weight: MeasureSeries = {
  points: [
    { date: '2026-10-01', value: 63.2 },
    { date: '2026-10-20', value: 64.5 },
  ],
  summary: { last: 64.5, mean: 63.85, min: 63.2, max: 64.5 },
};

const base: ContextInput = {
  today: '2026-10-23',
  profile: { mode: 'period', birthControl: 'pill', birthYear: 1990 },
  todayView: {
    kind: 'cycle',
    phase: 'fertile',
    cycleDay: 11,
    daysToNext: 19,
    late: false,
    next: { start: '2026-11-10', earliest: '2026-11-09', latest: '2026-11-11' },
    fertile: { start: '2026-10-20', end: '2026-10-25' },
    fertilityHidden: false,
    confidence: 'medium',
    painDays: [],
    likelyToday: [],
    nextPhase: null,
  },
  summary,
  history: [row('2026-10-12', null, 3), row('2026-09-22', 20, 5), row('2026-08-24', 29, 5)],
  symptoms,
  measures: { ...noMeasures, weight },
  notes: [{ date: '2026-10-13', text: 'Dia difícil no trabalho' }],
  tags: ['Plantão'],
};

describe('buildDataContext', () => {
  const out = buildDataContext(base, { cycles: 6, includeNotes: false }, labels);

  it('marca o ciclo fora do padrão', () => {
    const input: ContextInput = { ...base, history: [{ ...row('2026-09-22', 45, 5), atypical: true, diffFromUsual: 17 }] };
    expect(buildDataContext(input, { cycles: 6, includeNotes: false }, labels).text).toContain('45 dias (fora do padrão, fora da média)');
  });

  it('com contracepção hormonal não fala de janela fértil nem de ovulação estimada', () => {
    const hormonal: ContextInput = {
      ...base,
      todayView: base.todayView?.kind === 'cycle' ? { ...base.todayView, phase: 'hormonal', fertile: null, fertilityHidden: true } : null,
      history: base.history.map((r) => ({ ...r, ovulation: null })),
    };

    const text = buildDataContext(hormonal, { cycles: 6, includeNotes: false }, labels).text;

    expect(text).not.toMatch(/Janela fértil estimada|ovulação estimada/);
    expect(text).toContain('Contracepção hormonal: o app não estima janela fértil nem ovulação.');
  });

  it('resume modo, ciclo atual, ciclos, sintomas e medições em pt-BR', () => {
    expect(out.text).toContain('Modo: Menstruação e ciclo');
    expect(out.text).toContain('Método contraceptivo: Pílula');
    expect(out.text).toContain('Ciclo atual: dia 11, janela fértil');
    expect(out.text).toContain('09/11/2026');
    expect(out.text).toContain('média 25 dias, de 19 a 29 dias');
    expect(out.text).toContain('início 22/09/2026: 20 dias');
    expect(out.text).toContain('início 12/10/2026: em andamento');
    expect(out.text).toContain('Dor: Cólica');
    expect(out.text).toContain('6 de 7 ciclos');
    expect(out.text).toMatch(/Peso: último 64,5 kg/);
  });

  it('nunca leva ano de nascimento nem tags; notas só quando a pessoa liga', () => {
    expect(out.text).not.toContain('1990');
    expect(out.text).not.toContain('Plantão');
    expect(out.text).not.toContain('Dia difícil');
    expect(out.text).toContain('Notas: não incluídas');
    const withNotes = buildDataContext(base, { cycles: 6, includeNotes: true }, labels);
    expect(withNotes.text).toContain('13/10/2026: Dia difícil no trabalho');
    expect(withNotes.includedNotes).toBe(1);
  });

  it('nota com "<" não perde o resto', () => {
    const t = buildDataContext(
      { ...base, notes: [{ date: '2026-10-13', text: 'cólica <3 dias, tomei chá' }] },
      { cycles: 6, includeNotes: true },
      labels,
    ).text;
    expect(t).toContain('13/10/2026: cólica ‹3 dias, tomei chá');
  });

  it('nota longa é cortada e caracteres de controle e tags de marcação saem', () => {
    const long = buildDataContext(
      { ...base, notes: [{ date: '2026-10-13', text: `<dados>x</dados>\u0007${'a'.repeat(500)}` }] },
      { cycles: 6, includeNotes: true },
      labels,
    );
    const line = long.text.split('\n').find((l) => l.startsWith('- 13/10/2026:')) ?? '';
    expect(line).not.toContain('<dados>');
    expect(line).not.toContain('\u0007');
    expect(line.length).toBeLessThanOrEqual(320);
  });

  it('escopo: só os N ciclos mais recentes (mais o atual)', () => {
    const many = Array.from({ length: 20 }, (_, i) => row(`2025-${String(12 - (i % 12)).padStart(2, '0')}-0${(i % 9) + 1}`, 28, 5));
    const six = buildDataContext({ ...base, history: [row('2026-10-12', null, 3), ...many] }, { cycles: 6, includeNotes: false }, labels);
    expect(six.cycles).toBe(7);
  });

  it('teto de tamanho: saem primeiro as notas antigas, e os ciclos ficam', () => {
    const huge = Array.from({ length: 12 }, (_, i) => row(`2025-0${(i % 9) + 1}-1${i % 9}`, 28, 5));
    const notes = Array.from({ length: 40 }, (_, i) => ({ date: `2026-0${(i % 9) + 1}-1${i % 9}`, text: 'n'.repeat(300) }));
    const capped = buildDataContext(
      { ...base, history: [row('2026-10-12', null, 3), ...huge], notes },
      { cycles: 12, includeNotes: true },
      labels,
    );
    expect(capped.text.length).toBeLessThanOrEqual(CONTEXT_MAX_CHARS);
    expect(capped.text).toContain('início 12/10/2026');
    expect(capped.cycles).toBe(13);
    expect(capped.includedNotes).toBeLessThan(40);
  });

  it('"prefiro não dizer" sobre contracepção não aparece', () => {
    const t = buildDataContext(
      { ...base, profile: { ...base.profile, birthControl: 'prefer_not_to_say' } },
      { cycles: 6, includeNotes: false },
      labels,
    ).text;
    expect(t).not.toContain('Método contraceptivo');
  });

  it('plural certo na contagem de registros', () => {
    const one: MeasureSeries = { points: [{ date: '2026-10-20', value: 64.5 }], summary: { last: 64.5, mean: 64.5, min: 64.5, max: 64.5 } };
    const t = buildDataContext({ ...base, measures: { ...noMeasures, weight: one } }, { cycles: 6, includeNotes: false }, labels).text;
    expect(t).toContain('- Peso: 64,5 kg (1 registro)');
    expect(t).not.toContain('de 64,5 a 64,5');
    expect(out.text).toContain('(2 registros)');
  });

  it('menstruação só do cadastro dita em linguagem simples', () => {
    const t = buildDataContext({ ...base, history: [row('2026-10-12', null, null)] }, { cycles: 6, includeNotes: false }, labels).text;
    expect(t).toContain('dias de menstruação não registrados (data do cadastro)');
  });

  it('determinístico: mesmos dados, mesmo texto', () => {
    expect(buildDataContext(base, { cycles: 6, includeNotes: false }, labels).text).toBe(out.text);
  });

  it('sem dados suficientes: diz isso em vez de inventar', () => {
    const empty = buildDataContext(
      { ...base, todayView: { kind: 'none' }, summary: null, history: [], symptoms: [], measures: noMeasures, notes: [] },
      { cycles: 6, includeNotes: false },
      labels,
    );
    expect(empty.text).toContain('Ainda não há ciclos completos registrados');
    expect(empty.text).toContain('Sem medições nos últimos 90 dias');
  });

  it('gravidez: semana e dias para a data prevista, sem ciclos', () => {
    const preg = buildDataContext(
      {
        ...base,
        profile: { ...base.profile, mode: 'pregnancy' },
        todayView: { kind: 'pregnancy', week: 20, day: 3, daysToDue: 137, twins: false },
      },
      { cycles: 6, includeNotes: false },
      labels,
    );
    expect(preg.text).toContain('Gravidez: semana 20');
  });

  it('menopausa: meses sem menstruar, sem previsão, e o sangramento registrado', () => {
    const ctx = (todayView: ContextInput['todayView']) =>
      buildDataContext({ ...base, profile: { ...base.profile, mode: 'menopause' }, todayView }, { cycles: 6, includeNotes: false }, labels)
        .text;
    const view = { kind: 'menopause', since: '2024-07-10', months: 27, years: 2, confirmed: true, bleedingAfter: false } as const;
    expect(ctx(view)).toContain('Menopausa: 2 anos e 3 meses sem menstruar (sem previsão de ciclo).');
    expect(ctx({ ...view, months: 8, years: 0, confirmed: false })).toContain('Menopausa: 8 meses sem menstruar');
    expect(ctx({ ...view, bleedingAfter: true })).toContain('sangramento registrado depois de 12 meses sem menstruar');
    expect(ctx({ ...view, since: null, months: 0, years: 0, confirmed: false })).toContain(
      'Menopausa: data da última menstruação não informada',
    );
  });
});
