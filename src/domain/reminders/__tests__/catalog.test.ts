import {
  availableKinds,
  defaultReminder,
  parseOptions,
  reminderNotice,
  validTime,
} from "@/domain/reminders/catalog";
import type { Profile } from "@/domain/profile";

const base: Profile = {
  birthYear: 1995,
  mode: "period",
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: "unknown",
  dueDate: null,
  tryingSince: null,
  birthControl: null,
};

describe("availableKinds", () => {
  it("período: todos os de ciclo e registro; contraceptivo só com método que tem agenda", () => {
    expect(availableKinds(base)).toEqual([
      "period_soon",
      "period_due",
      "period_late",
      "fertile_soon",
      "phase_change",
      "daily_log",
    ]);
    expect(availableKinds({ ...base, birthControl: "pill" })).toContain(
      "birth_control",
    );
    expect(availableKinds({ ...base, birthControl: "condom" })).not.toContain(
      "birth_control",
    );
  });

  it("gravidez: só registro", () => {
    expect(
      availableKinds({ ...base, mode: "pregnancy", dueDate: "2027-03-01" }),
    ).toEqual(["daily_log"]);
  });

  it("sem sangramento: sem menstruação nem fase", () => {
    expect(
      availableKinds({ ...base, mode: "no_bleeding", birthControl: "ring" }),
    ).toEqual(["birth_control", "daily_log"]);
  });
});

describe("reminderNotice", () => {
  it("tentando engravidar com contraceptivo: sugere desligar, sem desligar sozinho", () => {
    expect(
      reminderNotice(
        { ...base, mode: "conceive", birthControl: "pill" },
        "birth_control",
      ),
    ).toBe("conceive_birth_control");
    expect(reminderNotice(base, "birth_control")).toBeNull();
  });
});

describe("defaultReminder", () => {
  it("desligado, com horário e opções padrão, sem mensagem própria", () => {
    expect(defaultReminder("period_soon")).toEqual({
      kind: "period_soon",
      enabled: false,
      time: "09:00",
      options: {
        daysBefore: 2,
        pack: "cyclic",
        frequency: "daily",
        anchor: null,
      },
      title: null,
      body: null,
    });
  });
});

describe("parseOptions", () => {
  it("mantém valores válidos e troca inválidos pelo padrão campo a campo", () => {
    expect(
      parseOptions(
        '{"daysBefore":5,"pack":"continuous","frequency":"weekly","anchor":"2026-10-20"}',
      ),
    ).toEqual({
      daysBefore: 5,
      pack: "continuous",
      frequency: "weekly",
      anchor: "2026-10-20",
    });
    expect(
      parseOptions(
        '{"daysBefore":9,"pack":"x","frequency":1,"anchor":"20/10/2026","extra":true}',
      ),
    ).toEqual({
      daysBefore: 2,
      pack: "cyclic",
      frequency: "daily",
      anchor: null,
    });
    expect(parseOptions("não é json")).toEqual(
      defaultReminder("daily_log").options,
    );
  });
});

describe("validTime", () => {
  it("aceita HH:MM de 00:00 a 23:59", () => {
    expect(["00:00", "09:30", "23:59"].every(validTime)).toBe(true);
    expect(["24:00", "9:30", "12:60", ""].some(validTime)).toBe(false);
  });
});
