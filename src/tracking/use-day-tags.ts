import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSnackbar } from '@/components/ui/snackbar';
import { createTag, getDayTags, listTags, setDayTags, type Tag } from '@/db/tag-repo';
import type { IsoDate } from '@/domain/dates';
import { normalizeTagKey, validateTagName } from '@/domain/tracking/tags';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

type State = { all: Tag[]; selected: number[] };
export type CreateResult = 'empty' | 'too_long' | 'duplicate' | 'failed' | null;

/** Mesma ordem do banco (`ORDER BY key`), para os chips não mudarem de lugar ao reabrir. */
const byKey = (a: Tag, b: Tag) => (normalizeTagKey(a.name) < normalizeTagKey(b.name) ? -1 : 1);

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

  const creating = useRef(false);

  /** Cria e já marca no dia. Devolve o erro (para a UI manter o texto) ou null em caso de sucesso. */
  const create = useCallback(
    async (raw: string): Promise<CreateResult> => {
      if (!state || creating.current) return 'failed';
      const result = validateTagName(
        raw,
        state.all.map((t) => t.name),
      );
      if (!result.ok) return result.error;
      creating.current = true;
      try {
        const tag = await createTag(db, result.name);
        setState((s) => (s ? { ...s, all: [...s.all, tag].sort(byKey) } : s));
        await save([...state.selected, tag.id], state.selected);
        return null;
      } catch (error) {
        log.error('tag_create_failed', error);
        show(ptBR.tags.saveFailed);
        return 'failed';
      } finally {
        creating.current = false;
      }
    },
    [db, save, show, state],
  );

  return { state, toggle, create };
}
