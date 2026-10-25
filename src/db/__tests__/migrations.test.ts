import { MIGRATIONS, type Migration, runMigrations } from '@/db/migrations';

import { openMemoryDatabase } from './node-sqlite-adapter';

const userVersion = (db: ReturnType<typeof openMemoryDatabase>) =>
  (db.raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

const tables = (db: ReturnType<typeof openMemoryDatabase>) =>
  (db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]).map(
    (r) => r.name,
  );

const sample: Migration[] = [
  { version: 1, statements: ['CREATE TABLE a (id INTEGER PRIMARY KEY)'] },
  { version: 2, statements: ['CREATE TABLE b (id INTEGER PRIMARY KEY)'] },
];

describe('runMigrations', () => {
  it('aplica em ordem tudo acima de user_version e termina na maior versão', async () => {
    const db = openMemoryDatabase();

    await runMigrations(db, sample);

    expect(tables(db)).toEqual(['a', 'b']);
    expect(userVersion(db)).toBe(2);
  });

  it('não reaplica nada quando já está na versão mais nova', async () => {
    const db = openMemoryDatabase();
    await runMigrations(db, sample);

    await expect(runMigrations(db, sample)).resolves.toBeUndefined();
    expect(userVersion(db)).toBe(2);
  });

  it('aplica só as pendentes num banco parcialmente migrado', async () => {
    const db = openMemoryDatabase();
    await runMigrations(db, sample.slice(0, 1));

    await runMigrations(db, sample);

    expect(tables(db)).toEqual(['a', 'b']);
  });

  it('desfaz só a migration que falhou, mantém a versão anterior e propaga o erro', async () => {
    const db = openMemoryDatabase();
    const broken: Migration[] = [
      sample[0],
      { version: 2, statements: ['CREATE TABLE b (id INTEGER)', 'ISTO NAO E SQL'] },
    ];

    await expect(runMigrations(db, broken)).rejects.toThrow();

    expect(tables(db)).toEqual(['a']);
    expect(userVersion(db)).toBe(1);
  });

  it.each([
    ['duplicadas', [sample[0], { ...sample[1], version: 1 }]],
    ['fora de ordem', [sample[1], sample[0]]],
    ['não positivas', [{ version: 0, statements: ['SELECT 1'] }]],
  ])('recusa versões %s antes de aplicar qualquer coisa', async (_label, list) => {
    const db = openMemoryDatabase();

    await expect(runMigrations(db, list as Migration[])).rejects.toThrow(/migration/i);
    expect(tables(db)).toEqual([]);
    expect(userVersion(db)).toBe(0);
  });

  it('as migrations do app criam app_meta STRICT', async () => {
    const db = openMemoryDatabase();

    await runMigrations(db, MIGRATIONS);

    expect(tables(db)).toContain('app_meta');
    expect(() => db.raw.exec("INSERT INTO app_meta (key, value) VALUES ('k', NULL)")).toThrow();
  });
});

describe('runMigrations com banco de versão mais nova', () => {
  it('recusa user_version acima da última migration conhecida sem alterar nada', async () => {
    const db = openMemoryDatabase();
    db.raw.exec('PRAGMA user_version = 9');

    await expect(runMigrations(db, sample)).rejects.toThrow(/mais nova/);
    expect(tables(db)).toEqual([]);
    expect(userVersion(db)).toBe(9);
  });
});
