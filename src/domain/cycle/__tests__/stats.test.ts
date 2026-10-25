import type { Period } from '@/domain/cycle/periods';
import { atypicalFlags, cycleLengths, cycleStats, diffsFromUsual, recentAtypical, recentDiffs } from '@/domain/cycle/stats';

const p = (start: string): Period => ({ start, end: start, source: 'logged' });

describe('cycleLengths', () => {
  it('é a distância em dias entre inícios consecutivos', () => {
    expect(cycleLengths([p('2026-07-01'), p('2026-07-29'), p('2026-08-28')])).toEqual([28, 30]);
  });

  it('menos de duas menstruações → nenhum ciclo', () => {
    expect(cycleLengths([p('2026-07-01')])).toEqual([]);
  });
});

describe('cycleStats', () => {
  it('sem ciclos usa a duração do perfil e marca que não há dados', () => {
    expect(cycleStats([], 30)).toEqual({ mean: 30, sd: null, count: 0, lengths: [] });
  });

  it('média e desvio-padrão dos ciclos válidos', () => {
    const stats = cycleStats([28, 30, 29, 27], 28);
    expect(stats.mean).toBe(28.5);
    expect(stats.sd).toBeCloseTo(1.118, 3);
    expect(stats.count).toBe(4);
  });

  it('ignora ciclos implausíveis (registro esquecido ou duplicado)', () => {
    expect(cycleStats([28, 120, 10, 30], 28)).toEqual(expect.objectContaining({ mean: 29, count: 2, lengths: [28, 30] }));
  });

  it('usa só os 6 ciclos mais recentes', () => {
    expect(cycleStats([40, 40, 28, 28, 28, 28, 28, 28], 28).mean).toBe(28);
  });

  it('um ciclo só: média é ele, desvio desconhecido', () => {
    expect(cycleStats([31], 28)).toEqual({ mean: 31, sd: null, count: 1, lengths: [31] });
  });
});

describe('ciclos fora do padrão', () => {
  it('marca só o ciclo que difere 8 dias ou mais da mediana dos outros', () => {
    expect(atypicalFlags([28, 29, 27, 45, 28])).toEqual([false, false, false, true, false]);
  });

  it('com menos de 3 ciclos de referência não marca nada', () => {
    expect(atypicalFlags([28, 29, 40])).toEqual([false, false, false]);
  });

  it('ciclo implausível é sempre marcado', () => {
    expect(atypicalFlags([10, 28, 29, 120])).toEqual([true, false, false, true]);
  });

  it('diferença para o habitual: duração menos a mediana dos outros (null com menos de 2)', () => {
    // 28 − 28,5 → 0; 29 − 28 = 1; 27 − 28,5 → −1; 45 − 28 = 17; 28 − 28,5 → 0 (truncado, sem −0).
    expect(diffsFromUsual([28, 29, 27, 45, 28])).toEqual([0, 1, -1, 17, 0]);
    expect(diffsFromUsual([28, 30])).toEqual([null, null]);
  });

  it('a média da previsão deixa os fora do padrão de fora, a menos que a pessoa inclua', () => {
    expect(cycleStats([28, 29, 27, 45, 28], 28).mean).toBe(28);
    expect(cycleStats([28, 29, 27, 45, 28], 28, { includeAtypical: true }).mean).toBe(31.4);
  });
});

describe('ciclos fora do padrão: casos da revisão', () => {
  it('dois grupos do mesmo tamanho ou ciclos alternados: nada é marcado (não é minoria)', () => {
    expect(atypicalFlags([25, 25, 40, 40])).toEqual([false, false, false, false]);
    expect(atypicalFlags([22, 32, 22, 32])).toEqual([false, false, false, false]);
  });

  it('mudança de padrão: entre os 12 mais recentes, os antigos é que ficam fora da média', () => {
    const lengths = [...Array(20).fill(26), ...Array(8).fill(35)];
    expect(cycleStats(lengths, 28).mean).toBe(35);
    const flags = recentAtypical(lengths);
    expect(flags.slice(-8).every((f) => !f)).toBe(true);
    expect(flags.slice(-12, -8).every((f) => f)).toBe(true);
    expect(flags.slice(0, -12).every((f) => !f)).toBe(true);
  });

  it('implausível não ganha diferença para o habitual', () => {
    expect(recentDiffs([28, 29, 120, 28, 27])[2]).toBeNull();
  });

  it('com a opção ligada, volta a ser "os 6 plausíveis mais recentes"', () => {
    const lengths = [28, 28, 28, 28, 28, 28, 10, 10, 10, 10, 10, 10, 10];
    expect(cycleStats(lengths, 30, { includeAtypical: true })).toMatchObject({ mean: 28, count: 6 });
  });
});
