import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceCategoryField } from '@/components/tracking/choice-category';
import { MeasureField } from '@/components/tracking/measure-field';
import { NoteField } from '@/components/tracking/note-field';
import { formatLongDate } from '@/components/ui/date-field';
import { toDayNumber, todayIso } from '@/domain/dates';
import { type Category, type CategoryGroup, defaultVisibleCategories } from '@/domain/tracking/catalog';
import { ptBR } from '@/i18n/pt-BR';
import { useProfile } from '@/profile/profile-context';
import { useDayLog } from '@/tracking/use-day-log';

const t = ptBR.tracking;

function groupCategories(categories: Category[]): [CategoryGroup, Category[]][] {
  const groups = new Map<CategoryGroup, Category[]>();
  for (const c of categories) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  return [...groups.entries()];
}

/** Registrar um dia: chips que salvam ao toque, medições e nota. */
export default function RegistroScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data: string }>();
  const date = typeof params.data === 'string' && toDayNumber(params.data) !== null ? params.data : todayIso();
  const { state } = useProfile();
  const { day, toggle, saveMeasure, saveNote } = useDayLog(date);
  const profile = state.status === 'ready' ? state.profile : null;
  if (!profile || !day) return null;

  const title = date === todayIso() ? t.today : formatLongDate(date);
  const groups = groupCategories(defaultVisibleCategories(profile.mode, profile.birthControl));

  return (
    <KeyboardAvoidingView behavior="padding" style={{ paddingTop: insets.top }} className="flex-1 bg-water dark:bg-water-night">
      <StatusBar style="auto" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 32, paddingBottom: insets.bottom + 32 }} className="flex-1 px-5">
        <Text accessibilityRole="header" className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {title}
        </Text>
        <Text className="mt-3 text-base leading-6 text-ink-muted dark:text-ink-muted-night">{t.autosave}</Text>

        {groups.map(([group, categories]) => (
          <View key={group} className="mt-10 gap-6">
            <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
              {t.groups[group]}
            </Text>
            {categories.map((category) =>
              category.kind === 'measure' ? (
                <MeasureField key={category.id} category={category} value={day.measures[category.id]} onSave={(v) => saveMeasure(category.id, v)} />
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
          <NoteField value={day.note} onSave={saveNote} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
