import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { getCycleSignals, getLoggedDates } from '@/db/cycle-repo';
import { logUnlessClosed } from '@/db/closed';
import type { CycleModel } from '@/domain/cycle/model';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import type { CycleSignals } from '@/domain/cycle/signals';
import { type IsoDate, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

export type CalendarData = {
  model: CycleModel | null;
  logged: ReadonlySet<IsoDate>;
  /** Primeiro dia com registro: a lista de meses começa, no máximo, nele. */
  firstLogged: IsoDate | null;
  today: IsoDate;
};

const ALL = { from: '0000-01-01', to: '9999-12-31' } as const;

/**
 * Tudo o que a lista de meses precisa, lido uma vez por foco: sinais do ciclo e os dias com registro
 * (só as datas, sem conteúdo). Cada mês monta a própria grade a partir disto, sem nova consulta ao rolar.
 */
export function useCalendarData(profile: Profile | null): CalendarData | null {
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState<{ signals: CycleSignals; dates: IsoDate[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getCycleSignals(db), getLoggedDates(db, ALL.from, ALL.to)]).then(
        ([signals, dates]) => active && setLoaded({ signals, dates }),
        (error: unknown) => logUnlessClosed('calendar_load_failed', error),
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  const today = todayIso();
  return useMemo(() => {
    if (!profile || !loaded) return null;
    return {
      model: cycleModelFor(profile, loaded.signals, today),
      logged: new Set(loaded.dates),
      // getLoggedDates devolve em ordem de data.
      firstLogged: loaded.dates[0] ?? null,
      today,
    };
  }, [profile, loaded, today]);
}
