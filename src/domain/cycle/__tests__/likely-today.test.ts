import { predictLikelyToday } from '@/domain/cycle/likely-today';
import { buildCycleModel } from '@/domain/cycle/model';
import { addDays } from '@/domain/dates';

// Ciclos de 28, 30, 27 e 29 dias; o atual começa em `current`.
const starts = ['2026-05-01'];
for (const length of [28, 30, 27, 29]) starts.push(addDays(starts[starts.length - 1], length));
const current = starts[starts.length - 1];
const model = (today: string) =>
  buildCycleModel(
    {
      flowDates: starts.flatMap((s) => [s, addDays(s, 1)]),
      seed: null,
      temperatures: {},
      eggWhiteDates: [],
      positiveOvulationTests: [],
      profileCycleLength: 28,
      profilePeriodLength: 5,
    },
    today,
  )!;
const sel = (date: string, category: string, option: string) => ({ date, category, option });

describe('Pode aparecer hoje', () => {
  it('sintoma perto deste dia do ciclo em mais da metade dos ciclos aparece, com o motivo', () => {
    const symptoms = [
      sel(starts[0], 'pain', 'cramps'),
      sel(addDays(starts[1], 1), 'pain', 'cramps'),
      sel(starts[3], 'pain', 'cramps'),
      sel(addDays(starts[2], 10), 'pain', 'headache'),
      sel(starts[2], 'pain', 'headache'),
    ];
    expect(predictLikelyToday(model(current), symptoms, current)).toEqual([{ category: 'pain', option: 'cramps', cycles: 3, total: 4 }]);
  });

  it('sintoma de antes da menstruação é contado a partir da menstruação seguinte', () => {
    // 2 dias antes da menstruação seguinte em 3 dos 4 ciclos (ciclos de tamanhos diferentes).
    const symptoms = [1, 2, 3].map((i) => sel(addDays(starts[i], -2), 'feelings', 'irritable'));
    const today = addDays(model(current).next.start, -2);
    expect(predictLikelyToday(model(today), symptoms, today)).toEqual([{ category: 'feelings', option: 'irritable', cycles: 3, total: 3 }]);
  });

  it('estados neutros e o que não é sintoma nunca aparecem', () => {
    const symptoms = [0, 1, 2, 3].flatMap((i) => [
      sel(starts[i], 'discharge', 'creamy'),
      sel(starts[i], 'energy', 'good'),
      sel(starts[i], 'sex', 'orgasm'),
      sel(starts[i], 'self_care', 'breathing'),
    ]);
    expect(predictLikelyToday(model(current), symptoms, current)).toEqual([]);
  });

  it('no máximo 3, do mais frequente para o menos', () => {
    const options = ['cramps', 'headache', 'back', 'joints'];
    const symptoms = options.flatMap((option, k) =>
      [0, 1, 2, 3].slice(0, 4 - (k === 3 ? 1 : 0)).map((i) => sel(starts[i], 'pain', option)),
    );
    const out = predictLikelyToday(model(current), symptoms, current);
    expect(out).toHaveLength(3);
    expect(out.map((r) => r.option)).not.toContain('joints');
  });

  it('com menos de 2 ciclos completos com registro não prevê', () => {
    expect(predictLikelyToday(model(current), [sel(starts[3], 'pain', 'cramps')], current)).toEqual([]);
  });
});

describe('Pode aparecer hoje: casos da revisão', () => {
  it('com a menstruação atrasada, nada é previsto', () => {
    const symptoms = [0, 1, 2].map((i) => sel(addDays(starts[i + 1], -1), 'pain', 'cramps'));
    const late = addDays(current, 40);
    const m = model(late);
    expect(m.late).toBe(true);
    expect(predictLikelyToday(m, symptoms, late)).toEqual([]);
  });
});
