import { describe, expect, it } from "vitest";
import { translateText, normalizeLang } from "../lib/i18n";
import { resolveStatusStages } from "../lib/status-lists";
import { whenLabel } from "../lib/notices";

describe("idioma da conta", () => {
  it("usa português para uma preferência desconhecida", () => {
    expect(normalizeLang("fr")).toBe("pt");
  });
  it("preserva valores interpolados sem traduzir nomes de registros", () => {
    expect(translateText("Prazo do projeto: {0}", "en", ["Negociação"])).toBe("Project deadline: Negociação");
  });
  it("traduz os padrões e mantém ids e nomes personalizados do CRM", () => {
    const stages = resolveStatusStages({ crm: [{ id: "lead", label: "Contato inicial" }, { id: "custom_1", label: "Validação" }] }, "crm", [], "en");
    expect(stages[0]).toEqual({ id: "lead", label: "Contato inicial" });
    expect(stages.find(s => s.id === "negociacao")).toEqual({ id: "negociacao", label: "Negotiation" });
    expect(stages.at(-1)).toEqual({ id: "custom_1", label: "Validação" });
  });
  it("mantém os dias reais dos lembretes ao trocar de idioma", () => {
    expect(whenLabel(3, "en")).toBe("3 days remaining");
    expect(whenLabel(-1, "es")).toBe("Vencido hace 1 día");
  });
});