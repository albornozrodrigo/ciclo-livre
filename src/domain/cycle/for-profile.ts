import type { IsoDate } from '@/domain/dates';
import type { BirthControl, Profile } from '@/domain/profile';

import { buildCycleModel, type CycleModel } from './model';
import type { CycleSignals } from './signals';

/** Modos que acompanham ciclo menstrual (gravidez, sem sangramento, pós-parto e menopausa não têm previsão de ciclo). */
export const modeHasCycle = (profile: Profile) =>
  profile.mode !== 'pregnancy' && profile.mode !== 'no_bleeding' && profile.mode !== 'postpartum' && profile.mode !== 'menopause';

/** Métodos que mudam ou suprimem a ovulação: o app não estima fertilidade com eles. */
export const HORMONAL_METHODS = [
  'pill',
  'patch',
  'ring',
  'injection',
  'implant',
  'iud_hormonal',
] as const satisfies readonly BirthControl[];

/** No modo Tentar engravidar a fertilidade sempre aparece: o método salvo pode ser antigo (o modo não pergunta). */
export const hidesFertility = (profile: Profile) =>
  profile.mode !== 'conceive' &&
  profile.birthControl !== null &&
  (HORMONAL_METHODS as readonly BirthControl[]).includes(profile.birthControl);

/** Modelo do ciclo para o perfil, com a semente do onboarding. Única fonte para Hoje e Calendário. */
export function cycleModelFor(profile: Profile, signals: CycleSignals, today: IsoDate): CycleModel | null {
  if (!modeHasCycle(profile)) return null;
  const seed = profile.lastPeriodStart ? { start: profile.lastPeriodStart, length: profile.periodLength } : null;
  const model = buildCycleModel(
    {
      ...signals,
      seed,
      profileCycleLength: profile.cycleLength,
      profilePeriodLength: profile.periodLength,
      profileLutealLength: profile.lutealLength,
      includeAtypical: profile.includeAtypical,
    },
    today,
  );
  return model && { ...model, fertilityHidden: hidesFertility(profile) };
}
