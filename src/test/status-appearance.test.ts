import { describe, expect, it } from "vitest";
import { statusAppearance } from "../lib/status-appearance";

describe("indicadores de situação", () => {
  it("aceita qualquer cor hexadecimal válida", () => {
    expect(statusAppearance({ crm: { lead: { color: "#123abc" } } }, "crm", "lead").color).toBe("#123abc");
    expect(statusAppearance({ crm: { lead: { color: "invalid" } } }, "crm", "lead").color).toBe("neutral");
  });
  it("salva porcentagem em todos os tipos", () => {
    for (const type of ["empty", "dotted", "progress", "complete", "cancelled"]) {
      expect(statusAppearance({ clients: { ativo: { type, progress: 37 } } }, "clients", "ativo").progress).toBe(37);
    }
  });
  it("preenche conforme a progressão do CRM", () => {
    expect(statusAppearance({}, "crm", "lead").progress).toBe(0);
    expect(statusAppearance({}, "crm", "negociacao").progress).toBe(50);
    expect(statusAppearance({}, "crm", "fechado").progress).toBe(100);
  });
  it("mantém cor e tipo personalizados separados por aba", () => {
    const prefs = { crm: { lead: { color: "red", type: "progress", progress: 25 } } };
    expect(statusAppearance(prefs, "crm", "lead")).toEqual({ color: "red", type: "progress", progress: 25 });
    expect(statusAppearance(prefs, "clients", "ativo").color).toBe("green");
  });
  it("aceita preferências vazias e limita o preenchimento", () => {
    expect(statusAppearance(null, "clients", "pausado").type).toBe("empty");
    expect(statusAppearance({ crm: { lead: { progress: 200 } } }, "crm", "lead").progress).toBe(100);
  });
});