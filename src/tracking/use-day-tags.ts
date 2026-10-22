import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { useSnackbar } from '@/components/ui/snackbar';
import { createTag, getDayTags, listTags, setDayTags, type Tag } from '@/db/tag-repo';
import type { IsoDate } from '@/domain/dates';
import { validateTagName } from '@/domain/tracking/tags';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

type State = { all: Tag[]; selected: number[] };

/** Tags da pessoa e as marcadas no dia; marcar salva na hora. */
export function useDayTags(date: IsoDate) {
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listTags(db), getDayTags(db, date)]).then(
      ([all, day]) => active && setState({ all, selected: day.map((t) => t.id) }),
      (error: unknown) => {
        log.error('day_tags_load_failed', error);
        if (active) setState({ all: [], selected: [] });
      },
    );
    return () => {
      active = false;
    };
  }, [db, date]);

  const save = useCallback(
    async (selected: number[], previous: number[]) => {
      setState((s) => (s ? { ...s, selected } : s));
      try {
        await setDayTags(db, date, selected);
      } catch (error) {
        log.error('day_tags_save_failed', error);
        setState((s) => (s ? { ...s, selected: previous } : s));
        show(ptBR.tags.saveFailed);
      }
    },
    [db, date, show],
  );

  const toggle = useCallback(
    (id: number) => {
      if (!state) return;
      const selected = state.selected.includes(id) ? state.selected.filter((x) => x !== id) : [...state.selected, id];
      void save(selected, state.selected);
    },
    [save, state],
  );

  /** Cria e já marca no dia. Devolve o erro de validação (para a UI) ou null. */
  const create = useCallback(
    async (raw: string): Promise<'empty' | 'too_long' | 'duplicate' | null> => {
      if (!state) return null;
      const result = validateTagName(raw, state.all.map((t) => t.name));
      if (!result.ok) return result.error;
      try {
        const tag = await createTag(db, result.name);
        setState((s) => (s ? { ...s, all: [...s.all, tag].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) } : s));
        await save([...state.selected, tag.id], state.selected);
      } catch (error) {
        log.error('tag_create_failed', error);
        show(ptBR.tags.saveFailed);
      }
      return null;
    },
    [db, save, show, state],
  );

  return { state, toggle, create };
}
