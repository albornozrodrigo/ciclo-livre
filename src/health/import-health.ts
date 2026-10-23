import { applyHealthImport, type HealthImportResult } from '@/db/health-import-repo';
import { getHealthSettings, type HealthSettings } from '@/db/health-settings-repo';
import type { SqlExecutor } from '@/db/types';
import { mapHealthConnect } from '@/domain/health/health-import';

import { grantedHealthTypes, readHealth } from './health-connect';

const DAY = 24 * 60 * 60 * 1000;
/** O Health Connect libera 30 dias antes da permissão sem a permissão de histórico. */
const WINDOW_DAYS = 30;
/** Folga ao reimportar: dados sincronizados com atraso pelo relógio ainda entram. */
const OVERLAP_DAYS = 2;
const AUTO_EVERY = 6 * 60 * 60 * 1000;

/** Import em curso: a tela e a abertura do app podem pedir juntos (ex.: ao voltar da permissão). */
let inFlight: Promise<HealthImportResult | null> | null = null;

/** Importa os tipos escolhidos e concedidos. Desconectado: não lê nada (null). Chamadas simultâneas dividem a mesma leitura. */
export function importFromHealthConnect(db: SqlExecutor, now: Date = new Date()): Promise<HealthImportResult | null> {
  inFlight ??= runImport(db, now).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runImport(db: SqlExecutor, now: Date): Promise<HealthImportResult | null> {
  const settings = await getHealthSettings(db);
  if (!settings.connected) return null;
  const granted = await grantedHealthTypes();
  const types = settings.types.filter((t) => granted.includes(t));
  const oldest = now.getTime() - WINDOW_DAYS * DAY;
  const last = settings.lastImport ? Date.parse(settings.lastImport) : Number.NaN;
  // Último import no futuro (relógio adiantado e corrigido) ou ilegível: começa de novo pelos 30 dias.
  const since = Number.isFinite(last) && last <= now.getTime() ? Math.max(oldest, last - OVERLAP_DAYS * DAY) : oldest;
  const { input, truncated } = await readHealth(types, new Date(since), now);
  // Leitura cortada no teto: grava o que veio, mas não avança a marca (a próxima lê de novo).
  return applyHealthImport(db, mapHealthConnect(input), { requireConnected: true, markAt: truncated ? undefined : now });
}

/** Ao abrir o app: só com conexão ativa e no máximo a cada 6 horas (marca no futuro conta como vencida). */
export function shouldAutoImport(settings: HealthSettings, now: Date = new Date()): boolean {
  if (!settings.connected) return false;
  if (!settings.lastImport) return true;
  const elapsed = now.getTime() - Date.parse(settings.lastImport);
  return !(elapsed >= 0 && elapsed <= AUTO_EVERY);
}
