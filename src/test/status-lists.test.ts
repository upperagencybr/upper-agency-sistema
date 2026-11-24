import { describe, expect, it } from "vitest";
import { resolveStatusStages } from "../lib/status-lists";

describe("etapas personalizadas", () => {
  it("edita o nome sem modificar a identificação dos registros", () => {
    const stages = resolveStatusStages({ crm: [{ id: "lead", label: "Novo contato" }] }, "crm");
    expect(stages[0]).toEqual({ id: "lead", label: "Novo contato" });
    expect(stages.some((s) => s.id === "fechado")).toBe(true);
  });
  it("adiciona situações aos clientes sem apagar as existentes", () => {
    const stages = resolveStatusStages({ clients: [{ id: "custom_1", label: "Em implantação" }] }, "clients");
    expect(stages.map((s) => s.id)).toEqual(["ativo", "pausado", "encerrado", "custom_1"]);
  });
  it("preserva etapas presentes nos registros mesmo sem preferência", () => {
    expect(resolveStatusStages({}, "crm", ["custom_equipe"]).at(-1)).toEqual({ id: "custom_equipe", label: "custom_equipe" });
  });
});