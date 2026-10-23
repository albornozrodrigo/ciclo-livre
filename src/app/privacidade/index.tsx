import { Text, View } from 'react-native';

import { ReadingBlocks } from '@/components/content/reading-blocks';
import { FormScreen } from '@/components/form-screen';
import { PRIVACY_POLICY } from '@/content/privacy-policy';
import { ptBR } from '@/i18n/pt-BR';

/** Política de privacidade (leitura). Abre com ou sem perfil: também é o destino do link do Health Connect. */
export default function PrivacidadeScreen() {
  return (
    <FormScreen title={PRIVACY_POLICY.title} hint={ptBR.policy.effective(PRIVACY_POLICY.effective)}>
      <ReadingBlocks blocks={PRIVACY_POLICY.blocks} />
      {/* Mesmo quadro de aviso dos artigos. */}
      <View className="rounded-[28px] border-[1.5px] border-ink p-5 dark:border-ink-night">
        <Text className="text-sm leading-5 text-ink dark:text-ink-night">{ptBR.policy.disclaimer}</Text>
      </View>
    </FormScreen>
  );
}
