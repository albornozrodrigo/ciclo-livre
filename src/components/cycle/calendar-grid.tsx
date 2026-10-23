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
/** Previsto = mesma cor + contorno tracejado em tinta (contraste ≥ 3:1; cor clara sozinha não passa). */
const PREDICTED: Partial<Record<Phase, string>> = {
  menstruation: 'bg-coral border-2 border-dashed border-ink dark:bg-coral-night dark:border-ink-night',
  fertile: 'bg-land border-2 border-dashed border-ink dark:bg-land-night dark:border-ink-night',
};

function cellLabel(cell: CalendarCell): string {
  const date = dateFromIso(cell.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const parts = [cell.today ? `${cal.todayLabel}, ${date}` : date];
  if (cell.phase) parts.push(cell.predicted ? `${cal.phase[cell.phase]} ${cal.predicted}` : cal.phase[cell.phase]);
  if (cell.ovulation) parts.push(cal.ovulation);
  if (cell.logged) parts.push(cal.logged);
  return parts.join(', ');
}

/** Sobre cor de território o número é sempre `ink`, também no escuro (DESIGN.md). */
function dayTextClass(cell: CalendarCell, onTerritory: boolean): string {
  const weight = cell.today ? 'font-bold underline' : '';
  if (onTerritory) return `text-base text-ink ${weight} [font-variant:tabular-nums]`;
  if (!cell.inMonth) return 'text-base text-ink-muted [font-variant:tabular-nums] dark:text-ink-muted-night';
  return `text-base text-ink ${weight} [font-variant:tabular-nums] dark:text-ink-night`;
}

function DayCell({ cell, onPress, disabled }: { cell: CalendarCell; onPress: (cell: CalendarCell) => void; disabled: boolean }) {
  const tint = cell.phase ? (cell.predicted ? PREDICTED[cell.phase] : FILL[cell.phase]) : undefined;
  // O anel da ovulação é uma camada própria: duas bordas na mesma View brigariam.
  const ring = cell.ovulation ? 'border-[2.5px] border-ink dark:border-ink-night' : 'border-[2.5px] border-transparent';
  const day = Number(cell.date.slice(8, 10));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cellLabel(cell)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(cell)}
      className="h-16 flex-1 items-center justify-center active:opacity-70">
      <View className={`h-12 w-12 items-center justify-center rounded-full ${ring}`}>
        <View className={`h-10 w-10 items-center justify-center rounded-full ${tint ?? ''}`}>
          <Text className={dayTextClass(cell, Boolean(tint))}>{day}</Text>
        </View>
      </View>
      {/* Linha de marcas: sol de hoje (com contorno de tinta: sol sobre água sozinho não dá contraste) e ponto de registro. */}
      <View className="mt-0.5 h-1.5 flex-row items-center gap-1">
        {cell.today ? <TodayMark /> : null}
        {cell.logged ? <View className="h-1.5 w-1.5 rounded-full bg-ink dark:bg-ink-night" /> : null}
      </View>
    </Pressable>
  );
}

/** Marca de hoje: cápsula de sol com filete de tinta. */
function TodayMark() {
  return <View testID="today-mark" className="h-1.5 w-4 rounded-full border border-ink bg-sun dark:border-ink-night dark:bg-sun-night" />;
}

/** `isDisabled`: dias que não abrem nada (ex.: futuro) são anunciados como desativados. */
export function CalendarGrid({
  weeks,
  onPressDay,
  isDisabled,
}: {
  weeks: CalendarCell[][];
  onPressDay: (cell: CalendarCell) => void;
  isDisabled: (cell: CalendarCell) => boolean;
}) {
  return (
    // Avança 12dp em cada margem da tela: em telas de 360dp, cada dia fica com ≥ 48dp de largura (alvo de toque).
    <View className="-mx-3">
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
            <DayCell key={cell.date} cell={cell} onPress={onPressDay} disabled={isDisabled(cell)} />
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
      {item('h-5 w-5 bg-coral border-2 border-dashed border-ink dark:bg-coral-night dark:border-ink-night', cal.legend.predicted)}
      {item('h-1.5 w-1.5 bg-ink dark:bg-ink-night', cal.legend.logged)}
      <View className="flex-row items-center gap-2">
        <View className="h-5 w-5 items-center justify-center">
          <TodayMark />
        </View>
        <Text className="text-sm font-bold text-ink underline dark:text-ink-night">{cal.legend.today}</Text>
      </View>
    </View>
  );
}
