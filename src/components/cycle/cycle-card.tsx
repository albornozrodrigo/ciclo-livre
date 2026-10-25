import { router } from 'expo-router';
import { Text, View } from 'react-native';

import type { Territory } from '@/constants/theme';
import { dateFromIso, type IsoDate } from '@/domain/dates';
import type { Phase } from '@/domain/cycle/model';
import type { TodayView } from '@/domain/cycle/today';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ptBR } from '@/i18n/pt-BR';

import { LikelyToday } from './likely-today';

const c = ptBR.cycle;

/** Cor do território de cada fase (DESIGN.md): coral, lago, terra, lilás. */
export const PHASE_TERRITORY: Record<Phase, Territory> = {
  menstruation: 'coral',
  follicular: 'pond',
  fertile: 'land',
  luteal: 'lilac',
  // Contracepção hormonal: território neutro (sem cor de fertilidade).
  hormonal: 'pond',
};

const CHIP_CLASS: Record<Phase, string> = {
  menstruation: 'bg-coral dark:bg-coral-night',
  follicular: 'bg-pond dark:bg-pond-night',
  fertile: 'bg-land dark:bg-land-night',
  luteal: 'bg-lilac dark:bg-lilac-night',
  hormonal: 'bg-pond dark:bg-pond-night',
};

export const shortDate = (d: IsoDate) => dateFromIso(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

const Muted = ({ children }: { children: string }) => (
  <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{children}</Text>
);
const Line = ({ children }: { children: string }) => <Text className="text-base leading-6 text-ink dark:text-ink-night">{children}</Text>;

/** Parte principal (acima do botão de registrar): fase com cor e nome, dia e próxima menstruação. */
export function CycleCard({ view }: { view: TodayView }) {
  if (view.kind === 'none') return <Line>{c.none}</Line>;
  if (view.kind === 'no_bleeding') return <Muted>{c.noBleeding}</Muted>;
  if (view.kind === 'postpartum') {
    return (
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {view.weeks < 12 ? c.postpartum.weeks(view.weeks, view.days) : c.postpartum.months(view.months)}
        </Text>
        <Muted>{c.postpartum.hint}</Muted>
        {view.periodBack ? (
          <View className="gap-2">
            <Line>{c.postpartum.periodBack}</Line>
            <CapsuleButton variant="outline" label={c.postpartum.switch} onPress={() => router.push('/perfil/modo')} />
          </View>
        ) : null}
      </View>
    );
  }
  if (view.kind === 'pregnancy') {
    return (
      <View className="gap-2">
        <Text accessibilityRole="header" className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {c.pregnancyWeeks(view.week, view.day)}
        </Text>
        <Muted>{c.dueIn(view.daysToDue)}</Muted>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-3">
        {/* Chip da fase: a cor do território sempre acompanha o nome escrito. */}
        <View className={`self-start rounded-full px-3.5 py-1.5 ${CHIP_CLASS[view.phase]}`}>
          <Text className="text-sm font-bold tracking-[0.28px] text-ink">{c.phases[view.phase]}</Text>
        </View>
        {/* Display (44sp): o dia do ciclo é o número de que o DESIGN.md fala. */}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-[44px] font-bold leading-[42px] tracking-[-1.76px] text-ink [font-variant:tabular-nums] dark:text-ink-night">
          {c.dayOfCycle(view.cycleDay)}
        </Text>
      </View>

      <View className="gap-1">
        <Text className="text-lg font-bold leading-7 text-ink dark:text-ink-night">
          {view.late ? c.late(view.lateDays ?? 0) : c.nextIn(view.daysToNext)}
        </Text>
        <Muted>{view.late ? c.lateHint : c.range(shortDate(view.next.earliest), shortDate(view.next.latest))}</Muted>
      </View>
      {view.conceive ? <ConceiveBlock status={view.conceive} /> : null}
    </View>
  );
}

/** Modo Tentar engravidar: chance do dia (com fonte) e o próximo passo. */
function ConceiveBlock({ status }: { status: NonNullable<Extract<TodayView, { kind: 'cycle' }>['conceive']> }) {
  const k = c.conceive;
  const s = status.status;
  const next =
    s.kind === 'best_in'
      ? k.bestIn(s.days)
      : s.kind === 'last_fertile'
        ? k.lastFertile(shortDate(s.date))
        : s.kind === 'test_from'
          ? k.testFrom(shortDate(s.date), s.days)
          : k.lateTest;
  return (
    <View className="gap-1">
      <Text className="text-lg font-bold leading-7 text-ink dark:text-ink-night">{k.chanceToday(k.chance[status.chance])}</Text>
      <Line>{next}</Line>
      <Muted>{k.source}</Muted>
    </View>
  );
}

/** Detalhes (abaixo do registro): janela fértil, dor prevista, confiança e aviso. */
export function CycleDetails({ view }: { view: TodayView }) {
  if (view.kind !== 'cycle') return null;
  return (
    <View className="gap-4">
      <Line>{view.fertile ? c.fertile(shortDate(view.fertile.start), shortDate(view.fertile.end)) : c.fertilityHidden}</Line>
      <LikelyToday items={view.likelyToday} />
      {view.painDays.length > 0 ? <Line>{c.pain(view.painDays.map(shortDate).join(', '))}</Line> : null}
      <View className="gap-1">
        <Muted>{c.confidence[view.confidence]}</Muted>
        <Text className="text-sm font-bold leading-5 text-ink dark:text-ink-night">{c.disclaimer}</Text>
      </View>
    </View>
  );
}
