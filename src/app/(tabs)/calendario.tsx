import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { CalendarGrid, CalendarLegend } from '@/components/cycle/calendar-grid';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { Screen } from '@/components/ui/screen';
import { useCalendar } from '@/cycle/use-calendar';
import { todayIso } from '@/domain/dates';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';

const cal = ptBR.calendar;

function shiftMonth({ year, month }: { year: number; month: number }, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export default function CalendarioScreen() {
  const { state } = useProfile();
  const profile = state.status === 'ready' ? state.profile : null;
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const [shown, setShown] = useState(current);
  const weeks = useCalendar(profile, shown.year, shown.month);
  const monthName = new Date(shown.year, shown.month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  // Só a primeira letra maiúscula ("Outubro de 2026", não "Outubro De 2026").
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const isCurrent = shown.year === current.year && shown.month === current.month;

  return (
    <Screen screen="calendario" territory="pond" shape={1}>
      <View className="gap-5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <CapsuleButton variant="outline" label={cal.previousMonth} onPress={() => setShown(shiftMonth(shown, -1))} />
          </View>
          <View className="flex-1">
            <CapsuleButton variant="outline" label={cal.nextMonth} onPress={() => setShown(shiftMonth(shown, 1))} />
          </View>
        </View>
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {title}
        </Text>
        {weeks ? (
          <CalendarGrid
            weeks={weeks}
            // Registro só até hoje: não se registra o futuro.
            onPressDay={(cell) => cell.date <= todayIso() && router.push(`/registro/${cell.date}`)}
          />
        ) : null}
        {!isCurrent ? <CapsuleButton variant="outline" label={cal.goToday} onPress={() => setShown(current)} /> : null}
        <CalendarLegend />
      </View>
    </Screen>
  );
}
