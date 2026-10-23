import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Bullets } from '@/components/ui/bullets';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { useSnackbar } from '@/components/ui/snackbar';
import { setAiConsent } from '@/db/ai-settings-repo';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const t = ptBR.ai;

/** Consentimento explícito antes do primeiro resumo: o que vai, o que nunca vai, para onde e quem paga. */
export default function ConsentimentoScreen() {
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const back = () => router.canGoBack() && router.back();

  async function accept() {
    try {
      await setAiConsent(db, true);
      back();
    } catch (e) {
      log.error('ai_consent_failed', e);
      show(t.saveFailed);
    }
  }

  return (
    <FormScreen
      title={t.consentTitle}
      footer={
        <>
          <CapsuleButton label={t.accept} onPress={accept} />
          <CapsuleButton label={t.decline} variant="outline" onPress={back} />
        </>
      }>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {t.consentSentTitle}
        </Text>
        <Bullets items={t.consentSent} />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {t.consentNeverTitle}
        </Text>
        <Bullets items={t.consentNever} />
      </View>
      <Text className="text-base leading-6 text-ink dark:text-ink-night">{t.consentWhere}</Text>
      <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{t.consentCost}</Text>
    </FormScreen>
  );
}
