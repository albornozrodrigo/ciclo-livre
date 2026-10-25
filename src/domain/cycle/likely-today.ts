import { daysBetween, type IsoDate } from '@/domain/dates';
import { isSymptom } from '@/domain/tracking/symptoms';

import { type CycleModel, dayInfo } from './model';
import { RECENT_CYCLES, recentAtypical } from './stats';

export type LikelySymptom = { category: string; option: string; cycles: number; total: number };
type Selection = { date: IsoDate; category: string; option: string };

const MIN_CYCLES = 2;
const TOLERANCE = 1;
const MAX_ITEMS = 3;

/**
 * Sintomas que podem aparecer hoje: registrados perto deste ponto do ciclo (±1 dia, contando do início do
 * ciclo na primeira metade, ou da menstruação seguinte na segunda) em mais da metade dos ciclos completos recentes
 * com algum sintoma, e em pelo menos 2. No máximo 3, do mais frequente para o menos.
 */
export function predictLikelyToday(model: CycleModel, selections: readonly Selection[], today: IsoDate): LikelySymptom[] {
  // Com atraso a data da próxima é "hoje": a régua de antes dela não vale, e o atraso já tem a sua mensagem.
  if (model.late) return [];
  const info = dayInfo(model, today, today);
  if (!info) return [];
  const fromStart = info.cycleDay;
  const beforeNext = daysBetween(today, model.next.start);
  // Uma régua por vez: no começo do ciclo conta a partir do início; no fim, a partir da menstruação seguinte.
  const useStart = fromStart <= model.cycleLength / 2;

  const symptoms = selections.filter((s) => isSymptom(s.category, s.option));
  const complete = model.spans.slice(0, -1);
  const atypical = recentAtypical(complete.map((span) => daysBetween(span.start, span.nextStart)));
  const cycles = complete
    // Ciclos fora do padrão ficam de fora, como na previsão (a menos que a pessoa os inclua).
    .filter((_, i) => model.includeAtypical || !atypical[i])
    .slice(-RECENT_CYCLES)
    // Ciclos sem nenhum sintoma registrado não contam: a pessoa ainda não registrava (ou não abriu o app).
    .filter((span) => symptoms.some((s) => s.date >= span.start && s.date < span.nextStart));
  if (cycles.length < MIN_CYCLES) return [];

  const counts = new Map<string, LikelySymptom>();
  for (const span of cycles) {
    const near = new Set(
      symptoms
        .filter((s) => s.date >= span.start && s.date < span.nextStart)
        .filter((s) => {
          const day = daysBetween(span.start, s.date) + 1;
          const before = daysBetween(s.date, span.nextStart);
          return useStart ? Math.abs(day - fromStart) <= TOLERANCE : Math.abs(before - beforeNext) <= TOLERANCE;
        })
        .map((s) => `${s.category}:${s.option}`),
    );
    for (const key of near) {
      const [category, option] = key.split(':');
      const entry = counts.get(key) ?? { category, option, cycles: 0, total: cycles.length };
      entry.cycles += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .filter((e) => e.cycles >= MIN_CYCLES && e.cycles > cycles.length / 2)
    .sort((a, b) => b.cycles - a.cycles)
    .slice(0, MAX_ITEMS);
}
