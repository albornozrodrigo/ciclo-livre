import { monthGrid } from '@/domain/cycle/calendar';
import { buildCycleModel } from '@/domain/cycle/model';

const TODAY = '2026-10-22';
const model = buildCycleModel(
  {
    flowDates: ['2026-08-01', '2026-08-02', '2026-08-29', '2026-08-30', '2026-09-26', '2026-09-27'],
    seed: null,
    temperatures: {},
    eggWhiteDates: [],
    positiveOvulationTests: [],
    profileCycleLength: 28,
    profilePeriodLength: 5,
  },
  TODAY,
)!;

describe('monthGrid', () => {
  const grid = monthGrid(2026, 10, model, new Set(['2026-10-20']), TODAY);
  const cell = (date: string) => grid.flat().find((c) => c.date === date)!;

  it('semanas completas começando no domingo, cobrindo o mês', () => {
    expect(grid[0][0].date).toBe('2026-09-27');
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid.at(-1)!.at(-1)!.date).toBe('2026-10-31');
  });

  it('marca dias fora do mês', () => {
    expect(cell('2026-09-27').inMonth).toBe(false);
    expect(cell('2026-10-01').inMonth).toBe(true);
  });

  it('fase real, prevista, ovulação, hoje e registro', () => {
    expect(cell('2026-09-27')).toEqual(expect.objectContaining({ phase: 'menstruation', predicted: false }));
    expect(cell('2026-10-10')).toEqual(expect.objectContaining({ phase: 'fertile', ovulation: true }));
    expect(cell('2026-10-22')).toEqual(expect.objectContaining({ today: true, phase: 'luteal' }));
    expect(cell('2026-10-24')).toEqual(expect.objectContaining({ phase: 'menstruation', predicted: true }));
    expect(cell('2026-10-20').logged).toBe(true);
    expect(cell('2026-10-21').logged).toBe(false);
  });

  it('sem modelo (gravidez, sem dados) não há fases, só registros', () => {
    const plain = monthGrid(2026, 10, null, new Set(['2026-10-20']), TODAY);
    const c = plain.flat().find((x) => x.date === '2026-10-20')!;
    expect(c).toEqual(expect.objectContaining({ phase: null, ovulation: false, logged: true }));
  });

  it('funciona muito à frente (horizonte ilimitado)', () => {
    const future = monthGrid(2027, 12, model, new Set(), TODAY);
    expect(future.flat().some((c) => c.phase === 'menstruation' && c.predicted)).toBe(true);
  });

  it('fevereiro de ano não bissexto que começa no domingo cabe em 4 semanas', () => {
    expect(monthGrid(2026, 2, null, new Set(), TODAY)).toHaveLength(4);
  });
});

describe('monthGrid antes de 1970', () => {
  it('não quebra em meses antigos', () => {
    const old = monthGrid(1969, 12, null, new Set(), TODAY);
    expect(old[0][0].date <= '1969-12-01').toBe(true);
    expect(old.every((w) => w.length === 7)).toBe(true);
  });
});
