import { Pressable, Text, View } from 'react-native';

import type { CalendarCell } from '@/domain/cycle/calendar';
import { dateFromIso } from '@/domain/dates';
import type { Phase } from '@/domain/cycle/model';
import { ptBR } from '@/i18n/pt-BR';

const cal = ptBR.calendar;

/** Só menstruação e janela fértil ganham cor; as outras fases ficam na água (sem ruído). */
const FILL: Partial<Record<Phase, string>> = {
  menstruation: 'bg-coral dark:bg-coral-night',
  fertile: 'bg-land dark:bg-land-night',
};
const OUTLINE: Partial<Record<Phase, string>> = {
  menstruation: 'border-2 border-dashed border-coral dark:border-coral-night',
  fertile: 'border-2 border-dashed border-land dark:border-land-night',
};

function cellLabel(cell: CalendarCell): string {
  const date = dateFromIso(cell.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const parts = [cell.today ? `${cal.todayLabel}, ${date}` : date];
  if (cell.phase) parts.push(cell.predicted ? `${cal.phase[cell.phase]} ${cal.predicted}` : cal.phase[cell.phase]);
  if (cell.ovulation) parts.push(cal.ovulation);
  if (cell.logged) parts.push(cal.logged);
  return parts.join(', ');
}

function DayCell({ cell, onPress }: { cell: CalendarCell; onPress: (cell: CalendarCell) => void }) {
  const tint = cell.phase ? (cell.predicted ? OUTLINE[cell.phase] : FILL[cell.phase]) : undefined;
  // O anel da ovulação é uma camada própria: duas bordas na mesma View brigariam.
  const ring = cell.ovulation ? 'border-[2.5px] border-ink dark:border-ink-night' : 'border-[2.5px] border-transparent';
  const day = Number(cell.date.slice(8, 10));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cellLabel(cell)}
      onPress={() => onPress(cell)}
      style={{ opacity: cell.inMonth ? 1 : 0.35 }}
      className="h-16 flex-1 items-center justify-center active:opacity-70">
      <View className={`h-12 w-12 items-center justify-center rounded-full ${ring}`}>
        <View className={`h-10 w-10 items-center justify-center rounded-full ${tint ?? ''}`}>
        <Text
          className={
            cell.today
              ? 'text-base font-bold text-ink underline [font-variant:tabular-nums] dark:text-ink-night'
              : 'text-base text-ink [font-variant:tabular-nums] dark:text-ink-night'
          }>
          {day}
        </Text>
        </View>
      </View>
      <View className={cell.logged ? 'mt-0.5 h-1.5 w-1.5 rounded-full bg-ink dark:bg-ink-night' : 'mt-0.5 h-1.5 w-1.5'} />
    </Pressable>
  );
}

export function CalendarGrid({ weeks, onPressDay }: { weeks: CalendarCell[][]; onPressDay: (cell: CalendarCell) => void }) {
  return (
    <View>
      <View className="flex-row" importantForAccessibility="no-hide-descendants">
        {cal.weekdays.map((d, i) => (
          <Text key={i} className="flex-1 text-center text-sm font-bold text-ink-muted dark:text-ink-muted-night">
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].date} className="flex-row">
          {week.map((cell) => (
            <DayCell key={cell.date} cell={cell} onPress={onPressDay} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function CalendarLegend() {
  const item = (swatch: string, label: string) => (
    <View className="flex-row items-center gap-2">
      <View className="h-5 w-5 items-center justify-center">
        <View className={`rounded-full ${swatch}`} />
      </View>
      <Text className="text-sm text-ink dark:text-ink-night">{label}</Text>
    </View>
  );
  return (
    <View className="flex-row flex-wrap gap-x-5 gap-y-3">
      {item('h-5 w-5 bg-coral dark:bg-coral-night', cal.legend.menstruation)}
      {item('h-5 w-5 bg-land dark:bg-land-night', cal.legend.fertile)}
      {item('h-5 w-5 border-[2.5px] border-ink dark:border-ink-night', cal.legend.ovulation)}
      {item('h-5 w-5 border-2 border-dashed border-ink dark:border-ink-night', cal.legend.predicted)}
      {item('h-1.5 w-1.5 bg-ink dark:bg-ink-night', cal.legend.logged)}
      <Text className="text-sm font-bold text-ink underline dark:text-ink-night">{cal.legend.today}</Text>
    </View>
  );
}
