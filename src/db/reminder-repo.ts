import {
  defaultReminder,
  parseOptions,
  type Reminder,
  REMINDER_KINDS,
  type ReminderKind,
  validOptions,
  validTime,
} from '@/domain/reminders/catalog';
import { validateMessage } from '@/domain/reminders/message';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';
import { writeMeta } from './meta';

type Row = {
  kind: string;
  enabled: number;
  time: string;
  options: string;
  title: string | null;
  body: string | null;
};

/** Chave e codificação do modo discreto em `app_meta` (usadas também pela exportação). */
export const DISCREET_KEY = 'reminders_discreet';
export const encodeDiscreet = (discreet: boolean) => (discreet ? '1' : '0');
const isKind = (v: string): v is ReminderKind => (REMINDER_KINDS as readonly string[]).includes(v);

/** Todos os tipos, na ordem do catálogo; os nunca salvos vêm com o padrão (desligados). */
export async function listReminders(db: SqlExecutor): Promise<Reminder[]> {
  const rows = await db.getAllAsync<Row>('SELECT kind, enabled, time, options, title, body FROM reminder');
  const saved = new Map(rows.filter((r) => isKind(r.kind)).map((r) => [r.kind, r]));
  return REMINDER_KINDS.map((kind) => {
    const row = saved.get(kind);
    if (!row) return defaultReminder(kind);
    return {
      kind,
      enabled: row.enabled === 1,
      time: validTime(row.time) ? row.time : defaultReminder(kind).time,
      options: parseOptions(row.options),
      title: row.title,
      body: row.body,
    };
  });
}

/** Grava (upsert) depois de validar; nunca loga o conteúdo da mensagem. */
export async function saveReminder(db: SqlExecutor, reminder: Reminder): Promise<void> {
  if (!isKind(reminder.kind)) throw new Error('Tipo de lembrete inválido.');
  if (!validTime(reminder.time)) throw new Error('Horário inválido.');
  if (!validOptions(reminder.options)) throw new Error('Opções inválidas.');
  const message = validateMessage(reminder.title, reminder.body);
  if (!message.ok) throw new Error('Mensagem inválida.');
  await enqueueWrite(db, () =>
    db.runAsync(
      `INSERT INTO reminder (kind, enabled, time, options, title, body) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (kind) DO UPDATE SET enabled = excluded.enabled, time = excluded.time, options = excluded.options,
         title = excluded.title, body = excluded.body`,
      reminder.kind,
      reminder.enabled ? 1 : 0,
      reminder.time,
      JSON.stringify(reminder.options),
      message.title,
      message.body,
    ),
  );
}

/** Notificações discretas: título e texto neutros na tela de bloqueio. */
export async function getDiscreet(db: SqlExecutor): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', DISCREET_KEY);
  // Sem escolha salva = discreto: texto de saúde só aparece se a pessoa desligar este modo.
  return row?.value !== '0';
}

export async function setDiscreet(db: SqlExecutor, discreet: boolean): Promise<void> {
  await enqueueWrite(db, () => writeMeta(db, DISCREET_KEY, encodeDiscreet(discreet)));
}

const ID_SECRET_KEY = 'reminder_id_secret';

/**
 * Segredo dos identificadores de lembrete. O Android guarda a agenda em texto puro, fora do banco;
 * com o segredo (que só existe aqui, cifrado), o identificador não revela tipo nem data.
 */
export async function getReminderIdSecret(db: SqlExecutor, random: (bytes: number) => Uint8Array): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', ID_SECRET_KEY);
  if (row?.value) return row.value;
  const secret = Array.from(random(16), (b) => b.toString(16).padStart(2, '0')).join('');
  await enqueueWrite(db, () => db.runAsync('INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)', ID_SECRET_KEY, secret));
  const saved = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', ID_SECRET_KEY);
  if (!saved) throw new Error('Segredo dos lembretes não foi salvo.');
  return saved.value;
}
