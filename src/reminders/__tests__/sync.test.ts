import { openMemoryDatabase } from "@/db/__tests__/node-sqlite-adapter";
import { setSelection } from "@/db/log-repo";
import { MIGRATIONS, runMigrations } from "@/db/migrations";
import { saveReminder, setDiscreet } from "@/db/reminder-repo";
import type { Profile } from "@/domain/profile";
import { defaultReminder } from "@/domain/reminders/catalog";
import {
  CHANNEL_ID,
  requestReminderPermission,
  syncReminders,
} from "@/reminders/sync";

const mockCalls: string[] = [];
const mockScheduled: {
  identifier: string;
  content: { title: string; body: string };
  trigger: { date: Date; channelId: string };
}[] = [];
let mockGranted = true;
const mockChannel = jest.fn();

jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockCalls.push("cancel");
  }),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockGranted })),
  requestPermissionsAsync: jest.fn(async () => ({
    granted: mockGranted,
    canAskAgain: false,
  })),
  setNotificationChannelAsync: jest.fn(async (...args: unknown[]) => {
    mockCalls.push("channel");
    mockChannel(...args);
  }),
  scheduleNotificationAsync: jest.fn(
    async (request: (typeof mockScheduled)[number]) => {
      mockCalls.push("schedule");
      mockScheduled.push(request);
      return request.identifier;
    },
  ),
}));

const profile: Profile = {
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
// 22/10/2026, 8h local.
const NOW = new Date(2026, 9, 22, 8, 0);

let db: ReturnType<typeof openMemoryDatabase>;
beforeEach(async () => {
  mockCalls.length = 0;
  mockScheduled.length = 0;
  mockGranted = true;
  mockChannel.mockClear();
  db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  for (const d of ["2026-09-26", "2026-09-27", "2026-09-28"])
    await setSelection(db, d, "period", ["medium"]);
  await saveReminder(db, { ...defaultReminder("period_due"), enabled: true });
});

describe("syncReminders", () => {
  it("cancela tudo e agenda a agenda calculada, com chave estável e hora local", async () => {
    await syncReminders(db, profile, NOW);

    expect(mockCalls[0]).toBe("cancel");
    expect(mockScheduled[0].identifier).toBe("period_due:2026-10-24");
    expect(mockScheduled[0].trigger).toEqual({
      type: "date",
      date: new Date(2026, 9, 24, 9, 0),
      channelId: CHANNEL_ID,
    });
    expect(mockScheduled[0].content).toMatchObject({
      title: "Menstruação prevista para hoje",
    });
  });

  it("canal com conteúdo privado na tela de bloqueio", async () => {
    await syncReminders(db, profile, NOW);
    expect(mockChannel).toHaveBeenCalledWith(
      CHANNEL_ID,
      expect.objectContaining({ lockscreenVisibility: 2 }),
    );
  });

  it("modo discreto: título e texto neutros", async () => {
    await setDiscreet(db, true);
    await syncReminders(db, profile, NOW);
    expect(mockScheduled[0].content).toMatchObject({
      title: "Ciclo Livre",
      body: "Você tem um lembrete.",
    });
  });

  it("sem permissão, não agenda (mas cancela os antigos)", async () => {
    mockGranted = false;
    await syncReminders(db, profile, NOW);
    expect(mockCalls).toEqual(["cancel"]);
  });

  it("sem perfil, só cancela", async () => {
    await syncReminders(db, null, NOW);
    expect(mockCalls).toEqual(["cancel"]);
  });

  it("chamadas simultâneas não se intercalam (sem duplicar nem apagar no meio)", async () => {
    await Promise.all([
      syncReminders(db, profile, NOW),
      syncReminders(db, profile, NOW),
    ]);
    const firstCancel = mockCalls.indexOf("cancel");
    const secondCancel = mockCalls.indexOf("cancel", firstCancel + 1);
    expect(mockCalls.slice(firstCancel + 1, secondCancel)).toContain(
      "schedule",
    );
    expect(mockCalls.slice(secondCancel + 1)).toContain("schedule");
  });
});

describe("requestReminderPermission", () => {
  it("cria o canal antes de pedir (no Android 13 o pedido só aparece com canal)", async () => {
    expect(await requestReminderPermission()).toEqual({
      granted: true,
      canAskAgain: false,
    });
    expect(mockCalls[0]).toBe("channel");
  });
});
