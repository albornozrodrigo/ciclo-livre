import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ptBR } from '@/i18n/pt-BR';

type Props = {
  /** Recebido do ErrorBoundary; nunca mostrado (pode conter caminhos e detalhes internos). */
  error: Error;
  retry: () => void;
};

/** Tela de erro geral: mensagem acolhedora, sem detalhes técnicos, com ação para tentar de novo. */
export function AppError({ retry }: Props) {
  const insets = useSafeAreaInsets();
  const copy = ptBR.appError;

  return (
    <View
      style={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }}
      className="flex-1 justify-between bg-water px-5 dark:bg-water-night">
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {copy.title}
        </Text>
        <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.body}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={retry}
        className="min-h-12 items-center justify-center rounded-full bg-sun px-5 active:opacity-80 dark:bg-sun-night">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink">{copy.retry}</Text>
      </Pressable>
    </View>
  );
}
