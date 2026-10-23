import type { HealthImport } from '@/domain/health/health-import';

import { CONNECTED, LAST } from './health-settings-repo';
import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';
import { writeMeta } from './meta';

export type HealthImportResult = {
  /** O que entrou ou foi atualizado, por categoria. */
  added: Record<string, number>;
  /** Dias em que a pessoa já tinha um valor diferente naquela categoria (vale o dela). */
  kept: number;
  dropped: number;
};

export type ApplyOptions = {
  /** Confere a conexão dentro da transação: desconectar ou restaurar no meio da leitura cancela a gravação. */
  requireConnected?: boolean;
  /** Marca o import na mesma transação. */
  markAt?: Date;
};

type Item = { date: string; category: string; value: string };
const key = (date: string, category: string) => `${date}|${category}`;

/**
 * Grava o que veio do Health Connect numa transação. Por dia e categoria:
 * - vazio e nunca importado → entra;
 * - ainda igual ao que o Health Connect gravou → atualiza (dia que estava em andamento);
 * - a pessoa registrou, editou ou apagou → vale o dela.
 * Devolve null se `requireConnected` e a conexão caiu.
 */
export async function applyHealthImport(
  db: SqlExecutor,
  data: HealthImport,
  options: ApplyOptions = {},
): Promise<HealthImportResult | null> {
  const measures: Item[] = data.measures.map((m) => ({ date: m.date, category: m.category, value: String(m.value) }));
  const selections: Item[] = data.selections.map((s) => ({ date: s.date, category: s.category, value: s.option }));
  const dates = [...measures, ...selections].map((i) => i.date).sort();
  const [from, to] = [dates[0] ?? '', dates.at(-1) ?? ''];

  return enqueueWrite(db, async () => {
    let result: HealthImportResult | null = null;
    await db.withTransactionAsync(async () => {
      if (options.requireConnected) {
        const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', CONNECTED);
        if (row?.value !== '1') return;
      }
      const load = async (sql: string) =>
        new Map(
          (await db.getAllAsync<{ date: string; category: string; value: string | number }>(sql, from, to)).map((r) => [
            key(r.date, r.category),
            String(r.value),
          ]),
        );
      const origin = await load('SELECT date, category, value FROM health_origin WHERE date BETWEEN ? AND ?');
      const existingMeasures = await load('SELECT date, category, value FROM log_measure WHERE date BETWEEN ? AND ?');
      // Mais de uma opção no mesmo dia (marcada à mão) nunca coincide com a origem: vale o da pessoa.
      const existingSelections = await load(
        "SELECT date, category, group_concat(option, ',') AS value FROM log_selection WHERE date BETWEEN ? AND ? GROUP BY date, category",
      );

      const added: Record<string, number> = {};
      let kept = 0;
      const apply = async (item: Item, existing: Map<string, string>, write: () => Promise<void>) => {
        const k = key(item.date, item.category);
        const current = existing.get(k);
        const mine = origin.get(k);
        if (current === undefined && mine !== undefined) return; // a pessoa apagou o que veio do Health Connect
        if (current !== undefined && current !== mine) {
          if (current !== item.value) kept += 1;
          return;
        }
        if (current === item.value) return;
        await write();
        await db.runAsync(
          'INSERT INTO health_origin (date, category, value) VALUES (?, ?, ?) ON CONFLICT (date, category) DO UPDATE SET value = excluded.value',
          item.date,
          item.category,
          item.value,
        );
        added[item.category] = (added[item.category] ?? 0) + 1;
      };

      for (const m of measures) {
        await apply(m, existingMeasures, () =>
          db
            .runAsync(
              'INSERT INTO log_measure (date, category, value) VALUES (?, ?, ?) ON CONFLICT (date, category) DO UPDATE SET value = excluded.value',
              m.date,
              m.category,
              Number(m.value),
            )
            .then(() => undefined),
        );
      }
      for (const s of selections) {
        await apply(s, existingSelections, async () => {
          await db.runAsync('DELETE FROM log_selection WHERE date = ? AND category = ?', s.date, s.category);
          await db.runAsync('INSERT INTO log_selection (date, category, option) VALUES (?, ?, ?)', s.date, s.category, s.value);
        });
      }
      if (options.markAt) {
        await writeMeta(db, LAST, options.markAt.toISOString());
      }
      result = { added, kept, dropped: data.dropped };
    });
    return result;
  });
}
