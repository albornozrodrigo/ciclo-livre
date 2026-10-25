import { type Step, stepsFor } from '@/domain/onboarding';
import { LIMITS, type Mode, type ProfileField, type ProfileInput } from '@/domain/profile';

import type { OnboardingDraft } from './draft';

/** Onde cada campo é perguntado no onboarding. */
const STEP_OF_FIELD: Record<ProfileField, Step> = {
  birthYear: 'birth_year',
  mode: 'mode',
  lastPeriodStart: 'last_period',
  periodLength: 'lengths',
  cycleLength: 'lengths',
  regularity: 'lengths',
  dueDate: 'due_date',
  tryingSince: 'trying_since',
  birthControl: 'birth_control',
};

/**
 * Só vira perfil o que o fluxo do modo escolhido perguntou. Respostas de um caminho
 * abandonado (a pessoa voltou e trocou de modo) não são guardadas.
 */
export function toProfileInput(draft: OnboardingDraft): ProfileInput {
  const mode: Mode = draft.mode ?? 'period';
  const asked = new Set(stepsFor(mode));
  const keep = <T>(step: Step, value: T, fallback: T): T => (asked.has(step) ? value : fallback);
  return {
    birthYear: Number(draft.birthYear),
    mode,
    lastPeriodStart: keep('last_period', draft.lastPeriodStart, null),
    periodLength: keep('lengths', draft.periodLength, LIMITS.periodLength.default),
    cycleLength: keep('lengths', draft.cycleLength, LIMITS.cycleLength.default),
    regularity: keep('lengths', draft.regularity, 'unknown'),
    dueDate: keep('due_date', draft.dueDate, null),
    tryingSince: keep('trying_since', draft.tryingSince, null),
    birthControl: keep('birth_control', draft.birthControl, null),
  };
}

/** Passo para corrigir um campo; se ele não faz parte do fluxo do modo, volta à escolha de modo. */
export function fixStepFor(field: ProfileField, mode: Mode): Step {
  const step = STEP_OF_FIELD[field];
  return stepsFor(mode).includes(step) ? step : 'mode';
}
