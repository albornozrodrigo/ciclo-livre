import type { Mode } from './profile';

export type Step = 'welcome' | 'birth_year' | 'mode' | 'due_date' | 'trying_since' | 'last_period' | 'lengths' | 'birth_control' | 'done';

const COMMON: Step[] = ['welcome', 'birth_year', 'mode'];

/** Só perguntamos o que o modo usa: menos perguntas, menos dado pessoal guardado. */
const BY_MODE: Record<Mode, Step[]> = {
  period: ['last_period', 'lengths', 'birth_control'],
  perimenopause: ['last_period', 'lengths', 'birth_control'],
  no_bleeding: ['birth_control'],
  conceive: ['trying_since', 'last_period', 'lengths'],
  pregnancy: ['due_date'],
};

export function stepsFor(mode: Mode | null): Step[] {
  return mode === null ? COMMON : [...COMMON, ...BY_MODE[mode], 'done'];
}

export function nextStep(current: Step, mode: Mode | null): Step | null {
  const steps = stepsFor(mode);
  const index = steps.indexOf(current);
  return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
}

export function previousStep(current: Step, mode: Mode | null): Step | null {
  const steps = stepsFor(mode);
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1] : null;
}
