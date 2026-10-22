import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getCycleSignals, getLoggedDates } from '@/db/cycle-repo';
import { type CalendarCell, monthGrid } from '@/domain/cycle/calendar';
import { buildCycleModel } from '@/domain/cycle/model';
import { addDays, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { log } from '@/lib/logger';

const pad = (n: number) => String(n).padStart(2, '0');

/** Grade do mês com fases (quando o modo tem ciclo) e dias registrados; recarrega ao ganhar foco. */
export function useCalendar(profile: Profile | null, year: number, month: number): CalendarCell[][] | null {
  const db = useSQLiteContext();
  const [grid, setGrid] = useState<CalendarCell[][] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return undefined;
      let active = true;
      const today = todayIso();
      const from = addDays(`${year}-${pad(month)}-01`, -7);
      const to = addDays(`${year}-${pad(month)}-28`, 14);
      Promise.all([getCycleSignals(db), getLoggedDates(db, from, to)]).then(
        ([signals, logged]) => {
          if (!active) return;
          const withCycle = profile.mode !== 'pregnancy' && profile.mode !== 'no_bleeding';
          const seed = profile.lastPeriodStart ? { start: profile.lastPeriodStart, length: profile.periodLength } : null;
          const model = withCycle
            ? buildCycleModel({ ...signals, seed, profileCycleLength: profile.cycleLength, profilePeriodLength: profile.periodLength }, today)
            : null;
          setGrid(monthGrid(year, month, model, new Set(logged), today));
        },
        (error: unknown) => log.error('calendar_load_failed', error),
      );
      return () => {
        active = false;
      };
    }, [db, profile, year, month]),
  );

  return grid;
}
