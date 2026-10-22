import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getCategoryPrefs } from '@/db/log-repo';
import type { BirthControl, Mode } from '@/domain/profile';
import { type Category, categoryById, defaultVisibleCategories } from '@/domain/tracking/catalog';
import { type CategoryPref, orderCategories } from '@/domain/tracking/rules';
import { log } from '@/lib/logger';

/** Categorias visíveis do modo, na ordem e com as ocultas que a pessoa escolheu. */
export function useCategoryOrder(mode: Mode, birthControl: BirthControl | null): Category[] | null {
  const db = useSQLiteContext();
  const [prefs, setPrefs] = useState<CategoryPref[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCategoryPrefs(db).then(
        (loaded) => active && setPrefs(loaded),
        (error: unknown) => {
          log.error('category_prefs_load_failed', error);
          if (active) setPrefs([]);
        },
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  if (!prefs) return null;
  const visibleIds = defaultVisibleCategories(mode, birthControl).map((c) => c.id);
  return orderCategories(visibleIds, prefs).map((id) => categoryById(id) as Category);
}
