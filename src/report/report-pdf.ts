import { printToFileAsync } from 'expo-print';

import { getAnalysisData } from '@/db/cycle-repo';
import type { SqlExecutor } from '@/db/types';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { type IsoDate, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { buildReport } from '@/domain/report/report';

import { renderReportHtml } from './report-html';
import { signalsFromAnalysis } from '@/domain/cycle/signals';

/**
 * Gera o PDF do relatório no aparelho (nada sai daqui). Devolve o arquivo temporário no cache;
 * quem chama apaga depois de compartilhar ou salvar.
 */
export async function createReportPdf(
  db: SqlExecutor,
  profile: Profile,
  { includeNotes, today = todayIso() }: { includeNotes: boolean; today?: IsoDate },
): Promise<string> {
  const [data, notes] = await Promise.all([
    getAnalysisData(db),
    db.getAllAsync<{ date: IsoDate; text: string }>('SELECT date, text FROM log_note ORDER BY date'),
  ]);
  const report = buildReport({
    model: cycleModelFor(profile, signalsFromAnalysis(data), today),
    profile,
    selections: data.selections,
    measures: data.measures,
    notes,
    today,
    includeNotes,
  });
  // A4 em pontos: o padrão do gerador é Carta (612×792) e ignora o @page do HTML.
  const { uri } = await printToFileAsync({ html: renderReportHtml(report), width: 595, height: 842 });
  return uri;
}
