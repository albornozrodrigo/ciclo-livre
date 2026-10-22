import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { FormScreen } from "@/components/form-screen";
import { DeniedNotice } from "@/components/reminders/denied-notice";
import { SwitchRow } from "@/components/reminders/switch-row";
import { ChoiceList } from "@/components/ui/choice-list";
import { DateField } from "@/components/ui/date-field";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useSnackbar } from "@/components/ui/snackbar";
import { TimeField } from "@/components/ui/time-field";
import { addDays, todayIso } from "@/domain/dates";
import type { Profile } from "@/domain/profile";
import {
  birthControlPlan,
  DAYS_BEFORE,
  FREQUENCIES,
  PACKS,
  type Reminder,
  REMINDER_KINDS,
  type ReminderKind,
  reminderNotice,
} from "@/domain/reminders/catalog";
import { MESSAGE_LIMITS, validateMessage } from "@/domain/reminders/message";
import type { Variant } from "@/domain/reminders/schedule";
import { ptBR } from "@/i18n/pt-BR";
import { REMINDER_NAMES, reminderContent } from "@/i18n/pt-BR-reminders";
import { log } from "@/lib/logger";
import { useReminders } from "@/reminders/use-reminders";

const r = ptBR.reminders;
const packOptions = PACKS.map((value) => ({ value, label: r.packs[value] }));
const frequencyOptions = FREQUENCIES.map((value) => ({
  value,
  label: r.frequencies[value],
}));

const isKind = (v: unknown): v is ReminderKind =>
  typeof v === "string" && (REMINDER_KINDS as readonly string[]).includes(v);

/** Variante mostrada na prévia. */
function previewVariant(kind: ReminderKind, profile: Profile): Variant {
  if (kind === "phase_change") return "phase_follicular";
  if (kind !== "birth_control") return kind;
  const plan = birthControlPlan(profile.birthControl);
  return plan === "patch"
    ? "patch_change"
    : plan === "ring"
      ? "ring_insert"
      : plan === "injection"
        ? "injection_soon"
        : "pill";
}

/** Precisa de data de referência (cartela 21+7, adesivo, anel, injeção). */
function needsAnchor(draft: Reminder, profile: Profile) {
  if (draft.kind !== "birth_control") return false;
  const plan = birthControlPlan(profile.birthControl);
  return (
    plan !== null && !(plan === "pill" && draft.options.pack === "continuous")
  );
}

export default function LembreteScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const { profile, data, denied, save } = useReminders();
  const kind = isKind(tipo) ? tipo : null;
  const loaded =
    kind && data ? data.reminders.find((x) => x.kind === kind) : undefined;
  if (!profile || !data || !loaded) return null;
  // Chave por tipo: trocar de lembrete reinicia o rascunho.
  return (
    <Editor
      key={loaded.kind}
      initial={loaded}
      profile={profile}
      discreet={data.discreet}
      denied={denied}
      save={save}
    />
  );
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
  const [title, setTitle] = useState(initial.title ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const today = todayIso();
  const plan = birthControlPlan(profile.birthControl);
  const anchorMissing = needsAnchor(draft, profile) && !draft.options.anchor;
  const setOptions = (patch: Partial<Reminder["options"]>) =>
    setDraft((d) => ({ ...d, options: { ...d.options, ...patch } }));
  const variant = previewVariant(draft.kind, profile);
  const preview = reminderContent(
    { ...draft, title: title.trim() || null, body: body.trim() || null },
    variant,
    discreet,
  );
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
    const anchor =
      draft.kind === "daily_log" && !draft.options.anchor
        ? today
        : draft.options.anchor;
    try {
      const saved = await save({
        ...draft,
        title: message.title,
        body: message.body,
        options: { ...draft.options, anchor },
      });
      if (!saved) return;
      show(r.saved);
      if (router.canGoBack()) router.back();
    } catch (error) {
      log.error("reminder_save_failed", error);
      show(r.saveFailed);
    }
  }

  return (
    <FormScreen
      title={REMINDER_NAMES[draft.kind]}
      actionLabel={r.save}
      onAction={handleSave}
      actionDisabled={anchorMissing && draft.enabled}
    >
      {denied ? <DeniedNotice /> : null}
      {notice === "conceive_birth_control" ? (
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">
          {r.conceiveNotice}
        </Text>
      ) : null}
      {draft.kind === "fertile_soon" ? (
        <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">
          {r.notContraception}
        </Text>
      ) : null}

      <SwitchRow
        label={r.enabled}
        value={draft.enabled}
        onValueChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
      />
      <TimeField
        label={r.time}
        value={draft.time}
        accessibilityLabel={r.timeChange(draft.time)}
        onChange={(time) => setDraft((d) => ({ ...d, time }))}
      />

      {draft.kind === "period_soon" ? (
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

      {draft.kind === "birth_control" && plan === "pill" ? (
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
            {r.pack}
          </Text>
          <ChoiceList
            label={r.pack}
            options={packOptions}
            value={draft.options.pack}
            onChange={(pack) => setOptions({ pack })}
          />
        </View>
      ) : null}
      {needsAnchor(draft, profile) && plan ? (
        <View className="gap-2">
          <DateField
            label={r.anchor[plan]}
            value={draft.options.anchor}
            placeholder={r.anchorPlaceholder}
            min={addDays(today, -120)}
            max={addDays(today, 30)}
            initial={today}
            onChange={(anchor) => setOptions({ anchor })}
          />
          {anchorMissing ? (
            <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
              {r.anchorNeeded}
            </Text>
          ) : null}
        </View>
      ) : null}

      {draft.kind === "daily_log" ? (
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
            {r.frequency}
          </Text>
          <ChoiceList
            label={r.frequency}
            options={frequencyOptions}
            value={draft.options.frequency}
            onChange={(frequency) => setOptions({ frequency })}
          />
        </View>
      ) : null}

      <View className="gap-4">
        <Text
          accessibilityRole="header"
          className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night"
        >
          {r.message}
        </Text>
        <MessageField
          label={r.titleLabel}
          value={title}
          max={MESSAGE_LIMITS.title}
          placeholder={
            reminderContent({ ...draft, title: null }, variant, false).title
          }
          error={errors.title}
          onChange={setTitle}
        />
        <MessageField
          label={r.bodyLabel}
          value={body}
          max={MESSAGE_LIMITS.body}
          placeholder={
            reminderContent({ ...draft, body: null }, variant, false).body
          }
          error={errors.body}
          onChange={setBody}
          multiline
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
          {r.preview}
        </Text>
        {/* Prévia da notificação: o mesmo texto que o agendador usa. */}
        <View
          accessible
          className="gap-1 rounded-[20px] border-[1.5px] border-ink p-4 dark:border-ink-night"
        >
          <Text className="text-base font-bold text-ink dark:text-ink-night">
            {preview.title}
          </Text>
          <Text className="text-base leading-6 text-ink dark:text-ink-night">
            {preview.body}
          </Text>
        </View>
        {discreet ? (
          <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
            {r.previewDiscreet}
          </Text>
        ) : null}
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

function MessageField({
  label,
  value,
  max,
  placeholder,
  error,
  multiline,
  onChange,
}: MessageFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          minHeight: multiline ? 96 : 56,
        }}
        className={`rounded-[28px] text-base leading-6 text-ink placeholder:text-ink-muted dark:text-ink-night dark:placeholder:text-ink-muted-night ${
          error
            ? "border-[3px] border-ink dark:border-ink-night"
            : "border-[1.5px] border-ink dark:border-ink-night"
        }`}
      />
      <View className="flex-row justify-between gap-3">
        {error ? (
          <Text className="flex-1 text-sm font-bold text-ink dark:text-ink-night">
            {error}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        <Text className="text-sm text-ink-muted [font-variant:tabular-nums] dark:text-ink-muted-night">
          {r.counter(value.length, max)}
        </Text>
      </View>
    </View>
  );
}
