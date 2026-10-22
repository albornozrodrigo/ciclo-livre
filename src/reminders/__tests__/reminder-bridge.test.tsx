import { act, render } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { ReminderBridge } from "@/reminders/reminder-bridge";

const mockSync = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock("@/reminders/sync", () => ({
  syncReminders: (...args: unknown[]) => mockSync(...args),
}));
jest.mock("expo-sqlite", () => ({ useSQLiteContext: () => ({}) }));
jest.mock("@/profile/profile-context", () => ({
  useProfile: () => ({
    state: { status: "ready", profile: { mode: "period" } },
  }),
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (href: unknown) => mockPush(href) },
}));
let mockResponse: unknown = null;
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  useLastNotificationResponse: () => mockResponse,
}));

let listener: ((s: AppStateStatus) => void) | null = null;
beforeEach(() => {
  mockSync.mockClear();
  mockPush.mockClear();
  mockResponse = null;
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_type, handler) => {
      listener = handler as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
});

describe("ReminderBridge", () => {
  it("reagenda ao montar, ao voltar ao app e ao sair dele (registros novos mudam a previsão)", async () => {
    await render(<ReminderBridge />);
    expect(mockSync).toHaveBeenCalledTimes(1);
    await act(async () => listener?.("background"));
    await act(async () => listener?.("active"));
    expect(mockSync).toHaveBeenCalledTimes(3);
  });

  it("tocar no lembrete de registro abre o registro de hoje", async () => {
    mockResponse = {
      actionIdentifier: "default",
      notification: {
        request: {
          identifier: "daily_log:2026-10-22",
          content: { data: { kind: "daily_log" } },
        },
      },
    };
    await render(<ReminderBridge />);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/^\/registro\/\d{4}-\d{2}-\d{2}$/),
    );
  });

  it("outros lembretes só abrem o app", async () => {
    mockResponse = {
      actionIdentifier: "default",
      notification: {
        request: {
          identifier: "period_due:2026-10-24",
          content: { data: { kind: "period_due" } },
        },
      },
    };
    await render(<ReminderBridge />);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
