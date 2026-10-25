import { fromMonthIndex, initialMonthRange, monthIndex, weeksInMonth } from '../month-list';

describe('lista de meses do calendário', () => {
  it('índice de mês ida e volta, atravessando o ano', () => {
    expect(fromMonthIndex(monthIndex(2026, 12) + 1)).toEqual({ year: 2027, month: 1 });
    expect(fromMonthIndex(monthIndex(2026, 1) - 1)).toEqual({ year: 2025, month: 12 });
  });

  it('sem registros: 12 meses para trás e 12 para a frente do mês atual', () => {
    const range = initialMonthRange('2026-10-24', null);
    expect(fromMonthIndex(range.start)).toEqual({ year: 2025, month: 10 });
    expect(fromMonthIndex(range.current)).toEqual({ year: 2026, month: 10 });
    expect(fromMonthIndex(range.end)).toEqual({ year: 2027, month: 10 });
  });

  it('registros antigos (ex.: importados do Clue) puxam o começo da lista até o mês deles', () => {
    const range = initialMonthRange('2026-10-24', '2019-03-08');
    expect(fromMonthIndex(range.start)).toEqual({ year: 2019, month: 3 });
  });

  it('registro recente não encurta os 12 meses para trás', () => {
    const range = initialMonthRange('2026-10-24', '2026-09-01');
    expect(fromMonthIndex(range.start)).toEqual({ year: 2025, month: 10 });
  });

  it('semanas por mês (domingo a sábado)', () => {
    expect(weeksInMonth(2026, 2)).toBe(4); // fevereiro de 2026 começa num domingo
    expect(weeksInMonth(2026, 10)).toBe(5);
    expect(weeksInMonth(2026, 8)).toBe(6); // começa num sábado, 31 dias
  });
});
