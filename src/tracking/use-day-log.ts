import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { useSnackbar } from '@/components/ui/snackbar';
import { clearMeasure, type DayLog, getDay, setMeasure, setNote, setSelection } from '@/db/log-repo';
import type { IsoDate } from '@/domain/dates';
import { categoryById, type ChoiceCategory } from '@/domain/tracking/catalog';
import { toggleOption } from '@/domain/tracking/rules';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const EMPTY: DayLog = { selections: {}, measures: {}, note: null };

/** Estado do registro de um dia: lê do banco e grava a cada toque (otimista, com desfazer em erro). */
export function useDayLog(date: IsoDate) {
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const [day, setDay] = useState<DayLog | null>(null);

  useEffect(() => {
    let active = true;
    getDay(db, date).then(
      (loaded) => active && setDay(loaded),
      (error: unknown) => {
        log.error('day_log_load_failed', error);
        if (active) setDay(EMPTY);
      },
    );
    return () => {
      active = false;
    };
  }, [db, date]);

  const persist = useCallback(
    async (previous: DayLog, next: DayLog, write: () => Promise<void>) => {
      setDay(next);
      try {
        await write();
      } catch (error) {
        log.error('day_log_save_failed', error);
        setDay(previous);
        show(ptBR.tracking.saveFailed);
      }
    },
    [show],
  );

  const toggle = useCallback(
    (categoryId: string, option: string) => {
      if (!day) return;
      const category = categoryById(categoryId) as ChoiceCategory;
      const options = toggleOption(category, day.selections[categoryId] ?? [], option);
      const selections = { ...day.selections, [categoryId]: options };
      if (options.length === 0) delete selections[categoryId];
      void persist(day, { ...day, selections }, () => setSelection(db, date, categoryId, options));
    },
    [day, db, date, persist],
  );

  const saveMeasure = useCallback(
    (categoryId: string, value: number | null) => {
      if (!day) return;
      const measures = { ...day.measures };
      if (value === null) delete measures[categoryId];
      else measures[categoryId] = value;
      void persist(day, { ...day, measures }, () =>
        value === null ? clearMeasure(db, date, categoryId) : setMeasure(db, date, categoryId, value),
      );
    },
    [day, db, date, persist],
  );

  const saveNote = useCallback(
    (text: string) => {
      if (!day) return;
      const note = text.trim() ? text : null;
      void persist(day, { ...day, note }, () => setNote(db, date, text));
    },
    [day, db, date, persist],
  );

  return { day, toggle, saveMeasure, saveNote };
}
