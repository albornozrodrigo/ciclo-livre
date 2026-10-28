import Constants from 'expo-constants';
import { setStringAsync } from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { ChoiceList } from '@/components/ui/choice-list';
import { useSnackbar } from '@/components/ui/snackbar';
import { buildReport, REPORT_REASONS, type ReportKind, type ReportReason, reasonLabel, reportMailto } from '@/domain/ai/report';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const r = ptBR.aiReport;
const reasons = REPORT_REASONS.map((value) => ({ value, label: reasonLabel(value) }));

type Step = 'closed' | 'open' | 'sent';

/**
 * Denunciar uma resposta da IA (política da Play para IA generativa): a escolha do motivo é feita no app;
 * o envio vai pelo e-mail da pessoa, que vê e edita o texto antes. Sem e-mail no aparelho, copia a denúncia.
 */
export function ReportResponse({ kind, text }: { kind: ReportKind; text: string }) {
  const { show } = useSnackbar();
  const [step, setStep] = useState<Step>('closed');
  const [reason, setReason] = useState<ReportReason | null>(null);

  async function send() {
    if (!reason) return;
    const report = buildReport({ kind, reason, response: text, appVersion: Constants.expoConfig?.version ?? '?' });
    try {
      await Linking.openURL(reportMailto(report));
      setStep('sent');
    } catch (error) {
      // Sem app de e-mail: a denúncia vai para a área de transferência, com o endereço.
      log.error('ai_report_mail_failed', error);
      try {
        await setStringAsync(`${report.to}\n${report.subject}\n\n${report.body}`);
        show(r.copied(report.to));
        setStep('sent');
      } catch (copyError) {
        log.error('ai_report_copy_failed', copyError);
        show(r.failed(report.to));
      }
    }
  }

  if (step === 'sent') {
    return (
      <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
        {r.thanks}
      </Text>
    );
  }
  if (step === 'closed') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={r.open}
        onPress={() => setStep('open')}
        hitSlop={8}
        className="min-h-12 justify-center self-start active:opacity-70">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink-muted underline dark:text-ink-muted-night">{r.open}</Text>
      </Pressable>
    );
  }
  return (
    <View className="gap-3 rounded-[28px] border-[1.5px] border-ink p-4 dark:border-ink-night">
      <Text accessibilityRole="header" className="text-base font-bold leading-6 text-ink dark:text-ink-night">
        {r.title}
      </Text>
      <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{r.hint}</Text>
      <ChoiceList label={r.title} options={reasons} value={reason} onChange={setReason} />
      <CapsuleButton label={r.send} onPress={send} disabled={!reason} />
      <CapsuleButton label={r.cancel} variant="outline" onPress={() => setStep('closed')} />
    </View>
  );
}
