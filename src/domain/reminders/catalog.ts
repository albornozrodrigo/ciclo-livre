import { type IsoDate, toDayNumber } from "@/domain/dates";
import type { BirthControl, Profile } from "@/domain/profile";

export const REMINDER_KINDS = [
  "period_soon",
  "period_due",
  "period_late",
  "fertile_soon",
  "phase_change",
  "birth_control",
  "daily_log",
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const PACKS = ["cyclic", "continuous"] as const;
export const FREQUENCIES = [
  "daily",
  "every_3_days",
  "weekly",
  "fortnightly",
  "monthly",
] as const;
export const DAYS_BEFORE = { min: 1, max: 7 } as const;

/**
 * `daysBefore`: menstruação em breve. `pack`: pílula 21+7 (`cyclic`) ou contínua.
 * `frequency`: registro. `anchor`: data de referência (cartela, adesivo, anel, injeção, início do registro).
 */
export type ReminderOptions = {
  daysBefore: number;
  pack: (typeof PACKS)[number];
  frequency: (typeof FREQUENCIES)[number];
  anchor: IsoDate | null;
};

/** `time` em HH:MM local; `title`/`body` null = texto padrão. */
export type Reminder = {
  kind: ReminderKind;
  enabled: boolean;
  time: string;
  options: ReminderOptions;
  title: string | null;
  body: string | null;
};

export type BirthControlPlan = "pill" | "patch" | "ring" | "injection";

const BIRTH_CONTROL_PLANS: Partial<Record<BirthControl, BirthControlPlan>> = {
  pill: "pill",
  patch: "patch",
  ring: "ring",
  injection: "injection",
};

/** Métodos com agenda (DIU, implante, camisinha etc. não pedem lembrete periódico). */
export const birthControlPlan = (
  method: BirthControl | null,
): BirthControlPlan | null =>
  method ? (BIRTH_CONTROL_PLANS[method] ?? null) : null;

const DEFAULT_OPTIONS: ReminderOptions = {
  daysBefore: 2,
  pack: "cyclic",
  frequency: "daily",
  anchor: null,
};
const DEFAULT_TIME: Record<ReminderKind, string> = {
  period_soon: "09:00",
  period_due: "09:00",
  period_late: "09:00",
  fertile_soon: "09:00",
  phase_change: "09:00",
  birth_control: "21:00",
  daily_log: "20:00",
};

export const defaultReminder = (kind: ReminderKind): Reminder => ({
  kind,
  enabled: false,
  time: DEFAULT_TIME[kind],
  options: { ...DEFAULT_OPTIONS },
  title: null,
  body: null,
});

const CYCLE_KINDS: ReminderKind[] = [
  "period_soon",
  "period_due",
  "period_late",
  "fertile_soon",
  "phase_change",
];

/** Tipos que valem no modo e método atuais, na ordem de exibição. */
export function availableKinds(profile: Profile): ReminderKind[] {
  if (profile.mode === "pregnancy") return ["daily_log"];
  const cycle = profile.mode === "no_bleeding" ? [] : CYCLE_KINDS;
  const contraception: ReminderKind[] = birthControlPlan(profile.birthControl)
    ? ["birth_control"]
    : [];
  return [...cycle, ...contraception, "daily_log"];
}

/** Aviso que a tela mostra junto do lembrete (nunca desliga nada sozinho). */
export function reminderNotice(
  profile: Profile,
  kind: ReminderKind,
): "conceive_birth_control" | null {
  return kind === "birth_control" && profile.mode === "conceive"
    ? "conceive_birth_control"
    : null;
}

export const validTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const validDaysBefore = (v: unknown): v is number =>
  Number.isInteger(v) &&
  (v as number) >= DAYS_BEFORE.min &&
  (v as number) <= DAYS_BEFORE.max;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);
const validAnchor = (v: unknown): v is IsoDate =>
  typeof v === "string" && toDayNumber(v) !== null;

/** Opções válidas? (o repositório recusa as inválidas ao salvar) */
export function validOptions(o: ReminderOptions): boolean {
  return (
    validDaysBefore(o.daysBefore) &&
    oneOf(PACKS, o.pack) &&
    oneOf(FREQUENCIES, o.frequency) &&
    (o.anchor === null || validAnchor(o.anchor))
  );
}

/** Lê as opções gravadas (JSON); cada campo inválido ou ausente volta ao padrão. */
export function parseOptions(raw: string): ReminderOptions {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object")
      data = parsed as Record<string, unknown>;
  } catch {
    // JSON corrompido: tudo no padrão (nunca derruba a tela de lembretes).
  }
  return {
    daysBefore: validDaysBefore(data.daysBefore)
      ? data.daysBefore
      : DEFAULT_OPTIONS.daysBefore,
    pack: oneOf(PACKS, data.pack) ? data.pack : DEFAULT_OPTIONS.pack,
    frequency: oneOf(FREQUENCIES, data.frequency)
      ? data.frequency
      : DEFAULT_OPTIONS.frequency,
    anchor: validAnchor(data.anchor) ? data.anchor : null,
  };
}
