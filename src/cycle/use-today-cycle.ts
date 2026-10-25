import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getCycleSignals } from '@/db/cycle-repo';
import { type TodayView, todayCycleView } from '@/domain/cycle/today';
import { todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { logUnlessClosed } from '@/db/closed';

/** Visão do ciclo de hoje; recalcula ao voltar para a aba (ex.: depois de registrar). */
/** `refreshKey`: muda quando a pessoa registra algo na tela, para recalcular sem sair dela. */
export function useTodayCycle(profile: Profile | null, refreshKey?: unknown): TodayView | null {
  const db = useSQLiteContext();
  const [view, setView] = useState<TodayView | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return undefined;
      let active = true;
      getCycleSignals(db).then(
        (signals) => active && setView(todayCycleView(profile, signals, todayIso())),
        (error: unknown) => logUnlessClosed('today_cycle_failed', error),
      );
      return () => {
        active = false;
      };
      // refreshKey só serve para disparar de novo (ex.: registro do dia mudou): dependência intencional.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, profile, refreshKey]),
  );

  return view;
}
