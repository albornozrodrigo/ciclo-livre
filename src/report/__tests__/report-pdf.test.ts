import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setNote, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import type { Profile } from '@/domain/profile';
import { createReportPdf } from '@/report/report-pdf';

let mockHtml = '';
let mockSize: { width?: number; height?: number } = {};
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async ({ html, width, height }: { html: string; width?: number; height?: number }) => {
    mockHtml = html;
    mockSize = { width, height };
    return { uri: 'file:///cache/Print/abc.pdf' };
  }),
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
};

describe('createReportPdf', () => {
  it('lê o banco, monta o relatório e gera o PDF no aparelho', async () => {
    const db = openMemoryDatabase();
    await runMigrations(db, MIGRATIONS);
    for (const d of ['2026-08-27', '2026-09-24', '2026-10-15']) await setSelection(db, d, 'period', ['medium']);
    await setNote(db, '2026-10-16', 'Nota íntima');

    const uri = await createReportPdf(db, profile, { includeNotes: false, today: '2026-10-22' });

    expect(uri).toBe('file:///cache/Print/abc.pdf');
    expect(mockHtml).toContain('Relatório do ciclo');
    expect(mockHtml).not.toContain('Nota íntima');
    // A4 em pontos (o padrão do gerador é Carta, 612×792, e o @page é ignorado).
    expect(mockSize).toEqual({ width: 595, height: 842 });
  });

  it('com "incluir notas", as notas do período entram', async () => {
    const db = openMemoryDatabase();
    await runMigrations(db, MIGRATIONS);
    for (const d of ['2026-08-27', '2026-09-24', '2026-10-15']) await setSelection(db, d, 'period', ['medium']);
    await setNote(db, '2026-10-16', 'Nota íntima');

    await createReportPdf(db, profile, { includeNotes: true, today: '2026-10-22' });
    expect(mockHtml).toContain('Nota íntima');
  });
});
