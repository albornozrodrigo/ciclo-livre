import type { Reminder, ReminderKind } from '@/domain/reminders/catalog';
import type { Variant } from '@/domain/reminders/schedule';

const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** Textos padrão das notificações (próprios do Ciclo Livre; nunca copiados de outro app). */
const DEFAULTS: Record<Variant, (r: Reminder) => { title: string; body: string }> = {
  period_soon: (r) => ({
    title: 'Menstruação chegando',
    body: `Pela previsão, sua menstruação deve vir em ${days(r.options.daysBefore)}.`,
  }),
  period_due: () => ({
    title: 'Menstruação prevista para hoje',
    body: 'Se ela vier, registre no Ciclo Livre para afinar as próximas previsões.',
  }),
  period_late: () => ({
    title: 'A menstruação ainda não veio',
    body: 'Ela estava prevista para ontem. Se já veio, registre; atrasos de poucos dias são comuns.',
  }),
  fertile_soon: () => ({
    title: 'Janela fértil começa amanhã',
    body: 'É uma estimativa e não serve como contracepção.',
  }),
  phase_menstruation: () => ({
    title: 'Nova fase: menstruação',
    body: 'Começa um novo ciclo, pela previsão.',
  }),
  phase_follicular: () => ({
    title: 'Nova fase: folicular',
    body: 'A menstruação deve ter terminado, pela previsão.',
  }),
  phase_fertile: () => ({
    title: 'Nova fase: janela fértil',
    body: 'É uma estimativa e não serve como contracepção.',
  }),
  phase_luteal: () => ({
    title: 'Nova fase: lútea',
    body: 'A janela fértil estimada terminou.',
  }),
  phase_hormonal: () => ({
    title: 'Fim do sangramento',
    body: 'Pela previsão, o sangramento terminou.',
  }),
  pill: () => ({ title: 'Hora da pílula', body: 'Tome a pílula de hoje.' }),
  patch_change: () => ({
    title: 'Dia de trocar o adesivo',
    body: 'Coloque um adesivo novo hoje.',
  }),
  patch_off: () => ({
    title: 'Semana sem adesivo',
    body: 'Hoje começa a pausa de 7 dias.',
  }),
  ring_insert: () => ({
    title: 'Dia de colocar o anel',
    body: 'A pausa de 7 dias terminou.',
  }),
  ring_remove: () => ({
    title: 'Dia de tirar o anel',
    body: 'Hoje começa a pausa de 7 dias.',
  }),
  injection_soon: () => ({
    title: 'Injeção em 7 dias',
    body: 'Vale marcar a aplicação.',
  }),
  injection_due: () => ({
    title: 'Dia da injeção',
    body: 'Hoje é o dia da próxima aplicação.',
  }),
  iud_threads: () => ({
    title: 'Hora de checar os fios do DIU',
    body: 'Se não sentir os fios ou eles mudarem, procure o serviço de saúde.',
  }),
  device_change_soon: () => ({
    title: 'Troca do contraceptivo em 30 dias',
    body: 'A validade termina daqui a um mês. Vale marcar a consulta.',
  }),
  device_change_due: () => ({
    title: 'Dia da troca do contraceptivo',
    body: 'Pela validade que você informou, a troca é hoje. Confirme com o serviço de saúde.',
  }),
  device_overdue: () => ({
    title: 'Troca do contraceptivo atrasada',
    body: 'Pela validade que você informou, a data da troca já passou. Confirme com o serviço de saúde.',
  }),
  daily_log: () => ({
    title: 'Como foi seu dia?',
    body: 'Um toque para registrar como você está.',
  }),
  pregnancy_test: () => ({
    title: 'Dia do teste de gravidez',
    body: 'Se a menstruação não veio hoje, um teste já dá um resultado confiável.',
  }),
};

const DISCREET = {
  title: 'Ciclo Livre',
  body: 'Você tem um lembrete.',
} as const;

/** Título e texto da notificação: discreto > mensagem própria > padrão. */
/** Variantes em que uma mensagem própria faz sentido (as demais têm avisos opostos no mesmo lembrete). */
const CUSTOMIZABLE = new Set<Variant>(['period_soon', 'period_due', 'period_late', 'fertile_soon', 'pill', 'daily_log', 'pregnancy_test']);

export function reminderContent(reminder: Reminder, variant: Variant, discreet: boolean): { title: string; body: string } {
  if (discreet) return { ...DISCREET };
  const fallback = DEFAULTS[variant](reminder);
  if (!CUSTOMIZABLE.has(variant)) return fallback;
  return {
    title: reminder.title ?? fallback.title,
    body: reminder.body ?? fallback.body,
  };
}

export const REMINDER_NAMES: Record<ReminderKind, string> = {
  period_soon: 'Menstruação chegando',
  period_due: 'Dia previsto da menstruação',
  period_late: 'Menstruação atrasada',
  fertile_soon: 'Janela fértil chegando',
  phase_change: 'Mudança de fase',
  birth_control: 'Contraceptivo',
  daily_log: 'Lembrete de registro',
  pregnancy_test: 'Dia do teste de gravidez',
};
