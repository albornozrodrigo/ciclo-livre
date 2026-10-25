import { buildCycleModel } from '@/domain/cycle/model';
import type { Profile } from '@/domain/profile';
import { buildReport, REPORT_CYCLES } from '@/domain/report/report';

const TODAY = '2026-10-22';
// Oito menstruações a cada 28 dias, de 3 dias cada; a última começa em 2026-10-15.
const starts = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 15) - (7 - i) * 28 * 86_400_000);
  return d.toISOString().slice(0, 10);
});
const flow = starts.flatMap((s) => [0, 1, 2].map((k) => new Date(Date.parse(s) + k * 86_400_000).toISOString().slice(0, 10)));
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
const profile: Profile = {
  birthYear: 1990,
  mode: 'period',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular',
  dueDate: null,
  tryingSince: null,
  birthControl: 'iud_copper',
  lutealLength: null,
  includeAtypical: false,
};
const notes = [
  { date: '2026-10-16', text: 'Cólica forte' },
  { date: '2025-01-01', text: 'Fora do período' },
];
const input = { model, profile, selections: [], measures: { weight: { '2026-10-20': 64.5 } }, notes, today: TODAY };

describe('buildReport', () => {
  it(`últimos ${REPORT_CYCLES} ciclos completos, do mais recente ao mais antigo, e o atual à parte`, () => {
    const report = buildReport({ ...input, includeNotes: false });
    expect(report.cycles?.complete).toHaveLength(REPORT_CYCLES);
    expect(report.cycles?.complete[0].start).toBe(starts[6]);
    expect(report.cycles?.current.start).toBe(starts[7]);
  });

  it('período coberto: do início do ciclo mais antigo do relatório até hoje', () => {
    expect(buildReport({ ...input, includeNotes: false }).period).toEqual({ from: starts[1], to: TODAY });
  });

  it('resumo reaproveita a Análise; contracepção do perfil', () => {
    const report = buildReport({ ...input, includeNotes: false });
    expect(report.cycles?.summary).toMatchObject({ mean: 28, min: 28, max: 28 });
    expect(report.birthControl).toBe('iud_copper');
    expect(report.measures.weight.summary?.last).toBe(64.5);
  });

  it('notas só se a pessoa marcar, e só as do período', () => {
    expect(buildReport({ ...input, includeNotes: false }).notes).toEqual([]);
    expect(buildReport({ ...input, includeNotes: true }).notes).toEqual([{ date: '2026-10-16', text: 'Cólica forte' }]);
  });

  it('sem modelo de ciclo (gravidez), só medições', () => {
    const report = buildReport({ ...input, model: null, includeNotes: false });
    expect(report.cycles).toBeNull();
    expect(report.period).toEqual({ from: '2026-07-24', to: TODAY });
  });
});
