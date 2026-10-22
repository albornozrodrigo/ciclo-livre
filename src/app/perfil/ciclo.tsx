import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ChoiceList } from '@/components/ui/choice-list';
import { DateField } from '@/components/ui/date-field';
import { NumberStepper } from '@/components/ui/number-stepper';
import { addDays, isoFromDate } from '@/domain/dates';
import { BIRTH_CONTROL, LIMITS, REGULARITIES } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useProfileEditor } from '@/profile/use-profile-editor';

const ob = ptBR.onboarding;
const regularityOptions = REGULARITIES.map((value) => ({ value, label: ob.lengths.regularityOptions[value] }));
const birthControlOptions = BIRTH_CONTROL.map((value) => ({ value, label: ob.birthControl.options[value] }));

export default function CycleDataScreen() {
  const { draft, update, save, canSave } = useProfileEditor();
  if (!draft) return null;
  const today = isoFromDate(new Date());
  const lengthsInvalid = draft.periodLength >= draft.cycleLength;

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
      <NumberStepper
        label={ob.lengths.period}
        value={draft.periodLength}
        min={LIMITS.periodLength.min}
        max={LIMITS.periodLength.max}
        onChange={(periodLength) => update({ periodLength })}
        format={ob.lengths.days}
        decreaseLabel={`${ob.lengths.decrease}: ${ob.lengths.period}`}
        increaseLabel={`${ob.lengths.increase}: ${ob.lengths.period}`}
      />
      <NumberStepper
        label={ob.lengths.cycle}
        value={draft.cycleLength}
        min={LIMITS.cycleLength.min}
        max={LIMITS.cycleLength.max}
        onChange={(cycleLength) => update({ cycleLength })}
        format={ob.lengths.days}
        decreaseLabel={`${ob.lengths.decrease}: ${ob.lengths.cycle}`}
        increaseLabel={`${ob.lengths.increase}: ${ob.lengths.cycle}`}
      />
      {lengthsInvalid ? (
        <Text accessibilityLiveRegion="polite" className="text-base leading-6 text-ink dark:text-ink-night">
          {ob.lengths.errors.not_shorter_than_cycle}
        </Text>
      ) : null}
      <View className="gap-3">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{ob.lengths.regularity}</Text>
        <ChoiceList label={ob.lengths.regularity} options={regularityOptions} value={draft.regularity} onChange={(regularity) => update({ regularity })} />
      </View>
      <View className="gap-3">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{ob.birthControl.title}</Text>
        <ChoiceList label={ob.birthControl.title} options={birthControlOptions} value={draft.birthControl} onChange={(birthControl) => update({ birthControl })} />
      </View>
    </FormScreen>
  );
}
