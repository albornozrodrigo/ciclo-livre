import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getHealthSettings } from '@/db/health-settings-repo';

import { healthStatus } from './health-connect';
import { importFromHealthConnect, shouldAutoImport } from './import-health';
import { logUnlessClosed } from '@/db/closed';

/** Importa do Health Connect ao abrir e ao voltar ao app, só com conexão ativa e no máximo a cada 6 horas. */
export function HealthBridge() {
  const db = useSQLiteContext();

  useEffect(() => {
    // Chamadas simultâneas (tela + abertura) já dividem a mesma leitura em importFromHealthConnect.
    const check = async () => {
      try {
        if (!shouldAutoImport(await getHealthSettings(db))) return;
        if ((await healthStatus()) !== 'available') return;
        await importFromHealthConnect(db);
      } catch (error) {
        logUnlessClosed('health_auto_import_failed', error);
      }
    };
    check();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => subscription.remove();
  }, [db]);

  return null;
}
