import type { IsoDate } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

import { buildCycleModel, type CycleModel } from './model';
import type { CycleSignals } from './signals';

/** Modos que acompanham ciclo menstrual (gravidez e sem sangramento não têm previsão de ciclo). */
export const modeHasCycle = (profile: Profile) => profile.mode !== 'pregnancy' && profile.mode !== 'no_bleeding';

/** Modelo do ciclo para o perfil, com a semente do onboarding. Única fonte para Hoje e Calendário. */
export function cycleModelFor(profile: Profile, signals: CycleSignals, today: IsoDate): CycleModel | null {
  if (!modeHasCycle(profile)) return null;
  const seed = profile.lastPeriodStart ? { start: profile.lastPeriodStart, length: profile.periodLength } : null;
  return buildCycleModel(
    { ...signals, seed, profileCycleLength: profile.cycleLength, profilePeriodLength: profile.periodLength },
    today,
  );
}
