import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCycleSignals, getLoggedDates } from '@/db/cycle-repo';
import { type CalendarCell, monthGrid } from '@/domain/cycle/calendar';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import type { CycleSignals } from '@/domain/cycle/signals';
import { addDays, firstOfMonth, type IsoDate, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { logUnlessClosed } from '@/db/closed';

/**
 * Grade do mês. O histórico (sinais e modelo) é lido uma vez por foco; trocar de mês só busca os
 * dias registrados daquele mês. Enquanto o mês novo carrega, devolve null (nada de grade antiga).
 */
export function useCalendar(profile: Profile | null, year: number, month: number): CalendarCell[][] | null {
  const db = useSQLiteContext();
  const [signals, setSignals] = useState<CycleSignals | null>(null);
  const [logged, setLogged] = useState<{ key: string; dates: Set<IsoDate> } | null>(null);
  const key = `${year}-${month}`;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCycleSignals(db).then(
        (loaded) => active && setSignals(loaded),
        (error: unknown) => logUnlessClosed('calendar_signals_failed', error),
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  useEffect(() => {
    let active = true;
    const first = firstOfMonth(year, month);
    getLoggedDates(db, addDays(first, -7), addDays(first, 42)).then(
      (dates) => active && setLogged({ key, dates: new Set(dates) }),
      (error: unknown) => logUnlessClosed('calendar_logged_failed', error),
    );
    return () => {
      active = false;
    };
  }, [db, key, year, month]);

  const today = todayIso();
  const model = useMemo(() => (profile && signals ? cycleModelFor(profile, signals, today) : null), [profile, signals, today]);

  if (!profile || !signals || logged?.key !== key) return null;
  return monthGrid(year, month, model, logged.dates, today);
}
