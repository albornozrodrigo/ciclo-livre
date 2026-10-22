import { defaultReminder } from "@/domain/reminders/catalog";
import { reminderContent } from "@/i18n/pt-BR-reminders";

describe("reminderContent", () => {
  it("texto padrão por variante, com os dias antes", () => {
    const r = {
      ...defaultReminder("period_soon"),
      options: { ...defaultReminder("period_soon").options, daysBefore: 3 },
    };
    expect(reminderContent(r, "period_soon", false).body).toContain("3 dias");
  });

  it("janela fértil sempre lembra que não é contracepção", () => {
    expect(
      reminderContent(defaultReminder("fertile_soon"), "fertile_soon", false)
        .body,
    ).toMatch(/não serve como contracep/);
  });

  it("mensagem própria substitui a padrão", () => {
    const r = {
      ...defaultReminder("daily_log"),
      title: "Diário",
      body: "Bora registrar",
    };
    expect(reminderContent(r, "daily_log", false)).toEqual({
      title: "Diário",
      body: "Bora registrar",
    });
  });

  it("discreto: neutro, sem dado de saúde, mesmo com mensagem própria", () => {
    const r = { ...defaultReminder("period_due"), title: "Menstruação hoje" };
    expect(reminderContent(r, "period_due", true)).toEqual({
      title: "Ciclo Livre",
      body: "Você tem um lembrete.",
    });
  });
});
