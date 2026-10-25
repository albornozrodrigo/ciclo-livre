import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { exportAll } from '@/db/export-repo';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import { applyRestore, prepareExport, purgeExports, readRestore, saveToFolder, shareFile } from '@/data-export/export-actions';
import type { Profile } from '@/domain/profile';
import { BACKUP_ERROR, encryptBackup } from '@/domain/export/backup';
import { IMPORT_ERROR } from '@/domain/export/format';

const mockFiles = new Map<string, string | Uint8Array>();
const mockDeleted: string[] = [];
let mockPickCancel = false;
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    create() {
      mockFiles.set(this.uri, '');
    }
    async write(content: string | Uint8Array) {
      mockFiles.set(this.uri, content);
    }
    async text() {
      return String(mockFiles.get(this.uri));
    }
    // Como no aparelho: a cópia termina depois (assíncrona).
    async copy(destination: { uri: string }) {
      await Promise.resolve();
      if (!mockFiles.has(this.uri)) throw new Error('NoSuchFileException');
      mockFiles.set(destination.uri, mockFiles.get(this.uri) as string);
    }
    async bytes() {
      const v = mockFiles.get(this.uri);
      return typeof v === 'string' ? new TextEncoder().encode(v) : (v as Uint8Array);
    }
    delete() {
      mockDeleted.push(this.uri);
      mockFiles.delete(this.uri);
    }
  }
  class MockDirectory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return true;
    }
    create() {}
    delete() {
      for (const key of [...mockFiles.keys()]) {
        if (key.startsWith(`${this.uri}/`)) {
          mockDeleted.push(key);
          mockFiles.delete(key);
        }
      }
    }
    static pickDirectoryAsync = async () => {
      if (mockPickCancel) throw new Error('canceled');
      return { createFile: (name: string) => new MockFile('drive', name) };
    };
  }
  return { File: MockFile, Paths: { cache: { uri: 'cache' } }, Directory: MockDirectory };
});
const mockShare = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('expo-sharing', () => ({ shareAsync: (...args: unknown[]) => mockShare(...args) }));
jest.mock('expo-crypto', () => ({ getRandomBytes: (n: number) => new Uint8Array(n).fill(3) }));
// O scrypt nativo não existe no Jest: o do JS dá o mesmo resultado (RFC 7914). Espionado para provar o uso.
const mockNativeScrypt = jest.fn((...a: unknown[]) => jest.requireActual('@/domain/export/backup').defaultScrypt(...a));
jest.mock('@/crypto/native-scrypt', () => ({ nativeScrypt: (...a: unknown[]) => mockNativeScrypt(...a) }));
jest.mock('expo-print', () => ({
  printToFileAsync: async () => {
    mockFiles.set('cache/Print/x.pdf', '%PDF');
    return { uri: 'cache/Print/x.pdf' };
  },
}));

const profile: Profile = {
  birthYear: 1990,
  mode: 'period',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: false,
};
const TODAY = '2026-10-22';
const FAST = { N: 1024, r: 8, p: 1 };

let db: ReturnType<typeof openMemoryDatabase>;
beforeEach(async () => {
  mockFiles.clear();
  mockDeleted.length = 0;
  mockPickCancel = false;
  mockShare.mockClear();
  db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  await saveProfile(db, profile);
  await setSelection(db, '2026-10-15', 'period', ['heavy']);
});

describe('prepareExport', () => {
  it.each([
    ['planilha', 'ciclo-livre-2026-10-22.csv', 'text/csv'],
    ['completo', 'ciclo-livre-2026-10-22.json', 'application/json'],
    ['relatorio', 'relatorio-ciclo-livre-2026-10-22.pdf', 'application/pdf'],
  ] as const)('%s: nome e tipo do arquivo', async (kind, name, mimeType) => {
    const item = await prepareExport(kind, { db, profile, today: TODAY, includeNotes: false });
    expect(item).toMatchObject({ name, mimeType });
    expect(mockFiles.has(item.file.uri)).toBe(true);
    // Quem recebe vê o nome certo (não o aleatório do gerador de PDF).
    expect(item.file.uri).toBe(`cache/exportar/${name}`);
  });

  it('backup: só com senha, e o conteúdo sai criptografado', async () => {
    await expect(prepareExport('backup', { db, profile, today: TODAY, includeNotes: false })).rejects.toThrow('Senha curta');
    const item = await prepareExport('backup', { db, profile, today: TODAY, includeNotes: false, password: 'senha-forte!', kdf: FAST });
    expect(item.name).toBe('ciclo-livre-backup-2026-10-22.ciclolivre');
    expect(String(mockFiles.get(item.file.uri))).not.toContain('heavy');
    expect(mockNativeScrypt).toHaveBeenCalled();
  });
});

it('relatório: o PDF com nome aleatório é apagado depois de copiado com o nome certo', async () => {
  await prepareExport('relatorio', { db, profile, today: TODAY, includeNotes: false });
  expect(mockDeleted).toContain('cache/Print/x.pdf');
});

describe('destinos', () => {
  it('compartilhar abre o menu do Android e NÃO apaga na hora (Drive e Gmail leem o arquivo depois)', async () => {
    const item = await prepareExport('completo', { db, profile, today: TODAY, includeNotes: false });
    await shareFile(item);
    expect(mockShare).toHaveBeenCalledWith(item.file.uri, expect.objectContaining({ mimeType: 'application/json' }));
    expect(mockDeleted).not.toContain(item.file.uri);
  });

  it('a pasta de temporários é limpa antes de cada exportação e sob demanda (ex.: apagar tudo)', async () => {
    const first = await prepareExport('completo', { db, profile, today: TODAY, includeNotes: false });
    await prepareExport('planilha', { db, profile, today: TODAY, includeNotes: false });
    expect(mockDeleted).toContain(first.file.uri);
    purgeExports();
    expect([...mockFiles.keys()].filter((k) => k.startsWith('cache/exportar/'))).toEqual([]);
  });

  it('salvar em pasta (Drive aparece no seletor do Android) copia e apaga o temporário', async () => {
    const item = await prepareExport('planilha', { db, profile, today: TODAY, includeNotes: false });
    expect(await saveToFolder(item)).toBe('saved');
    expect(mockFiles.has('drive/ciclo-livre-2026-10-22.csv')).toBe(true);
    expect(mockDeleted).toContain(item.file.uri);
  });

  it('cancelar o seletor também apaga o temporário', async () => {
    mockPickCancel = true;
    const item = await prepareExport('planilha', { db, profile, today: TODAY, includeNotes: false });
    expect(await saveToFolder(item)).toBe('cancelled');
    expect(mockDeleted).toContain(item.file.uri);
  });
});

describe('restauração em duas etapas: ler e conferir, depois substituir', () => {
  it('JSON aberto: lê sem senha e restaura', async () => {
    const data = JSON.stringify(await exportAll(db));
    const read = await readRestore(data);
    expect(read.kind).toBe('ready');
    const target = openMemoryDatabase();
    await runMigrations(target, MIGRATIONS);
    if (read.kind === 'ready') await applyRestore(target, read.data);
    expect((await exportAll(target)).selections).toHaveLength(1);
  });

  it('backup: pede senha; senha errada dá BACKUP_ERROR antes de qualquer confirmação', async () => {
    const plain = JSON.stringify(await exportAll(db));
    const file = await encryptBackup(plain, 'senha-forte!', { random: (n) => new Uint8Array(n).fill(1), kdf: FAST });
    expect(await readRestore(file)).toEqual({ kind: 'needs_password' });
    await expect(readRestore(file, 'errada-123')).rejects.toThrow(BACKUP_ERROR);
    mockNativeScrypt.mockClear();
    expect((await readRestore(file, 'senha-forte!')).kind).toBe('ready');
    expect(mockNativeScrypt).toHaveBeenCalledTimes(1);
  });

  it('arquivo qualquer ou exportação sem perfil: IMPORT_ERROR', async () => {
    await expect(readRestore('não é json')).rejects.toThrow(IMPORT_ERROR);
    const noProfile = { ...(await exportAll(db)), profile: null };
    await expect(readRestore(JSON.stringify(noProfile))).rejects.toThrow(IMPORT_ERROR);
  });

  it('nota com o texto "ciclo-livre-backup" não confunde a detecção (decide pelo formato)', async () => {
    const data = await exportAll(db);
    const tricky = { ...data, notes: [{ date: '2026-10-15', text: '"ciclo-livre-backup"' }] };
    expect((await readRestore(JSON.stringify(tricky))).kind).toBe('ready');
  });
});
