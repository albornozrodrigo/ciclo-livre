import type { Href } from 'expo-router';

import { nextStep, type Step, stepsFor } from '@/domain/onboarding';
import type { Mode } from '@/domain/profile';

export const STEP_ROUTES: Record<Step, Href> = {
  welcome: '/onboarding',
  birth_year: '/onboarding/ano',
  mode: '/onboarding/objetivo',
  due_date: '/onboarding/data-prevista',
  baby_birth: '/onboarding/parto',
  final_period: '/onboarding/menopausa',
  trying_since: '/onboarding/tentando',
  last_period: '/onboarding/ultima-menstruacao',
  lengths: '/onboarding/duracoes',
  birth_control: '/onboarding/contracepcao',
  done: '/onboarding/pronto',
};

export function nextRoute(step: Step, mode: Mode | null): Href | null {
  const next = nextStep(step, mode);
  return next ? STEP_ROUTES[next] : null;
}

/** Posição para "Passo N de M" (sem contar a boas-vindas). Antes do modo, estima pelo caminho mais longo. */
export function stepPosition(step: Step, mode: Mode | null): { current: number; total: number } {
  const steps: Step[] = stepsFor(mode ?? 'period').filter((s) => s !== 'welcome');
  return { current: steps.indexOf(step) + 1, total: steps.length };
}
