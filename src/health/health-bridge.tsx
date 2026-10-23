import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getHealthSettings } from '@/db/health-settings-repo';
import { log } from '@/lib/logger';

import { healthStatus } from './health-connect';
import { importFromHealthConnect, shouldAutoImport } from './import-health';

/** Import em curso: no módulo, para a ponte remontada não disparar um segundo. */
let running = false;

/** Importa do Health Connect ao abrir e ao voltar ao app, só com conexão ativa e no máximo a cada 6 horas. */
export function HealthBridge() {
  const db = useSQLiteContext();

  useEffect(() => {
    const check = async () => {
      if (running) return;
      running = true;
      try {
        if (!shouldAutoImport(await getHealthSettings(db))) return;
        if ((await healthStatus()) !== 'available') return;
        await importFromHealthConnect(db);
      } catch (error) {
        log.error('health_auto_import_failed', error);
      } finally {
        running = false;
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
