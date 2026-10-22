import { addDays, dateFromIso, isoFromDate } from '@/domain/dates';

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
