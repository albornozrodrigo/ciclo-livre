import { setStringAsync } from 'expo-clipboard';
import { Platform, Text, View } from 'react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { useSnackbar } from '@/components/ui/snackbar';
import { PIX_KEY } from '@/constants/support';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const c = ptBR.coffee;

/** Último item de Mais: apoio opcional por Pix, lembrando que o app é grátis, sem anúncios e que os dados são da pessoa. */
export function CoffeeSection() {
  const { show } = useSnackbar();

  async function copy() {
    try {
      await setStringAsync(PIX_KEY);
      // O Android 13+ já confirma a cópia com aviso próprio; repetir só empilharia mensagens.
      if (!(Platform.OS === 'android' && Number(Platform.Version) >= 33)) show(c.copied);
    } catch (error) {
      log.error('pix_copy_failed', error);
      show(c.copyFailed);
    }
  }

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {c.title}
      </Text>
      <Text className="text-base leading-6 text-ink dark:text-ink-night">{c.body}</Text>
      <View accessible accessibilityLabel={`${c.keyLabel}: ${PIX_KEY}`} className="gap-1">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">{c.keyLabel}</Text>
        <Text selectable style={{ fontVariant: ['tabular-nums'] }} className="text-base text-ink dark:text-ink-night">
          {PIX_KEY}
        </Text>
      </View>
      <CapsuleButton label={c.copy} variant="outline" onPress={copy} />
    </View>
  );
}
