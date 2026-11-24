import { describe, expect, it } from "vitest";
import { clientFinancialSheet, emptyExportFilters, matchesExportFilter } from "@/lib/export-data";
import type { Row } from "@/lib/data";

describe("filtros de exportação", () => {
  it("filtra empresa, mês e ano", () => {
    const filters = { ...emptyExportFilters, company: "Upper", month: "11", year: "2026" };
    expect(matchesExportFilter("Upper", "2026-11-12", filters)).toBe(true);
    expect(matchesExportFilter("Outra", "2026-11-12", filters)).toBe(false);
    expect(matchesExportFilter("Upper", "2026-10-12", filters)).toBe(false);
    expect(matchesExportFilter("Upper", "2025-11-12", filters)).toBe(false);
  });
  it("período personalizado ignora mês e ano e inclui as duas datas", () => {
    const filters = { ...emptyExportFilters, month: "01", year: "2025", from: "2026-11-01", to: "2026-11-12" };
    expect(matchesExportFilter(null, "2026-11-01", filters)).toBe(true);
    expect(matchesExportFilter(null, "2026-11-12", filters)).toBe(true);
    expect(matchesExportFilter(null, "2026-11-13", filters)).toBe(false);
  });
});
describe("financeiro de clientes", () => {
  it("inclui parcelas, datas pagas e totais separados por moeda sem incluir despesas ou outro cliente", () => {
    const client = { id: 1, name: "Cliente", company: "Upper", created_at: "2026-11-01", status: "ativo" } as Row<"clients">;
    const tx = (amount: number, currency: string, status: string, patch = {}) => ({ client_id: 1, amount, currency, status, type: "receita", date: "2026-11-02", paid_at: "2026-11-10", installment_count: 2, ...patch }) as Row<"transactions">;
    const report = clientFinancialSheet(client, [tx(52, "BRL", "pago"), tx(52, "BRL", "pendente"), tx(10, "USD", "pago"), tx(900, "BRL", "pago", { type: "despesa" }), tx(800, "BRL", "pago", { client_id: 2 })]);
    expect(report.Parcelas).toBe("2x");
    expect(report["Dia(s) que pagou"]).toBe("10/11/2026");
    expect(report["Tem parcela pendente"]).toBe("Sim");
    expect(report["Valor pendente"]).toContain("52,00");
    expect(report["Quanto já pagou"]).toContain("52,00");
    expect(report["Quanto já pagou"]).toContain("10,00");
    expect(report["Quanto já pagou"]).not.toContain("900");
    expect(report["Quanto já pagou"]).not.toContain("800");
  });
});