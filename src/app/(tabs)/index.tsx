import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { CycleCard, CycleDetails, PHASE_TERRITORY } from '@/components/cycle/cycle-card';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { Screen } from '@/components/ui/screen';
import { getDay } from '@/db/log-repo';
import { todayIso } from '@/domain/dates';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';
import { summarizeDay } from '@/tracking/summary';
import { useTodayCycle } from '@/cycle/use-today-cycle';
import { logUnlessClosed } from '@/db/closed';

const copy = ptBR.today;

/** O resumo inclui "Nota do dia"; ela não é uma categoria. */
const categoryCount = (items: string[]) => items.filter((i) => i !== ptBR.tracking.note.label).length;

/** Resumo do que já foi registrado hoje; recarrega ao voltar para a aba. */
function useTodaySummary(): string[] | null {
  const db = useSQLiteContext();
  const [items, setItems] = useState<string[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDay(db, todayIso()).then(
        (day) => active && setItems(summarizeDay(day)),
        (error: unknown) => logUnlessClosed('today_summary_failed', error),
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
  const { state } = useProfile();
  const cycle = useTodayCycle(state.status === 'ready' ? state.profile : null);
  // O território de Hoje é a fase de hoje; sem fase (gravidez, sem dados) fica o sol.
  const territory = cycle?.kind === 'cycle' ? PHASE_TERRITORY[cycle.phase] : 'sun';
  // A fase que vem depois, com o nome escrito (cor de fase nunca sozinha).
  const next =
    cycle?.kind === 'cycle' && cycle.nextPhase
      ? {
          territory: PHASE_TERRITORY[cycle.nextPhase.phase],
          label: ptBR.cycle.nextPhase(ptBR.cycle.phases[cycle.nextPhase.phase].toLowerCase(), cycle.nextPhase.inDays),
        }
      : undefined;

  return (
    <Screen screen="hoje" territory={territory} shape={0} secondary={next}>
      <View className="gap-8">
        {cycle ? <CycleCard view={cycle} /> : null}
        {/* Registrar logo depois do essencial: o caminho mais comum fica sempre à vista. */}
        <CapsuleButton label={copy.logToday} onPress={() => router.push(`/registro/${todayIso()}`)} />
        {items === null ? null : items.length === 0 ? (
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{copy.empty}</Text>
        ) : (
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
              {categoryCount(items) > 0 ? copy.count(categoryCount(items)) : copy.noteOnly}
            </Text>
            <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{items.join(' · ')}</Text>
          </View>
        )}
        {cycle ? <CycleDetails view={cycle} /> : null}
      </View>
    </Screen>
  );
}
