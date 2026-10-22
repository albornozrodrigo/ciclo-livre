import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LembretesScreen from "@/app/lembretes/index";
import LembreteScreen from "@/app/lembretes/[tipo]";
import { openMemoryDatabase } from "@/db/__tests__/node-sqlite-adapter";
import { MIGRATIONS, runMigrations } from "@/db/migrations";
import { getDiscreet, listReminders } from "@/db/reminder-repo";
import type { Profile } from "@/domain/profile";
import { ptBR } from "@/i18n/pt-BR";
import { REMINDER_NAMES } from "@/i18n/pt-BR-reminders";

const r = ptBR.reminders;

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock("expo-sqlite", () => ({ useSQLiteContext: () => mockDb }));
let mockProfile: Profile;
jest.mock("@/profile/profile-context", () => ({
  useProfile: () => ({ state: { status: "ready", profile: mockProfile } }),
}));
let mockTipo = "period_soon";
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: () => mockBack(), canGoBack: () => true },
  useLocalSearchParams: () => ({ tipo: mockTipo }),
  useFocusEffect: (effect: () => void) =>
    jest.requireActual("react").useEffect(effect, [effect]),
}));
jest.mock("@/components/ui/snackbar", () => ({
  useSnackbar: () => ({ show: jest.fn() }),
}));
let mockGranted = false;
let mockGrantOnRequest = true;
jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({
    granted: mockGranted,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => {
    mockGranted = mockGrantOnRequest;
    return { granted: mockGranted, canAskAgain: false };
  }),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => "id"),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};
const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>
);

let mockOpenSettings: jest.SpyInstance;
beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockGranted = false;
  mockGrantOnRequest = true;
  mockTipo = "period_soon";
  mockBack.mockClear();
  mockOpenSettings = jest
    .spyOn(Linking, "openSettings")
    .mockResolvedValue(undefined);
  mockProfile = {
    birthYear: 1995,
    mode: "period",
    lastPeriodStart: "2026-10-12",
    periodLength: 5,
    cycleLength: 28,
    regularity: "unknown",
    dueDate: null,
    tryingSince: null,
    birthControl: "pill",
  };
});

const reminder = async (kind: string) =>
  (await listReminders(mockDb)).find((x) => x.kind === kind)!;

describe("Lembretes (lista)", () => {
  it("mostra só os tipos do modo, com a janela fértil liberada", async () => {
    await render(wrap(<LembretesScreen />));
    expect(
      await screen.findByRole("switch", { name: REMINDER_NAMES.fertile_soon }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("switch", { name: REMINDER_NAMES.birth_control }),
    ).toBeOnTheScreen();

    mockProfile = { ...mockProfile, mode: "pregnancy", dueDate: "2027-03-01" };
    await render(wrap(<LembretesScreen />));
    expect(
      await screen.findByRole("switch", { name: REMINDER_NAMES.daily_log }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("switch", { name: REMINDER_NAMES.fertile_soon }),
    ).toBeNull();
  });

  it("ligar pede a permissão e salva ligado", async () => {
    await render(wrap(<LembretesScreen />));
    await fireEvent(
      await screen.findByRole("switch", { name: REMINDER_NAMES.period_due }),
      "valueChange",
      true,
    );
    expect((await reminder("period_due")).enabled).toBe(true);
  });

  it("permissão negada: explica, oferece os ajustes e não liga", async () => {
    mockGrantOnRequest = false;
    await render(wrap(<LembretesScreen />));
    await fireEvent(
      await screen.findByRole("switch", { name: REMINDER_NAMES.period_due }),
      "valueChange",
      true,
    );

    expect(await screen.findByText(r.denied)).toBeOnTheScreen();
    expect((await reminder("period_due")).enabled).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: r.openSettings }));
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it("notificações discretas salvam", async () => {
    await render(wrap(<LembretesScreen />));
    await fireEvent(
      await screen.findByRole("switch", { name: r.discreet }),
      "valueChange",
      true,
    );
    expect(await getDiscreet(mockDb)).toBe(true);
  });
});

describe("Lembrete (detalhe)", () => {
  it("ajusta dias antes e a mensagem; salva e volta", async () => {
    mockGranted = true;
    await render(wrap(<LembreteScreen />));
    await fireEvent.press(
      await screen.findByRole("button", { name: r.daysBeforeIncrease }),
    );
    await fireEvent.changeText(screen.getByLabelText(r.titleLabel), "Atenção");
    await fireEvent.press(screen.getByRole("button", { name: r.save }));

    const saved = await reminder("period_soon");
    expect(saved.options.daysBefore).toBe(3);
    expect(saved.title).toBe("Atenção");
    expect(mockBack).toHaveBeenCalled();
  });

  it("prévia mostra o texto que vai aparecer", async () => {
    await render(wrap(<LembreteScreen />));
    expect(await screen.findByText(/deve vir em 2 dias/)).toBeOnTheScreen();
  });

  it("janela fértil avisa que não é contracepção", async () => {
    mockTipo = "fertile_soon";
    await render(wrap(<LembreteScreen />));
    expect(await screen.findByText(r.notContraception)).toBeOnTheScreen();
  });

  it("pílula 21+7 ligada sem início da cartela não salva", async () => {
    mockTipo = "birth_control";
    mockGranted = true;
    await render(wrap(<LembreteScreen />));
    await fireEvent(
      await screen.findByRole("switch", { name: r.enabled }),
      "valueChange",
      true,
    );
    expect(screen.getByRole("button", { name: r.save })).toBeDisabled();
    expect(screen.getByText(r.anchorNeeded)).toBeOnTheScreen();
  });

  it("mensagem longa demais mostra o erro em pt-BR e não salva", async () => {
    await render(wrap(<LembreteScreen />));
    await fireEvent.changeText(
      await screen.findByLabelText(r.titleLabel),
      "x".repeat(41),
    );
    await fireEvent.press(screen.getByRole("button", { name: r.save }));
    expect(screen.getByText(r.titleTooLong)).toBeOnTheScreen();
    expect((await reminder("period_soon")).title).toBeNull();
  });
});
