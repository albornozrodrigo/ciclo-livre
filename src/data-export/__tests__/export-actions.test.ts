import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { exportAll } from '@/db/export-repo';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import { prepareExport, restoreFromText, saveToFolder, shareFile } from '@/data-export/export-actions';
import type { Profile } from '@/domain/profile';
import { BACKUP_ERROR, encryptBackup } from '@/domain/export/backup';

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
  return {
    File: MockFile,
    Paths: { cache: { uri: 'cache' } },
    Directory: {
      pickDirectoryAsync: async () => {
        if (mockPickCancel) throw new Error('canceled');
        return { createFile: (name: string) => new MockFile('drive', name) };
      },
    },
  };
});
const mockShare = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('expo-sharing', () => ({ shareAsync: (...args: unknown[]) => mockShare(...args) }));
jest.mock('expo-crypto', () => ({ getRandomBytes: (n: number) => new Uint8Array(n).fill(3) }));
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
    expect(item.file.uri).toBe(`cache/${name}`);
  });

  it('backup: só com senha, e o conteúdo sai criptografado', async () => {
    await expect(prepareExport('backup', { db, profile, today: TODAY, includeNotes: false })).rejects.toThrow('Senha curta');
    const item = await prepareExport('backup', { db, profile, today: TODAY, includeNotes: false, password: 'senha-forte', kdf: FAST });
    expect(item.name).toBe('ciclo-livre-backup-2026-10-22.ciclolivre');
    expect(String(mockFiles.get(item.file.uri))).not.toContain('heavy');
  });
});

it('relatório: o PDF com nome aleatório é apagado depois de copiado com o nome certo', async () => {
  await prepareExport('relatorio', { db, profile, today: TODAY, includeNotes: false });
  expect(mockDeleted).toContain('cache/Print/x.pdf');
});

describe('destinos', () => {
  it('compartilhar abre o menu do Android e apaga o temporário depois, mesmo se falhar', async () => {
    const item = await prepareExport('completo', { db, profile, today: TODAY, includeNotes: false });
    await shareFile(item);
    expect(mockShare).toHaveBeenCalledWith(item.file.uri, expect.objectContaining({ mimeType: 'application/json' }));
    expect(mockDeleted).toContain(item.file.uri);

    mockShare.mockRejectedValueOnce(new Error('x'));
    const again = await prepareExport('completo', { db, profile, today: TODAY, includeNotes: false });
    await expect(shareFile(again)).rejects.toThrow();
    expect(mockDeleted).toContain(again.file.uri);
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

describe('restoreFromText', () => {
  it('JSON aberto restaura direto', async () => {
    const data = JSON.stringify(await exportAll(db));
    const target = openMemoryDatabase();
    await runMigrations(target, MIGRATIONS);
    expect(await restoreFromText(target, data)).toBe('restored');
    expect((await exportAll(target)).selections).toHaveLength(1);
  });

  it('backup criptografado pede a senha; senha errada dá erro genérico; certa restaura', async () => {
    const plain = JSON.stringify(await exportAll(db));
    const file = await encryptBackup(plain, 'senha-forte', { random: (n) => new Uint8Array(n).fill(1), kdf: FAST });
    const target = openMemoryDatabase();
    await runMigrations(target, MIGRATIONS);
    expect(await restoreFromText(target, file)).toBe('needs_password');
    await expect(restoreFromText(target, file, 'errada-123')).rejects.toThrow(BACKUP_ERROR);
    expect(await restoreFromText(target, file, 'senha-forte')).toBe('restored');
  });

  it('arquivo qualquer: erro de arquivo inválido', async () => {
    await expect(restoreFromText(db, 'não é json')).rejects.toThrow(/inválido/);
  });
});
