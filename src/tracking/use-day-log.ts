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

function withSelection(day: DayLog, categoryId: string, options: string[]): DayLog {
  const selections = { ...day.selections, [categoryId]: options };
  if (options.length === 0) delete selections[categoryId];
  return { ...day, selections };
}

function withMeasure(day: DayLog, categoryId: string, value: number | null): DayLog {
  const measures = { ...day.measures };
  if (value === null) delete measures[categoryId];
  else measures[categoryId] = value;
  return { ...day, measures };
}

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

  /** Aplica a mudança na hora; se a gravação falhar, desfaz só aquela mudança (não o dia inteiro). */
  const persist = useCallback(
    async (apply: (d: DayLog) => DayLog, revert: (d: DayLog) => DayLog, write: () => Promise<void>) => {
      setDay((d) => (d ? apply(d) : d));
      try {
        await write();
      } catch (error) {
        log.error('day_log_save_failed', error);
        setDay((d) => (d ? revert(d) : d));
        show(ptBR.tracking.saveFailed);
      }
    },
    [show],
  );

  const toggle = useCallback(
    (categoryId: string, option: string) => {
      if (!day) return;
      const category = categoryById(categoryId) as ChoiceCategory;
      const before = day.selections[categoryId] ?? [];
      const options = toggleOption(category, before, option);
      void persist(
        (d) => withSelection(d, categoryId, options),
        (d) => withSelection(d, categoryId, before),
        () => setSelection(db, date, categoryId, options),
      );
    },
    [day, db, date, persist],
  );

  const saveMeasure = useCallback(
    (categoryId: string, value: number | null) => {
      if (!day) return;
      const before = day.measures[categoryId] ?? null;
      void persist(
        (d) => withMeasure(d, categoryId, value),
        (d) => withMeasure(d, categoryId, before),
        () => (value === null ? clearMeasure(db, date, categoryId) : setMeasure(db, date, categoryId, value)),
      );
    },
    [day, db, date, persist],
  );

  const saveNote = useCallback(
    (text: string) => {
      if (!day) return;
      const before = day.note;
      const note = text.trim() ? text : null;
      void persist(
        (d) => ({ ...d, note }),
        (d) => ({ ...d, note: before }),
        () => setNote(db, date, text),
      );
    },
    [day, db, date, persist],
  );

  return { day, toggle, saveMeasure, saveNote };
}
