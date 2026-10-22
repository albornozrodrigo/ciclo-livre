import { createContext, type ReactNode, useContext, useState } from 'react';

import type { IsoDate } from '@/domain/dates';
import { type BirthControl, LIMITS, type Mode, type Regularity, type TryingSince } from '@/domain/profile';

/** Respostas em andamento. Só vira perfil (e vai ao banco) no passo final, depois de validado. */
export type OnboardingDraft = {
  birthYear: string;
  mode: Mode | null;
  lastPeriodStart: IsoDate | null;
  periodLength: number;
  cycleLength: number;
  regularity: Regularity;
  dueDate: IsoDate | null;
  tryingSince: TryingSince | null;
  birthControl: BirthControl | null;
};

const initialDraft: OnboardingDraft = {
  birthYear: '',
  mode: null,
  lastPeriodStart: null,
  periodLength: LIMITS.periodLength.default,
  cycleLength: LIMITS.cycleLength.default,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
};

type DraftContextValue = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

export function OnboardingDraftProvider({ children, initial }: { children: ReactNode; initial?: Partial<OnboardingDraft> }) {
  const [draft, setDraft] = useState<OnboardingDraft>({ ...initialDraft, ...initial });
  const update = (patch: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...patch }));
  return <DraftContext.Provider value={{ draft, update }}>{children}</DraftContext.Provider>;
}

export function useOnboardingDraft(): DraftContextValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useOnboardingDraft precisa estar dentro de OnboardingDraftProvider.');
  return value;
}
