import type { Period } from '@/domain/cycle/periods';
import { cycleLengths, cycleStats } from '@/domain/cycle/stats';

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
