import { cycleModelFor } from '@/domain/cycle/for-profile';
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
