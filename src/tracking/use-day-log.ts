import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

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

function sameOptions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
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
  // O estado guarda de qual data ele é: ao trocar de dia, o anterior nunca aparece sob a data nova.
  const [loaded, setLoaded] = useState<{ date: IsoDate; log: DayLog } | null>(null);
  const day = loaded?.date === date ? loaded.log : null;
  // Estado mais recente para toques seguidos (a closure de `day` pode estar um render atrás).
  const latest = useRef<DayLog | null>(null);
  useEffect(() => {
    latest.current = day;
  }, [day]);
  const setDay = useCallback(
    (update: (d: DayLog) => DayLog) => setLoaded((s) => (s && s.date === date ? { date, log: update(s.log) } : s)),
    [date],
  );

  useEffect(() => {
    let active = true;
    getDay(db, date).then(
      (log) => active && setLoaded({ date, log }),
      (error: unknown) => {
        log.error('day_log_load_failed', error);
        if (active) setLoaded({ date, log: EMPTY });
      },
    );
    return () => {
      active = false;
    };
  }, [db, date]);

  /** Aplica a mudança na hora; se a gravação falhar, desfaz só aquela mudança (não o dia inteiro). */
  const persist = useCallback(
    async (apply: (d: DayLog) => DayLog, revert: (d: DayLog) => DayLog, write: () => Promise<void>) => {
      if (latest.current) latest.current = apply(latest.current);
      setDay(apply);
      try {
        await write();
      } catch (error) {
        log.error('day_log_save_failed', error);
        if (latest.current) latest.current = revert(latest.current);
        setDay(revert);
        show(ptBR.tracking.saveFailed);
      }
    },
    [setDay, show],
  );

  const toggle = useCallback(
    (categoryId: string, option: string) => {
      const current = latest.current ?? day;
      if (!current) return;
      const category = categoryById(categoryId) as ChoiceCategory;
      const before = current.selections[categoryId] ?? [];
      const options = toggleOption(category, before, option);
      void persist(
        (d) => withSelection(d, categoryId, options),
        // Só desfaz se ninguém mudou a categoria depois; senão manteria um valor mais novo já salvo.
        (d) => (sameOptions(d.selections[categoryId] ?? [], options) ? withSelection(d, categoryId, before) : d),
        () => setSelection(db, date, categoryId, options),
      );
    },
    [day, db, date, persist],
  );

  const saveMeasure = useCallback(
    (categoryId: string, value: number | null) => {
      const current = latest.current ?? day;
      if (!current) return;
      const before = current.measures[categoryId] ?? null;
      void persist(
        (d) => withMeasure(d, categoryId, value),
        (d) => ((d.measures[categoryId] ?? null) === value ? withMeasure(d, categoryId, before) : d),
        () => (value === null ? clearMeasure(db, date, categoryId) : setMeasure(db, date, categoryId, value)),
      );
    },
    [day, db, date, persist],
  );

  const saveNote = useCallback(
    (text: string) => {
      const current = latest.current ?? day;
      if (!current) return;
      const before = current.note;
      const note = text.trim() ? text : null;
      void persist(
        (d) => ({ ...d, note }),
        (d) => (d.note === note ? { ...d, note: before } : d),
        () => setNote(db, date, text),
      );
    },
    [day, db, date, persist],
  );

  return { day, toggle, saveMeasure, saveNote };
}
