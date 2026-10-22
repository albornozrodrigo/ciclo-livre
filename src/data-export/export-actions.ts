import { getRandomBytes } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { exportAll, importAll } from '@/db/export-repo';
import type { SqlExecutor } from '@/db/types';
import type { IsoDate } from '@/domain/dates';
import { decryptBackup, encryptBackup, type KdfParams } from '@/domain/export/backup';
import { buildCsv } from '@/domain/export/csv';
import { type ExportData, IMPORT_ERROR, parseExport } from '@/domain/export/format';
import type { Profile } from '@/domain/profile';
import { csvLabels } from '@/i18n/pt-BR-export';
import { log } from '@/lib/logger';
import { createReportPdf } from '@/report/report-pdf';

export type ExportKind = 'relatorio' | 'planilha' | 'completo' | 'backup';
export const EXPORT_KINDS: readonly ExportKind[] = ['relatorio', 'planilha', 'completo', 'backup'];

/** Arquivo temporário (pasta privada do app), pronto para compartilhar ou salvar. */
export type ExportItem = { file: File; name: string; mimeType: string };

type Options = {
  db: SqlExecutor;
  profile: Profile;
  today: IsoDate;
  includeNotes: boolean;
  password?: string;
  /** Só para testes (no app, os parâmetros padrão do scrypt). */
  kdf?: KdfParams;
};

/** Pasta dos temporários de exportação, dentro do cache privado do app. */
const exportDir = () => new Directory(Paths.cache, 'exportar');

/**
 * Apaga todos os temporários de exportação. O compartilhar não pode apagar na hora (o Drive e o Gmail leem
 * o arquivo depois que o menu fecha), então a limpeza acontece antes da próxima exportação e no "apagar tudo".
 */
export function purgeExports(): void {
  const dir = exportDir();
  if (dir.exists) dir.delete();
}

function freshDir(): Directory {
  purgeExports();
  const dir = exportDir();
  dir.create();
  return dir;
}

async function writeTemp(dir: Directory, name: string, content: string): Promise<File> {
  const file = new File(dir, name);
  file.create();
  await file.write(content);
  return file;
}

/** Gera o arquivo pedido no aparelho. Nada sai daqui até a pessoa escolher um destino. */
export async function prepareExport(kind: ExportKind, { db, profile, today, includeNotes, password, kdf }: Options): Promise<ExportItem> {
  const dir = freshDir();
  if (kind === 'relatorio') {
    const name = `relatorio-ciclo-livre-${today}.pdf`;
    // O gerador usa nome aleatório; quem recebe o arquivo precisa ver um nome que diga o que é.
    const printed = new File(await createReportPdf(db, profile, { includeNotes, today }));
    const file = new File(dir, name);
    // No Android, `copy` é assíncrono (apesar do tipo): esperar antes de apagar a origem.
    await printed.copy(file);
    printed.delete();
    return { file, name, mimeType: 'application/pdf' };
  }
  const data = await exportAll(db);
  if (kind === 'planilha') {
    const name = `ciclo-livre-${today}.csv`;
    return { file: await writeTemp(dir, name, buildCsv(data, csvLabels)), name, mimeType: 'text/csv' };
  }
  if (kind === 'completo') {
    const name = `ciclo-livre-${today}.json`;
    return { file: await writeTemp(dir, name, JSON.stringify(data, null, 2)), name, mimeType: 'application/json' };
  }
  const encrypted = await encryptBackup(JSON.stringify(data), password ?? '', { random: getRandomBytes, kdf });
  const name = `ciclo-livre-backup-${today}.ciclolivre`;
  return { file: await writeTemp(dir, name, encrypted), name, mimeType: 'application/octet-stream' };
}

/** Menu de compartilhar do Android: Google Drive, e-mail e outros apps aparecem como destino. */
export async function shareFile(item: ExportItem): Promise<void> {
  await shareAsync(item.file.uri, { mimeType: item.mimeType, dialogTitle: item.name });
}

/**
 * Seletor de pastas do Android (SAF, árvore de pastas). Só mostra o armazenamento do aparelho: o app do Drive
 * não oferece "escolher pasta" (testado no S21 FE). Para o Drive, o caminho é o compartilhar.
 * Devolve 'cancelled' se a pessoa fechar o seletor.
 */
export async function saveToFolder(item: ExportItem): Promise<'saved' | 'cancelled'> {
  try {
    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch {
      // O seletor rejeita quando a pessoa fecha sem escolher (e em falhas raras): registrado, tratado como cancelado.
      log.event('folder_pick_closed');
      return 'cancelled';
    }
    const destination = directory.createFile(item.name, item.mimeType);
    await destination.write(await item.file.bytes());
    return 'saved';
  } finally {
    if (item.file.exists) item.file.delete();
  }
}

export type RestoreRead = { kind: 'needs_password' } | { kind: 'ready'; data: ExportData };

/**
 * Primeira etapa da restauração: lê e confere o arquivo (descriptografa, se for backup), sem mexer em nada.
 * Senha errada: BACKUP_ERROR. Arquivo que não é do app: IMPORT_ERROR.
 */
export async function readRestore(text: string, password?: string): Promise<RestoreRead> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(IMPORT_ERROR);
  }
  const isBackup = typeof parsed === 'object' && parsed !== null && (parsed as { format?: unknown }).format === 'ciclo-livre-backup';
  if (isBackup) {
    if (!password) return { kind: 'needs_password' };
    const plain = await decryptBackup(text, password);
    return { kind: 'ready', data: parseExport(JSON.parse(plain)) };
  }
  return { kind: 'ready', data: parseExport(parsed) };
}

/** Segunda etapa: substitui tudo pelo conteúdo já conferido (quem chama confirma antes). */
export function applyRestore(db: SqlExecutor, data: ExportData): Promise<void> {
  return importAll(db, data);
}
