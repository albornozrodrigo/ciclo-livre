import type { CycleRow, CycleSummary, MeasureKey, MeasureSeries, SymptomRow } from '@/domain/analysis/analysis';
import type { Phase } from '@/domain/cycle/model';
import type { TodayView } from '@/domain/cycle/today';
import type { IsoDate } from '@/domain/dates';
import type { BirthControl, Mode } from '@/domain/profile';

import { sanitizeForPrompt } from './sanitize';

/** Teto do texto enviado: cabe com folga no pedido e mantém o custo baixo. */
export const CONTEXT_MAX_CHARS = 8000;
const NOTE_MAX = 300;

export type ContextOptions = { cycles: 6 | 12; includeNotes: boolean };

/** Rótulos em pt-BR vindos de i18n (o domínio não importa i18n). */
export type ContextLabels = {
  mode: (mode: Mode) => string;
  birthControl: (method: BirthControl) => string;
  phase: (phase: Phase) => string;
  category: (id: string) => string;
  option: (category: string, option: string) => string;
  method: (method: string) => string;
  unit: (measure: MeasureKey) => string;
};

/**
 * O que a tela já calculou. `birthYear` e `tags` entram só para que os testes provem que nunca saem:
 * o resumo não usa esses campos.
 */
export type ContextInput = {
  today: IsoDate;
  profile: { mode: Mode; birthControl: BirthControl | null; birthYear?: number };
  todayView: TodayView | null;
  summary: CycleSummary | null;
  history: CycleRow[];
  symptoms: SymptomRow[];
  measures: Record<MeasureKey, MeasureSeries>;
  notes: { date: IsoDate; text: string }[];
  tags?: string[];
};

export type DataContext = { text: string; cycles: number; includedNotes: number };

const decimal = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
/** Data como a pessoa lê (dd/mm/aaaa): ela precisa entender o texto para consentir. */
const br = (iso: IsoDate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Texto livre da pessoa vai como dado: sem marcação nem caracteres de controle, e curto. */
const cleanNote = (text: string) => sanitizeForPrompt(text, NOTE_MAX);

const CHANCE = { low: 'baixa', medium: 'média', high: 'alta' } as const;

function currentLines(view: TodayView | null, labels: ContextLabels): string[] {
  if (!view || view.kind === 'none') return ['Ciclo atual: sem dados suficientes para estimar.'];
  if (view.kind === 'no_bleeding') return ['Ciclo atual: modo sem menstruação (sem previsão de ciclo).'];
  if (view.kind === 'postpartum') {
    const time = view.weeks < 12 ? `${view.weeks} semanas e ${view.days} dias` : `${view.months} meses`;
    return [
      `Pós-parto: ${time} desde o parto (sem previsão de ciclo).${view.periodBack ? ' Já houve menstruação registrada depois do parto.' : ''}`,
    ];
  }
  if (view.kind === 'pregnancy') {
    return [`Gravidez: semana ${view.week}, dia ${view.day}; ${view.daysToDue} dias até a data prevista do parto.`];
  }
  const late = view.late ? ` Atraso de ${view.lateDays ?? 0} dias em relação à previsão.` : '';
  return [
    `Ciclo atual: dia ${view.cycleDay}, ${labels.phase(view.phase)}.${late}`,
    `Próxima menstruação prevista entre ${br(view.next.earliest)} e ${br(view.next.latest)} (mais provável ${br(view.next.start)}).`,
    view.fertile
      ? `Janela fértil estimada: ${br(view.fertile.start)} a ${br(view.fertile.end)}.`
      : 'Contracepção hormonal: o app não estima janela fértil nem ovulação.',
    ...(view.conceive ? [`Chance de engravidar hoje (estimativa por dia da ovulação): ${CHANCE[view.conceive.chance]}.`] : []),
  ];
}

function summaryLine(summary: CycleSummary | null): string {
  if (!summary) return 'Ainda não há ciclos completos registrados.';
  const period = summary.periodMean === null ? '' : `; menstruação média ${summary.periodMean} dias`;
  return `Resumo dos ciclos completos (${summary.count}): média ${summary.mean} dias, de ${summary.min} a ${summary.max} dias${period}.`;
}

function cycleLine(row: CycleRow, labels: ContextLabels): string {
  const length = row.length === null ? 'em andamento' : `${row.length} dias`;
  const period =
    row.periodLength === null ? 'dias de menstruação não registrados (data do cadastro)' : `menstruação ${row.periodLength} dias`;
  const ovulation =
    row.length === null || row.ovulation === null
      ? ''
      : `; ovulação estimada ${br(row.ovulation.date)} (${labels.method(row.ovulation.method)})`;
  const atypical = row.atypical ? ' (fora do padrão, fora da média)' : '';
  return `- início ${br(row.start)}: ${length}${atypical}; ${period}${ovulation}`;
}

function measureLines(measures: Record<MeasureKey, MeasureSeries>, labels: ContextLabels): string[] {
  const lines = (Object.keys(measures) as MeasureKey[]).flatMap((key) => {
    const s = measures[key].summary;
    if (!s) return [];
    const unit = labels.unit(key);
    const count = measures[key].points.length;
    // Um registro só: média e faixa não dizem nada além do próprio valor.
    if (count === 1) return [`- ${labels.category(key)}: ${decimal(s.last)} ${unit} (1 registro)`];
    return [
      `- ${labels.category(key)}: último ${decimal(s.last)} ${unit}; média ${decimal(s.mean)}; de ${decimal(s.min)} a ${decimal(s.max)} (${count} registros)`,
    ];
  });
  return lines.length ? ['Medições dos últimos 90 dias:', ...lines] : ['Sem medições nos últimos 90 dias.'];
}

function render(head: string[], cycles: string[], tail: string[], notes: string[] | null): string {
  const notesBlock =
    notes === null ? ['Notas: não incluídas.'] : notes.length ? ['Notas do período:', ...notes] : ['Notas: nenhuma no período.'];
  return [...head, ...(cycles.length ? ['Ciclos (mais recente primeiro):', ...cycles] : []), ...tail, ...notesBlock].join('\n');
}

/**
 * Resumo dos dados que vai para a IA. Determinístico: a tela mostra exatamente este texto antes do envio.
 * Nunca inclui ano de nascimento, tags nem texto de lembretes; notas só com `includeNotes`.
 */
export function buildDataContext(input: ContextInput, options: ContextOptions, labels: ContextLabels): DataContext {
  const head = [
    `Dados registrados no app Ciclo Livre (hoje: ${br(input.today)}).`,
    `Modo: ${labels.mode(input.profile.mode)}.${
      // "Prefiro não dizer" fica de fora: a pessoa escolheu não contar nem para o app.
      input.profile.birthControl && input.profile.birthControl !== 'prefer_not_to_say'
        ? ` Método contraceptivo: ${labels.birthControl(input.profile.birthControl)}.`
        : ''
    }`,
    ...currentLines(input.todayView, labels),
    summaryLine(input.summary),
  ];

  // O atual (em andamento) mais os N completos mais recentes.
  const rows = input.history.slice(0, options.cycles + 1);
  let cycles = rows.map((r) => cycleLine(r, labels));

  const symptomLines = input.symptoms.map(
    (s) =>
      `- ${labels.category(s.category)}: ${labels.option(s.category, s.option)} — ${s.cycles} de ${s.total} ciclos, mais na ${labels.phase(s.phase)}`,
  );
  const tail = [
    ...(symptomLines.length
      ? ['Sintomas frequentes (em quantos ciclos, fase mais comum):', ...symptomLines]
      : ['Sem sintomas frequentes registrados.']),
    ...measureLines(input.measures, labels),
  ];

  // Notas só do período coberto pelos ciclos enviados, da mais recente para a mais antiga.
  const oldest = rows.length ? rows[rows.length - 1].start : input.today;
  let notes: string[] | null = options.includeNotes
    ? input.notes
        .filter((n) => n.date >= oldest && n.date <= input.today)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((n) => `- ${br(n.date)}: ${cleanNote(n.text)}`)
        .filter((line) => !line.endsWith(': '))
    : null;

  // Teto: primeiro saem as notas antigas (opcionais), depois os ciclos antigos (o atual fica).
  let text = render(head, cycles, tail, notes);
  while (text.length > CONTEXT_MAX_CHARS && notes && notes.length > 0) {
    notes = notes.slice(0, -1);
    text = render(head, cycles, tail, notes);
  }
  while (text.length > CONTEXT_MAX_CHARS && cycles.length > 1) {
    cycles = cycles.slice(0, -1);
    text = render(head, cycles, tail, notes);
  }
  return { text: text.slice(0, CONTEXT_MAX_CHARS), cycles: cycles.length, includedNotes: notes?.length ?? 0 };
}
