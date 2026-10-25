import { Text, View } from 'react-native';

import { CycleLengthsFields } from '@/components/fields/cycle-lengths-fields';
import { FormScreen } from '@/components/form-screen';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ChoiceList } from '@/components/ui/choice-list';
import { DateField } from '@/components/ui/date-field';
import { addDays, todayIso } from '@/domain/dates';
import { BIRTH_CONTROL, LIMITS } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useProfileEditor } from '@/profile/use-profile-editor';

const ob = ptBR.onboarding;
const birthControlOptions = BIRTH_CONTROL.map((value) => ({ value, label: ob.birthControl.options[value] }));

export default function CycleDataScreen() {
  const { draft, update, save, canSave } = useProfileEditor();
  if (!draft) return null;
  const today = todayIso();

  return (
    <FormScreen title={ptBR.profile.cycleTitle} actionLabel={ptBR.profile.save} onAction={save} actionDisabled={!canSave}>
      <View className="gap-3">
        <DateField
          label={ob.lastPeriod.label}
          value={draft.lastPeriodStart}
          placeholder={ob.lastPeriod.pick}
          min={addDays(today, -LIMITS.lastPeriodMaxDaysAgo)}
          max={today}
          initial={draft.lastPeriodStart ?? today}
          onChange={(lastPeriodStart) => update({ lastPeriodStart })}
        />
        <CapsuleButton variant="outline" label={ob.lastPeriod.dontRemember} onPress={() => update({ lastPeriodStart: null })} />
      </View>
      <CycleLengthsFields value={draft} onChange={update} />
      <View className="gap-3">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{ob.birthControl.title}</Text>
        <ChoiceList
          label={ob.birthControl.title}
          options={birthControlOptions}
          value={draft.birthControl}
          onChange={(birthControl) => update({ birthControl })}
        />
      </View>
    </FormScreen>
  );
}
