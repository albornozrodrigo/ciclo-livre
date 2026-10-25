import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LikelyToday } from '@/components/cycle/likely-today';
import { ChoiceCategoryField } from '@/components/tracking/choice-category';
import { MeasureField } from '@/components/tracking/measure-field';
import { NoteField } from '@/components/tracking/note-field';
import { TagsField } from '@/components/tracking/tags-field';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { formatLongDate } from '@/components/ui/date-field';
import { useTodayCycle } from '@/cycle/use-today-cycle';
import { addDays, isValidDate, todayIso } from '@/domain/dates';
import type { Category, CategoryGroup } from '@/domain/tracking/catalog';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';
import { useCategoryOrder } from '@/tracking/use-category-order';
import { useDayLog } from '@/tracking/use-day-log';

const t = ptBR.tracking;

/** Agrupa mantendo a ordem escolhida pela pessoa (grupos na ordem em que aparecem). */
function groupCategories(categories: Category[]): [CategoryGroup, Category[]][] {
  const groups = new Map<CategoryGroup, Category[]>();
  for (const c of categories) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  return [...groups.entries()];
}

/** Registrar um dia: chips que salvam ao toque, medições e nota. */
export default function RegistroScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data: string }>();
  const date = isValidDate(params.data) ? params.data : todayIso();
  const { state } = useProfile();
  const { day, toggle, saveMeasure, saveNote } = useDayLog(date);
  const profile = state.status === 'ready' ? state.profile : null;
  const ordered = useCategoryOrder(profile?.mode ?? 'period', profile?.birthControl ?? null);
  // Só o registro de hoje mostra "Pode aparecer hoje"; recalcula quando o dia muda.
  const todayView = useTodayCycle(date === todayIso() ? profile : null, day);
  if (!profile || !day || !ordered) return null;

  const today = todayIso();
  const isToday = date === today;
  const title = isToday ? t.today : formatLongDate(date);
  const groups = groupCategories(ordered);
  // Teste de gravidez positivo (ou linha fraca) registrado hoje, fora do modo gravidez: oferece a troca, sem trocar sozinho.
  const positiveTest =
    isToday &&
    // No pós-parto o teste continua positivo por semanas: o cartão seria doloroso e inútil.
    profile.mode !== 'pregnancy' &&
    profile.mode !== 'postpartum' &&
    (day.selections.tests ?? []).some((option) => option === 'pregnancy_positive' || option === 'pregnancy_faint');

  return (
    <KeyboardAvoidingView behavior="padding" style={{ paddingTop: insets.top }} className="flex-1 bg-water dark:bg-water-night">
      <StatusBar style="auto" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: insets.bottom + 32 }}
        className="flex-1 px-5">
        <Text accessibilityRole="header" className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {title}
        </Text>
        <Text className="mt-3 text-base leading-6 text-ink-muted dark:text-ink-muted-night">{t.autosave}</Text>
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <CapsuleButton
              variant="outline"
              label={t.previousDay}
              disabled={!isValidDate(addDays(date, -1))}
              onPress={() => router.setParams({ data: addDays(date, -1) })}
            />
          </View>
          <View className="flex-1">
            <CapsuleButton
              variant="outline"
              label={t.nextDay}
              disabled={isToday}
              onPress={() => router.setParams({ data: addDays(date, 1) })}
            />
          </View>
        </View>

        {positiveTest ? (
          <View className="mt-8 gap-3 rounded-[28px] border-[1.5px] border-ink p-5 dark:border-ink-night">
            <Text className="text-base leading-6 text-ink dark:text-ink-night">{ptBR.profile.positiveTest.text}</Text>
            <CapsuleButton variant="outline" label={ptBR.profile.positiveTest.action} onPress={() => router.push('/perfil/modo')} />
          </View>
        ) : null}

        {isToday && todayView?.kind === 'cycle' && todayView.likelyToday.length > 0 ? (
          <View className="mt-8">
            <LikelyToday items={todayView.likelyToday} />
          </View>
        ) : null}

        {groups.map(([group, categories]) => (
          <View key={group} className="mt-10 gap-6">
            <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
              {t.groups[group]}
            </Text>
            {categories.map((category) =>
              category.kind === 'measure' ? (
                <MeasureField
                  key={`${date}:${category.id}`}
                  category={category}
                  value={day.measures[category.id]}
                  onSave={(v) => saveMeasure(category.id, v)}
                />
              ) : (
                <ChoiceCategoryField
                  key={category.id}
                  category={category}
                  selected={day.selections[category.id] ?? []}
                  onToggle={(option) => toggle(category.id, option)}
                />
              ),
            )}
          </View>
        ))}

        <View className="mt-10">
          <TagsField key={date} date={date} />
        </View>

        <View className="mt-10">
          {/* Chave pela data: ao trocar de dia, o campo antigo salva o pendente no dia certo. */}
          <NoteField key={date} value={day.note} onSave={saveNote} />
        </View>

        <View className="mt-10">
          <CapsuleButton variant="outline" label={t.customize} onPress={() => router.push('/registro/personalizar')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
