import { cycleModelFor } from '@/domain/cycle/for-profile';
import { addDays } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: '2026-10-10',
  periodLength: 5,
  cycleLength: 30,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
};
const signals = { flowDates: [], temperatures: {}, eggWhiteDates: [], positiveOvulationTests: [], painDates: [] };

describe('cycleModelFor', () => {
  it.each(['period', 'conceive', 'perimenopause'] as const)('modo %s tem modelo (usa a semente do perfil)', (mode) => {
    expect(cycleModelFor({ ...profile, mode }, signals, '2026-10-22')?.next.start).toBe('2026-11-09');
  });

  it.each(['pregnancy', 'no_bleeding'] as const)('modo %s não tem modelo de ciclo', (mode) => {
    expect(cycleModelFor({ ...profile, mode, dueDate: '2027-05-01' }, signals, '2026-10-22')).toBeNull();
  });
});

describe('fase lútea informada', () => {
  const flow = { ...signals, flowDates: ['2026-08-15', '2026-08-16', '2026-09-12', '2026-09-13', '2026-10-10', '2026-10-11'] };

  it('sem temperatura, a ovulação por calendário fica N dias antes da próxima menstruação', () => {
    const model = cycleModelFor({ ...profile, lutealLength: 11, includeAtypical: false, babyBirth: null }, flow, '2026-10-22')!;
    expect(model.current.ovulation).toEqual({ date: addDays(model.expected, -11), method: 'calendar' });
  });

  it('sem informar, vale 14 dias (como antes)', () => {
    const model = cycleModelFor(profile, flow, '2026-10-22')!;
    expect(model.current.ovulation.date).toBe(addDays(model.expected, -14));
  });

  it('valor informado que não cabe no ciclo medido é ignorado (janela fértil cairia na menstruação)', () => {
    const short = { ...signals, flowDates: ['2026-09-10', '2026-09-11', '2026-10-01', '2026-10-02', '2026-10-22'] };
    const model = cycleModelFor(
      { ...profile, periodLength: 5, lutealLength: 18, includeAtypical: false, babyBirth: null },
      short,
      '2026-10-23',
    )!;
    expect(model.cycleLength).toBe(21);
    expect(model.lutealLength).toBe(14);
  });

  it('a fase lútea medida pela temperatura vale mais que a informada', () => {
    const temperatures: Record<string, number> = {};
    // Ciclo de 15/08 a 11/09: subida confirmada em 27/08 → ovulação 26/08, lútea 17 dias.
    ['08-20', '08-21', '08-22', '08-23', '08-24', '08-25', '08-26'].forEach((d) => (temperatures[`2026-${d}`] = 36.3));
    ['08-27', '08-28', '08-29'].forEach((d) => (temperatures[`2026-${d}`] = 36.7));
    const model = cycleModelFor(
      { ...profile, lutealLength: 11, includeAtypical: false, babyBirth: null },
      { ...flow, temperatures },
      '2026-10-22',
    )!;
    expect(model.lutealLength).toBe(17);
  });
});
