import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { type AiSettings, getAiSettings } from '@/db/ai-settings-repo';
import { log } from '@/lib/logger';

import { getApiKey } from './key-store';

export type AiState = { key: string | null; settings: AiSettings };

/** Chave (do armazenamento seguro) e preferências da IA; recarrega ao ganhar foco. */
export function useAi() {
  const db = useSQLiteContext();
  const [state, setState] = useState<AiState | null>(null);
  const reload = useCallback(async () => {
    const [key, settings] = await Promise.all([getApiKey(), getAiSettings(db)]);
    setState({ key, settings });
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      reload().catch((error: unknown) => log.error('ai_load_failed', error));
    }, [reload]),
  );
  return { db, state, reload };
}
