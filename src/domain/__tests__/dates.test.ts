import { addDays, dateFromIso, isoFromDate, isValidDate, toDayNumber } from '@/domain/dates';

describe('datas locais', () => {
  it('converte Date local em ISO sem depender de fuso', () => {
    expect(isoFromDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('converte ISO em Date local ao meio-dia (evita virar o dia em fuso)', () => {
    const d = dateFromIso('2026-03-08');

    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 8, 12]);
  });

  it('soma e subtrai dias atravessando mês e ano', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('faixa plausível (dados de fora não podem quebrar as contas)', () => {
  it('entrada: só datas de 1900 a 2100 valem', () => {
    expect(isValidDate('9999-12-31')).toBe(false);
    expect(isValidDate('0500-01-01')).toBe(false);
    expect(isValidDate('1899-12-31')).toBe(false);
    expect(isValidDate('2101-01-01')).toBe(false);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('1900-01-01')).toBe(true);
    expect(isValidDate('2100-12-31')).toBe(true);
  });

  it('contas têm folga além da entrada: a partir de 2100 ainda se calcula o próximo ciclo', () => {
    expect(addDays('2100-12-20', 300)).toBe('2101-10-16');
    expect(toDayNumber('9999-12-31')).toBeNull();
  });

  it('addDays nunca devolve texto fora de AAAA-MM-DD: sair da faixa de contas é erro', () => {
    expect(() => addDays('2299-12-20', 28)).toThrow(RangeError);
  });
});
