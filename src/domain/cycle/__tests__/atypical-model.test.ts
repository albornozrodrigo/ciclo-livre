import { cycleHistory, cycleSummary } from '@/domain/analysis/analysis';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { addDays } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
};
// Ciclos de 28, 29, 27, 45 e 28 dias.
const starts = ['2026-03-01'];
for (const length of [28, 29, 27, 45, 28]) starts.push(addDays(starts[starts.length - 1], length));
const flowDates = starts.flatMap((s) => [s, addDays(s, 1)]);
const signals = { flowDates, temperatures: {}, eggWhiteDates: [], positiveOvulationTests: [], painDates: [] };
const TODAY = addDays(starts[starts.length - 1], 5);

describe('ciclos fora do padrão no modelo', () => {
  it('a previsão não é puxada pelo ciclo de 45 dias', () => {
    const model = cycleModelFor(profile, signals, TODAY)!;
    expect(model.cycleLength).toBe(28);
  });

  it('a pessoa pode incluir os fora do padrão na média', () => {
    const model = cycleModelFor({ ...profile, includeAtypical: true }, signals, TODAY)!;
    expect(model.cycleLength).toBe(31);
  });

  it('o histórico marca o ciclo e diz quanto ele fugiu do habitual', () => {
    const rows = cycleHistory(cycleModelFor(profile, signals, TODAY)!).filter((r) => r.length !== null);
    const long = rows.find((r) => r.length === 45)!;
    expect(long).toMatchObject({ atypical: true, diffFromUsual: 17 });
    expect(rows.filter((r) => r.atypical)).toHaveLength(1);
  });

  it('o resumo da Análise deixa o ciclo de fora e conta quantos ficaram de fora', () => {
    const summary = cycleSummary(cycleModelFor(profile, signals, TODAY)!)!;
    expect(summary).toMatchObject({ count: 4, max: 29, excluded: 1 });
  });
});
