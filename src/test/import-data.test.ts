import { describe, expect, it } from "vitest";
import { detectColumns, parseImportAmount, parseImportDate, prepareImport, readImportFile, type ImportSheet } from "../lib/import-data";
import { zipSync, strToU8 } from "fflate";
import * as XLSX from "xlsx";

const sheet: ImportSheet = { name: "Clientes", headers: ["Nome", "E-mail", "user_id", "id"], rows: [{ Nome: "Cliente importado", "E-mail": "cliente@example.test", user_id: "outro-dono", id: 123 }] };
describe("importação de planilhas", () => {
  it("identifica colunas e não importa identidade ou dono do arquivo", () => {
    const map = detectColumns(sheet, "clients");
    expect(map["name"]).toBe("Nome");
    const result = prepareImport(sheet, { kind: "clients", map, company: "Empresa escolhida", currency: "BRL", type: "receita" });
    expect(result[0]?.data).toMatchObject({ name: "Cliente importado", company: "Empresa escolhida", status: "ativo" });
    expect(result[0]?.data).not.toHaveProperty("user_id");
    expect(result[0]?.data).not.toHaveProperty("id");
  });
  it("ignora duplicatas sem alterar clientes existentes", () => {
    const doubled = { ...sheet, rows: [...sheet.rows, ...sheet.rows] };
    const result = prepareImport(doubled, { kind: "clients", map: detectColumns(sheet, "clients"), company: "Empresa", currency: "BRL", type: "receita" });
    expect(result.map(r => r.duplicate)).toEqual([false, true]);
  });
  it("lê valores brasileiros e internacionais sem mudar a moeda", () => {
    expect(parseImportAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseImportAmount("$1,234.56")).toBe(1234.56);
    expect(parseImportAmount("(45,00)")).toBe(-45);
    expect(parseImportAmount("abc")).toBeNull();
  });
  it("valida datas e rejeita dias inexistentes", () => {
    expect(parseImportDate("14/11/2026")).toBe("2026-11-14");
    expect(parseImportDate("31/02/2026")).toBeNull();
    expect(parseImportDate(46000)).toBe("2025-12-09");
  });
  it("preserva receita, valor, moeda e vencimento do financeiro", () => {
    const finance = { name: "Financeiro", headers: ["Descrição", "Valor", "Tipo", "Moeda", "Vencimento"], rows: [{ "Descrição": "Serviço", Valor: "1.234,56", Tipo: "receita", Moeda: "EUR", Vencimento: "14/11/2026" }] };
    const row = prepareImport(finance, { kind: "transactions", map: detectColumns(finance, "transactions"), company: "Empresa", currency: "BRL", type: "despesa" })[0];
    expect(row?.error).toBeNull();
    expect(row?.data).toMatchObject({ amount: 1234.56, currency: "EUR", type: "receita", due_date: "2026-11-14", status: "pendente" });
  });
  it("lê Excel dentro de ZIP, sem executar outros arquivos", async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([{ Nome: "Arquivo de teste", Email: "teste@example.test" }]), "Clientes");
    const zip = zipSync({ "export/clientes.xlsx": new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" })), "script.js": strToU8("throw new Error('never execute')") });
    const file = { name: "export.zip", size: zip.length, arrayBuffer: async () => zip.buffer } as File;
    const result = await readImportFile(file);
    expect(result).toHaveLength(1);
    expect(result[0]?.rows[0]?.["Nome"]).toBe("Arquivo de teste");
  });
});