import { MESSAGE_LIMITS, validateMessage } from "@/domain/reminders/message";

describe("validateMessage", () => {
  it("apara espaços; vazio volta ao padrão (null)", () => {
    expect(validateMessage("  Oi  ", "   ")).toEqual({
      ok: true,
      title: "Oi",
      body: null,
    });
  });

  it("título até 40 e texto até 100 caracteres", () => {
    expect(
      validateMessage(
        "a".repeat(MESSAGE_LIMITS.title),
        "b".repeat(MESSAGE_LIMITS.body),
      ).ok,
    ).toBe(true);
    expect(validateMessage("a".repeat(41), "b".repeat(101))).toEqual({
      ok: false,
      errors: { title: "too_long", body: "too_long" },
    });
  });
});
