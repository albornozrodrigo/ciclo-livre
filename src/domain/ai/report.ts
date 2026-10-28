import { REPORT_EMAIL } from '@/constants/support';

export const REPORT_REASONS = ['offensive', 'sexual', 'harmful', 'wrong', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportKind = 'chat' | 'summary';

/** Teto da resposta no e-mail: links mailto muito longos são cortados por alguns apps de e-mail. */
export const REPORT_TEXT_MAX = 1500;

const REASON_LABEL: Record<ReportReason, string> = {
  offensive: 'Ofensiva ou de ódio',
  sexual: 'Sexual ou imprópria',
  harmful: 'Perigosa para a saúde',
  wrong: 'Informação errada',
  other: 'Outro motivo',
};
const KIND_LABEL: Record<ReportKind, string> = { chat: 'chat com seus dados', summary: 'resumo dos artigos' };

export const reasonLabel = (reason: ReportReason) => REASON_LABEL[reason];

type ReportInput = { kind: ReportKind; reason: ReportReason; response: string; appVersion: string };

/**
 * Texto da denúncia. Leva só a resposta da IA, sem a pergunta (que pode ter dado de saúde).
 * A pessoa vê e edita tudo no app de e-mail antes de enviar.
 */
export function buildReport({ kind, reason, response, appVersion }: ReportInput) {
  const text = response.length > REPORT_TEXT_MAX ? `${response.slice(0, REPORT_TEXT_MAX)}…` : response;
  const body = [
    'Quero denunciar uma resposta da IA no Ciclo Livre.',
    '',
    `Motivo: ${REASON_LABEL[reason]}`,
    `Onde: ${KIND_LABEL[kind]}`,
    `Versão do app: ${appVersion}`,
    '',
    'Resposta denunciada:',
    text,
    '',
    'Detalhes (opcional):',
    '',
    '— Antes de enviar, apague o que não quiser enviar.',
  ].join('\n');
  return { to: REPORT_EMAIL, subject: 'Denúncia de resposta da IA (Ciclo Livre)', body };
}

export function reportMailto(report: ReturnType<typeof buildReport>): string {
  return `mailto:${report.to}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(report.body)}`;
}
