import { router } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarGrid, CalendarLegend, DAY_ROW_HEIGHT, WEEKDAY_LINE } from '@/components/cycle/calendar-grid';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { useReduceMotion } from '@/components/ui/lobe';
import { ScreenHeader, useLobeStatusBar } from '@/components/ui/screen';
import { type CalendarData, useCalendarData } from '@/cycle/use-calendar';
import { monthGrid } from '@/domain/cycle/calendar';
import { fromMonthIndex, initialMonthRange, MONTHS_AROUND, weeksInMonth } from '@/domain/cycle/month-list';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';

const cal = ptBR.calendar;

/** Alturas fixas de cada mês: a posição de qualquer mês sai de conta, sem medir (e abre direto no atual). */
const TITLE_LINE = 26;
const TITLE_GAP = 12;
const MONTH_GAP = 32;
const monthHeight = (weeks: number, fontScale: number) =>
  (TITLE_LINE + WEEKDAY_LINE) * fontScale + TITLE_GAP + weeks * DAY_ROW_HEIGHT + MONTH_GAP;

function monthTitle(year: number, month: number) {
  const name = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  // Só a primeira letra maiúscula ("Outubro de 2026", não "Outubro De 2026").
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const Month = memo(function Month({ index, data }: { index: number; data: CalendarData }) {
  const { year, month } = fromMonthIndex(index);
  const { fontScale } = useWindowDimensions();
  const weeks = useMemo(() => monthGrid(year, month, data.model, data.logged, data.today), [year, month, data]);
  return (
    <View className="px-5" style={{ height: monthHeight(weeks.length, fontScale) }}>
      <View style={{ height: TITLE_LINE * fontScale, marginBottom: TITLE_GAP }}>
        <Text accessibilityRole="header" numberOfLines={1} className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {monthTitle(year, month)}
        </Text>
      </View>
      <CalendarGrid
        weeks={weeks}
        // Registro só até hoje: não se registra o futuro.
        onPressDay={(cell) => router.push(`/registro/${cell.date}`)}
        isDisabled={(cell) => cell.date > data.today}
      />
    </View>
  );
});

/** Meses em lista vertical: passado acima, futuro abaixo (cresce sem limite ao rolar). Abre no mês atual. */
function MonthList({ data }: { data: CalendarData }) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { onScroll, statusBar, scrim } = useLobeStatusBar();
  const list = useRef<FlatList<number>>(null);

  const range = initialMonthRange(data.today, data.firstLogged);
  const [extra, setExtra] = useState(0);
  const months = useMemo(() => {
    const out: number[] = [];
    for (let i = range.start; i <= range.end + extra; i++) out.push(i);
    return out;
  }, [range.start, range.end, extra]);
  const currentPos = range.current - range.start;

  const offsets = useMemo(() => {
    const out = [0];
    for (const index of months) {
      const { year, month } = fromMonthIndex(index);
      out.push(out[out.length - 1] + monthHeight(weeksInMonth(year, month), fontScale));
    }
    return out;
  }, [months, fontScale]);

  // O topo (lobo, título, legenda) fica acima do mês mais antigo; a altura dele só se sabe depois de medir.
  const [headerHeight, setHeaderHeight] = useState(0);
  const dragged = useRef(false);
  const scrollToToday = (animated: boolean, header = headerHeight) =>
    // O título do mês fica logo abaixo da barra de status, não sob ela.
    list.current?.scrollToOffset({ offset: Math.max(0, header + offsets[currentPos] - insets.top - 16), animated });

  // Meses à vista; antes do primeiro aviso da lista, vale a abertura no mês atual.
  const [visible, setVisible] = useState<number[] | null>(null);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: number }[] }) => {
    setVisible(viewableItems.map((v) => v.item));
  }, []);
  const todayVisible = visible === null || visible.includes(range.current);

  return (
    <View className="flex-1 bg-water dark:bg-water-night">
      {statusBar}
      <FlatList
        ref={list}
        testID="calendar-list"
        data={months}
        keyExtractor={String}
        renderItem={({ item }) => <Month index={item} data={data} />}
        getItemLayout={(_, i) => ({ length: offsets[i + 1] - offsets[i], offset: headerHeight + offsets[i], index: i })}
        initialScrollIndex={currentPos}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={9}
        onEndReached={() => setExtra((n) => n + MONTHS_AROUND)}
        onEndReachedThreshold={2}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        onScroll={onScroll}
        onScrollBeginDrag={() => (dragged.current = true)}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        ListHeaderComponent={
          <View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h === headerHeight) return;
              setHeaderHeight(h);
              // Ainda sem toque da pessoa: corrige a abertura para cair exatamente no mês atual.
              if (!dragged.current) requestAnimationFrame(() => scrollToToday(false, h));
            }}>
            <ScreenHeader screen="calendario" territory="pond" shape={1} />
            <View className="px-5 pb-10 pt-8">
              <CalendarLegend />
            </View>
          </View>
        }
      />
      {!todayVisible ? (
        <View className="absolute bottom-4 self-center rounded-full bg-water dark:bg-water-night">
          <CapsuleButton
            variant="outline"
            label={cal.goToday}
            onPress={() => {
              // Salto longo vai seco: animado, a lista teria de desenhar cada mês do caminho.
              const near = (visible ?? []).some((m) => Math.abs(m - range.current) <= 3);
              scrollToToday(near && !reduceMotion);
            }}
          />
        </View>
      ) : null}
      {scrim}
    </View>
  );
}

export default function CalendarioScreen() {
  const { state } = useProfile();
  const data = useCalendarData(state.status === 'ready' ? state.profile : null);
  if (!data) {
    return (
      <View className="flex-1 bg-water dark:bg-water-night">
        <ScreenHeader screen="calendario" territory="pond" shape={1} />
      </View>
    );
  }
  return <MonthList data={data} />;
}
