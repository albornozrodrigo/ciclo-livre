import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { DeniedNotice } from '@/components/reminders/denied-notice';
import { SwitchRow } from '@/components/reminders/switch-row';
import { ChoiceList } from '@/components/ui/choice-list';
import { DateField, formatLongDate } from '@/components/ui/date-field';
import { NumberStepper } from '@/components/ui/number-stepper';
import { useSnackbar } from '@/components/ui/snackbar';
import { TimeField } from '@/components/ui/time-field';
import { hidesFertility } from '@/domain/cycle/for-profile';
import { addDays, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import {
  anchorFor,
  birthControlPlan,
  DEVICE_YEARS,
  THREADS,
  customMessageAllowed,
  DAYS_BEFORE,
  FREQUENCIES,
  PACKS,
  type Reminder,
  REMINDER_KINDS,
  type ReminderKind,
  needsAnchor,
  reminderNotice,
} from '@/domain/reminders/catalog';
import { MESSAGE_LIMITS, validateMessage } from '@/domain/reminders/message';
import { deviceDueDate, isDevicePlan, type Variant } from '@/domain/reminders/schedule';
import { ptBR } from '@/i18n/pt-BR';
import { REMINDER_NAMES, reminderContent } from '@/i18n/pt-BR-reminders';
import { log } from '@/lib/logger';
import { useReminders } from '@/reminders/use-reminders';

const r = ptBR.reminders;
const packOptions = PACKS.map((value) => ({ value, label: r.packs[value] }));
const frequencyOptions = FREQUENCIES.map((value) => ({
  value,
  label: r.frequencies[value],
}));

const threadOptions = THREADS.map((value) => ({ value, label: ptBR.reminders.threads.options[value] }));

const isKind = (v: unknown): v is ReminderKind => typeof v === 'string' && (REMINDER_KINDS as readonly string[]).includes(v);

/** Variante mostrada na prévia. */
function previewVariant(kind: ReminderKind, profile: Profile): Variant {
  if (kind === 'phase_change') return hidesFertility(profile) ? 'phase_hormonal' : 'phase_follicular';
  if (kind !== 'birth_control') return kind;
  const plan = birthControlPlan(profile.birthControl);
  if (plan === 'iud_hormonal' || plan === 'iud_copper') return 'iud_threads';
  if (plan === 'implant') return 'device_change_soon';
  return plan === 'patch' ? 'patch_change' : plan === 'ring' ? 'ring_insert' : plan === 'injection' ? 'injection_soon' : 'pill';
}

/** Pede data de referência (cartela 21+7, adesivo, anel, injeção), tenha ou não uma já escolhida. */
function asksAnchor(draft: Reminder, profile: Profile) {
  const plan = birthControlPlan(profile.birthControl);
  return draft.kind === 'birth_control' && plan !== null && !(plan === 'pill' && draft.options.pack === 'continuous');
}

/** Pergunta antes de descartar mudanças não salvas (Back do sistema ou gesto). */
function useConfirmLeave(dirty: boolean) {
  const navigation = useNavigation();
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert(r.leaveTitle, r.leaveBody, [
      { text: r.leaveStay, style: 'cancel' },
      { text: r.leaveDiscard, style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
}

export default function LembreteScreen() {
  const { tipo, ligar } = useLocalSearchParams<{ tipo: string; ligar?: string }>();
  const { profile, data, denied, save } = useReminders();
  const kind = isKind(tipo) ? tipo : null;
  const loaded = kind && data ? data.reminders.find((x) => x.kind === kind) : undefined;
  if (!profile || !data || !loaded) return null;
  // Chave por tipo: trocar de lembrete reinicia o rascunho.
  // Veio do interruptor da lista: já chega ligado (falta só a data).
  const initial = ligar === '1' ? { ...loaded, enabled: true } : loaded;
  return <Editor key={loaded.kind} initial={initial} profile={profile} discreet={data.discreet} denied={denied} save={save} />;
}

type EditorProps = {
  initial: Reminder;
  profile: Profile;
  discreet: boolean;
  denied: boolean;
  save: (next: Reminder) => Promise<boolean>;
};

function Editor({ initial, profile, discreet, denied, save }: EditorProps) {
  const { show } = useSnackbar();
  const [draft, setDraft] = useState(initial);
  const [title, setTitle] = useState(initial.title ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [saved, setSaved] = useState(false);
  const today = todayIso();
  const plan = birthControlPlan(profile.birthControl);
  const anchorMissing = needsAnchor(draft, profile);
  // Validade vencida pela data e anos informados: avisa na tela (a agenda avisa todo mês).
  const deviceAnchor = draft.kind === 'birth_control' ? anchorFor(draft, profile) : null;
  const due = deviceAnchor && isDevicePlan(plan) ? deviceDueDate(draft, plan, deviceAnchor) : null;
  const overdue = due && due < today ? due : null;
  const allowMessage = customMessageAllowed(draft.kind, profile);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || title !== (initial.title ?? '') || body !== (initial.body ?? '');
  useConfirmLeave(dirty && !saved);
  // Volta só depois que o "salvo" desliga a confirmação de saída.
  useEffect(() => {
    if (saved && router.canGoBack()) router.back();
  }, [saved]);
  const setOptions = (patch: Partial<Reminder['options']>) => setDraft((d) => ({ ...d, options: { ...d.options, ...patch } }));
  const variant = previewVariant(draft.kind, profile);
  const preview = reminderContent({ ...draft, title: title.trim() || null, body: body.trim() || null }, variant, discreet);
  const notice = reminderNotice(profile, draft.kind);

  async function handleSave() {
    const message = validateMessage(title, body);
    if (!message.ok) {
      setErrors({
        title: message.errors.title ? r.titleTooLong : undefined,
        body: message.errors.body ? r.bodyTooLong : undefined,
      });
      return;
    }
    setErrors({});
    const anchor = draft.kind === 'daily_log' && !draft.options.anchor ? today : draft.options.anchor;
    try {
      const ok = await save({
        ...draft,
        // Sem mensagem própria onde os avisos dizem coisas opostas (ex.: anel colocar/tirar).
        title: allowMessage ? message.title : null,
        body: allowMessage ? message.body : null,
        options: { ...draft.options, anchor },
      });
      if (!ok) return;
      show(r.saved);
      setSaved(true);
    } catch (error) {
      log.error('reminder_save_failed', error);
      show(r.saveFailed);
    }
  }

  return (
    <FormScreen
      title={REMINDER_NAMES[draft.kind]}
      actionLabel={r.save}
      onAction={handleSave}
      actionDisabled={anchorMissing && draft.enabled}>
      {denied ? <DeniedNotice /> : null}
      {notice === 'conceive_birth_control' ? (
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{r.conceiveNotice}</Text>
      ) : null}
      {notice === 'hormonal_no_fertile' ? (
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{r.hormonalNotice}</Text>
      ) : null}
      {draft.kind === 'fertile_soon' ? (
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{r.notContraception}</Text>
      ) : null}

      <SwitchRow label={r.enabled} value={draft.enabled} onValueChange={(enabled) => setDraft((d) => ({ ...d, enabled }))} />
      <TimeField
        label={r.time}
        value={draft.time}
        accessibilityLabel={r.timeChange(draft.time)}
        accessibilityHint={r.timeHint}
        onChange={(time) => setDraft((d) => ({ ...d, time }))}
      />

      {draft.kind === 'period_soon' ? (
        <NumberStepper
          label={r.daysBefore}
          value={draft.options.daysBefore}
          min={DAYS_BEFORE.min}
          max={DAYS_BEFORE.max}
          onChange={(daysBefore) => setOptions({ daysBefore })}
          format={r.daysBeforeValue}
          decreaseLabel={r.daysBeforeDecrease}
          increaseLabel={r.daysBeforeIncrease}
        />
      ) : null}

      {draft.kind === 'birth_control' && plan === 'pill' ? (
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{r.pack}</Text>
          <ChoiceList label={r.pack} options={packOptions} value={draft.options.pack} onChange={(pack) => setOptions({ pack })} />
        </View>
      ) : null}
      {asksAnchor(draft, profile) && plan ? (
        <View className="gap-2">
          <DateField
            label={r.anchor[plan]}
            value={anchorFor(draft, profile)}
            placeholder={r.anchorPlaceholder}
            // DIU e implante duram anos; os outros métodos só precisam da data recente.
            min={isDevicePlan(plan) ? addDays(today, -366 * DEVICE_YEARS.max) : addDays(today, -120)}
            max={addDays(today, 30)}
            initial={today}
            onChange={(anchor) => setOptions({ anchor, anchorFor: plan })}
          />
          {anchorMissing ? <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{r.anchorNeeded}</Text> : null}
        </View>
      ) : null}
      {draft.kind === 'birth_control' && isDevicePlan(plan) ? (
        <NumberStepper
          label={r.deviceYears}
          value={draft.options.years ?? DEVICE_YEARS[plan]}
          min={DEVICE_YEARS.min}
          max={DEVICE_YEARS.max}
          onChange={(years) => setOptions({ years })}
          format={r.years}
          decreaseLabel={`${ptBR.onboarding.lengths.decrease}: ${r.deviceYears}`}
          increaseLabel={`${ptBR.onboarding.lengths.increase}: ${r.deviceYears}`}
        />
      ) : null}
      {draft.kind === 'birth_control' && isDevicePlan(plan) && overdue ? (
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{r.deviceOverdue(formatLongDate(overdue))}</Text>
      ) : null}
      {draft.kind === 'birth_control' && (plan === 'iud_hormonal' || plan === 'iud_copper') ? (
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{r.threads.title}</Text>
          <ChoiceList
            label={r.threads.title}
            options={threadOptions}
            value={draft.options.threads}
            onChange={(threads) => setOptions({ threads })}
          />
        </View>
      ) : null}

      {draft.kind === 'daily_log' ? (
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{r.frequency}</Text>
          <ChoiceList
            label={r.frequency}
            options={frequencyOptions}
            value={draft.options.frequency}
            onChange={(frequency) => setOptions({ frequency })}
          />
        </View>
      ) : null}

      {allowMessage ? (
        <View className="gap-4">
          <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {r.message}
          </Text>
          <MessageField
            label={r.titleLabel}
            value={title}
            max={MESSAGE_LIMITS.title}
            placeholder={reminderContent({ ...draft, title: null }, variant, false).title}
            error={errors.title}
            onChange={setTitle}
          />
          <MessageField
            label={r.bodyLabel}
            value={body}
            max={MESSAGE_LIMITS.body}
            placeholder={reminderContent({ ...draft, body: null }, variant, false).body}
            error={errors.body}
            onChange={setBody}
            multiline
          />
        </View>
      ) : null}

      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {r.preview}
        </Text>
        {/* Prévia da notificação: o mesmo texto que o agendador usa. */}
        <View accessible className="gap-1 rounded-[28px] border-[1.5px] border-ink px-5 py-4 dark:border-ink-night">
          <Text className="text-sm text-ink-muted [font-variant:tabular-nums] dark:text-ink-muted-night">{r.previewMeta(draft.time)}</Text>
          <Text className="text-base font-bold text-ink dark:text-ink-night">{preview.title}</Text>
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{preview.body}</Text>
        </View>
        {/* Privacidade visível: o que aparece (ou não) na tela de bloqueio. */}
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
          {discreet ? r.lockscreenDiscreet : r.lockscreenPrivate}
        </Text>
      </View>
    </FormScreen>
  );
}

type MessageFieldProps = {
  label: string;
  value: string;
  max: number;
  placeholder: string;
  error?: string;
  multiline?: boolean;
  onChange: (text: string) => void;
};

function MessageField({ label, value, max, placeholder, error, multiline, onChange }: MessageFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        maxLength={max}
        placeholder={placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          minHeight: multiline ? 96 : 56,
        }}
        className={`rounded-[28px] text-base leading-6 text-ink placeholder:text-ink-muted dark:text-ink-night dark:placeholder:text-ink-muted-night ${
          error ? 'border-[3px] border-ink dark:border-ink-night' : 'border-[1.5px] border-ink dark:border-ink-night'
        }`}
      />
      <View className="flex-row justify-between gap-3">
        {error ? <Text className="flex-1 text-sm font-bold text-ink dark:text-ink-night">{error}</Text> : <View className="flex-1" />}
        <Text className="text-sm text-ink-muted [font-variant:tabular-nums] dark:text-ink-muted-night">{r.counter(value.length, max)}</Text>
      </View>
    </View>
  );
}
