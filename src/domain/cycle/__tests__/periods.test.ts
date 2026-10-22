import { detectPeriods } from '@/domain/cycle/periods';

describe('detectPeriods', () => {
  it('agrupa dias seguidos de fluxo numa menstruação', () => {
    expect(detectPeriods(['2026-09-01', '2026-09-02', '2026-09-03'], null)).toEqual([
      { start: '2026-09-01', end: '2026-09-03', source: 'logged' },
    ]);
  });

  it('um dia sem registro no meio não separa a menstruação', () => {
    expect(detectPeriods(['2026-09-01', '2026-09-03', '2026-09-04'], null)).toEqual([
      { start: '2026-09-01', end: '2026-09-04', source: 'logged' },
    ]);
  });

  it('dois ou mais dias sem fluxo separam menstruações; ordem de entrada não importa', () => {
    expect(detectPeriods(['2026-09-29', '2026-09-01', '2026-09-02', '2026-09-30'], null)).toEqual([
      { start: '2026-09-01', end: '2026-09-02', source: 'logged' },
      { start: '2026-09-29', end: '2026-09-30', source: 'logged' },
    ]);
  });

  it('ignora datas repetidas', () => {
    expect(detectPeriods(['2026-09-01', '2026-09-01'], null)).toHaveLength(1);
  });

  it('usa a semente do onboarding quando não há registro perto dela', () => {
    expect(detectPeriods(['2026-10-01'], { start: '2026-09-03', length: 5 })).toEqual([
      { start: '2026-09-03', end: '2026-09-07', source: 'seed' },
      { start: '2026-10-01', end: '2026-10-01', source: 'logged' },
    ]);
  });

  it('descarta a semente se já há menstruação registrada a até 7 dias dela', () => {
    expect(detectPeriods(['2026-09-05', '2026-09-06'], { start: '2026-09-03', length: 5 })).toEqual([
      { start: '2026-09-05', end: '2026-09-06', source: 'logged' },
    ]);
  });

  it('sem registros e sem semente não há menstruações', () => {
    expect(detectPeriods([], null)).toEqual([]);
  });
});
