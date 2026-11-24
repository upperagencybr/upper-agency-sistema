import { describe, expect, it } from "vitest";
import { daysUntilRenewal, renewalLabel } from "@/lib/billing";
const now = Date.parse("2026-11-13T12:00:00Z");
describe("vencimento da assinatura", () => {
  it("conta dias até renovar", () => {
    expect(daysUntilRenewal({ status: "active", current_period_end: "2026-11-16T12:00:00Z" }, now)).toBe(3);
  });
  it("teste usa o fim do teste", () => {
    expect(daysUntilRenewal({ status: "trialing", trial_end: "2026-11-14T12:00:00Z", current_period_end: "2026-12-30T00:00:00Z" }, now)).toBe(1);
  });
  it("avisa quando faltam 3 dias ou menos", () => {
    expect(renewalLabel(3)).toBe("Ativa, vence em 3 dias");
    expect(renewalLabel(1)).toBe("Ativa, vence em 1 dia");
    expect(renewalLabel(4)).toBe("Ativa");
  });
});
