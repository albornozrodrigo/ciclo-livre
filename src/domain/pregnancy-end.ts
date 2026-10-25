import type { IsoDate } from './dates';
import type { Profile } from './profile';

/** Como a gravidez terminou. "Outra forma" não pede detalhe: a pessoa conta só o necessário. */
export type PregnancyEnd = { kind: 'birth'; date: IsoDate } | { kind: 'other' };

/** Perfil depois de encerrar a gravidez: nascimento → pós-parto; outra forma → Menstruação e ciclo. */
export function endPregnancy(profile: Profile, end: PregnancyEnd): Profile {
  // A última menstruação de antes da gravidez não serve de semente depois dela: o próximo sangramento registrado recomeça.
  const base = { ...profile, dueDate: null, twins: false, lastPeriodStart: null };
  if (end.kind === 'birth') return { ...base, mode: 'postpartum', babyBirth: end.date };
  return { ...base, mode: 'period' };
}
