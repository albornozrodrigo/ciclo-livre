import type { ContextLabels } from '@/domain/ai/data-context';
import type { BirthControl, Mode } from '@/domain/profile';

import { ptBR } from './pt-BR';
import { categoryLabels } from './pt-BR-tracking';

const UNITS: Record<string, string> = { weight: 'kg', resting_heart_rate: 'bpm', hrv: 'ms', sleep: 'h' };

/** Rótulos do resumo enviado ao chat: os mesmos que a pessoa vê nas telas. */
export const chatContextLabels: ContextLabels = {
  mode: (mode: Mode) => ptBR.onboarding.mode.options[mode].label,
  birthControl: (method: BirthControl) => ptBR.onboarding.birthControl.options[method],
  phase: (phase) => ptBR.calendar.phase[phase],
  category: (id) => categoryLabels(id).label,
  option: (category, option) => categoryLabels(category).options?.[option] ?? option,
  method: (method) => (ptBR.report.methods as Record<string, string>)[method] ?? method,
  unit: (key) => UNITS[key] ?? '',
};
