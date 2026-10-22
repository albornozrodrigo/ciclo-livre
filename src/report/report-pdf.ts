import { printToFileAsync } from 'expo-print';

import { getAnalysisData, getCycleSignals } from '@/db/cycle-repo';
import type { SqlExecutor } from '@/db/types';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { type IsoDate, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { buildReport } from '@/domain/report/report';

import { renderReportHtml } from './report-html';

/**
 * Gera o PDF do relatório no aparelho (nada sai daqui). Devolve o arquivo temporário no cache;
 * quem chama apaga depois de compartilhar ou salvar.
 */
export async function createReportPdf(
  db: SqlExecutor,
  profile: Profile,
  { includeNotes, today = todayIso() }: { includeNotes: boolean; today?: IsoDate },
): Promise<string> {
  const [signals, data, notes] = await Promise.all([
    getCycleSignals(db),
    getAnalysisData(db),
    db.getAllAsync<{ date: IsoDate; text: string }>('SELECT date, text FROM log_note ORDER BY date'),
  ]);
  const report = buildReport({
    model: cycleModelFor(profile, signals, today),
    profile,
    selections: data.selections,
    measures: data.measures,
    notes,
    today,
    includeNotes,
  });
  const { uri } = await printToFileAsync({ html: renderReportHtml(report) });
  return uri;
}
