import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { Screen } from '@/components/ui/screen';
import { getDay } from '@/db/log-repo';
import { todayIso } from '@/domain/dates';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { summarizeDay } from '@/tracking/summary';

const copy = ptBR.today;

/** Resumo do que já foi registrado hoje; recarrega ao voltar para a aba. */
function useTodaySummary(): string[] | null {
  const db = useSQLiteContext();
  const [items, setItems] = useState<string[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDay(db, todayIso()).then(
        (day) => active && setItems(summarizeDay(day)),
        (error: unknown) => log.error('today_summary_failed', error),
      );
      return () => {
        active = false;
      };
    }, [db]),
  );
  return items;
}

export default function HojeScreen() {
  const items = useTodaySummary();

  return (
    <Screen screen="hoje" territory="sun" shape={0}>
      <View className="gap-5">
        {items === null ? null : items.length === 0 ? (
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{copy.empty}</Text>
        ) : (
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
              {copy.count(items.length)}
            </Text>
            <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{items.join(' · ')}</Text>
          </View>
        )}
        <CapsuleButton label={copy.logToday} onPress={() => router.push(`/registro/${todayIso()}`)} />
      </View>
    </Screen>
  );
}
