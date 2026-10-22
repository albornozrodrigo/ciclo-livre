import { Linking, Pressable, Text, View } from "react-native";

import { ptBR } from "@/i18n/pt-BR";
import { log } from "@/lib/logger";

const r = ptBR.reminders;

/** Notificações bloqueadas no Android: explica e leva aos ajustes do sistema. */
export function DeniedNotice() {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="gap-3 rounded-[20px] border-[3px] border-ink p-5 dark:border-ink-night"
    >
      <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">
        {r.denied}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Linking.openSettings().catch((error: unknown) =>
            log.error("open_settings_failed", error),
          )
        }
        className="min-h-12 justify-center self-start rounded-full bg-ink px-5 active:opacity-70 dark:bg-ink-night"
      >
        <Text className="text-sm font-bold tracking-[0.28px] text-water dark:text-water-night">
          {r.openSettings}
        </Text>
      </Pressable>
    </View>
  );
}
