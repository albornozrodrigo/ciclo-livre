import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CapsuleButton } from "@/components/ui/capsule-button";

type Props = {
  title: string;
  hint?: string;
  children: ReactNode;
  /** Sem ação: tela de lista que salva a cada toque (ex.: Lembretes). */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

/** Tela de formulário (sem lobo, ver DESIGN.md): headline, campos roláveis, ação no polegar. */
export function FormScreen({
  title,
  hint,
  children,
  actionLabel,
  onAction,
  actionDisabled,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-water dark:bg-water-night"
    >
      <StatusBar style="auto" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 24 }}
        className="flex-1 px-5"
      >
        <Text
          accessibilityRole="header"
          className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night"
        >
          {title}
        </Text>
        {hint ? (
          <Text className="mt-3 text-base leading-6 text-ink-muted dark:text-ink-muted-night">
            {hint}
          </Text>
        ) : null}
        <View className="mt-8 gap-8">{children}</View>
      </ScrollView>
      {actionLabel && onAction ? (
        <View
          style={{ paddingBottom: insets.bottom + 16 }}
          className="px-5 pt-3"
        >
          <CapsuleButton
            label={actionLabel}
            onPress={onAction}
            disabled={actionDisabled}
          />
        </View>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}
    </KeyboardAvoidingView>
  );
}
