import { Text, TextInput, View } from 'react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { DateField, formatLongDate } from '@/components/ui/date-field';
import { TimeField } from '@/components/ui/time-field';
import { addDays, todayIso } from '@/domain/dates';
import { type Med, MED_LIMITS } from '@/domain/reminders/medication';
import { ptBR } from '@/i18n/pt-BR';

const m = ptBR.reminders.meds;

/** Lista de remédios do lembrete: nome, horários (até 4) e término opcional de cada um. */
export function MedicationList({ meds, error, onChange }: { meds: Med[]; error: string | null; onChange: (meds: Med[]) => void }) {
  const today = todayIso();
  const update = (i: number, patch: Partial<Med>) => onChange(meds.map((med, j) => (j === i ? { ...med, ...patch } : med)));
  const remove = (i: number) => onChange(meds.filter((_, j) => j !== i));
  const nextTime = (times: string[]) => ['08:00', '12:00', '18:00', '22:00'].find((t) => !times.includes(t)) ?? '08:00';

  return (
    <View className="gap-6">
      <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{m.hint}</Text>
      {meds.map((med, i) => (
        <View key={i} className="gap-4 rounded-[28px] border-[1.5px] border-ink p-4 dark:border-ink-night">
          <View className="gap-2">
            <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{m.name(i + 1)}</Text>
            <TextInput
              accessibilityLabel={m.name(i + 1)}
              value={med.name}
              onChangeText={(name) => update(i, { name })}
              maxLength={MED_LIMITS.name}
              placeholder={m.namePlaceholder}
              style={{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 56 }}
              className="rounded-[28px] border-[1.5px] border-ink text-base leading-6 text-ink placeholder:text-ink-muted dark:border-ink-night dark:text-ink-night dark:placeholder:text-ink-muted-night"
            />
          </View>
          {med.times.map((time, k) => (
            <View key={k} className="gap-2">
              <TimeField
                label={m.time(k + 1)}
                value={time}
                accessibilityLabel={m.timeChange(med.name || m.name(i + 1), time)}
                accessibilityHint={ptBR.reminders.timeHint}
                onChange={(value) => update(i, { times: med.times.map((t, j) => (j === k ? value : t)) })}
              />
              {med.times.length > 1 ? (
                <CapsuleButton
                  variant="outline"
                  label={m.removeTime(time)}
                  onPress={() => update(i, { times: med.times.filter((_, j) => j !== k) })}
                />
              ) : null}
            </View>
          ))}
          {med.times.length < MED_LIMITS.times ? (
            <CapsuleButton variant="outline" label={m.addTime} onPress={() => update(i, { times: [...med.times, nextTime(med.times)] })} />
          ) : null}
          <DateField
            label={m.until}
            value={med.until}
            placeholder={m.untilPlaceholder}
            min={today}
            max={addDays(today, 3650)}
            initial={today}
            onChange={(until) => update(i, { until })}
          />
          {med.until && med.until < today ? (
            <Text className="text-sm font-bold leading-5 text-ink dark:text-ink-night">{m.ended(formatLongDate(med.until))}</Text>
          ) : null}
          {med.until ? <CapsuleButton variant="outline" label={m.noEnd} onPress={() => update(i, { until: null })} /> : null}
          <CapsuleButton variant="outline" label={m.remove(med.name || m.name(i + 1))} onPress={() => remove(i)} />
        </View>
      ))}
      {meds.length < MED_LIMITS.meds ? (
        <CapsuleButton variant="outline" label={m.add} onPress={() => onChange([...meds, { name: '', times: ['08:00'], until: null }])} />
      ) : null}
      {/* Atalho para a terapia hormonal (pensado para peri e menopausa, aparece em todo modo), sem repetir o nome. */}
      {meds.length < MED_LIMITS.meds && !meds.some((med) => med.name.trim() === m.hormoneTherapy) ? (
        <CapsuleButton
          variant="outline"
          label={m.addHormoneTherapy}
          onPress={() => onChange([...meds, { name: m.hormoneTherapy, times: ['08:00'], until: null }])}
        />
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-base font-bold leading-6 text-ink dark:text-ink-night">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
