import type { Row } from "./data";
import { fmtDate } from "./format";
import { downloadBlob } from "./download";

export async function exportExcel(rows: Record<string, unknown>[], sheet: string, file: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, file);
}

// CSV no formato do Excel em português do Brasil: separador ";", decimal com vírgula,
// BOM UTF-8 (para acentos) e quebras CRLF.
export function toCsv(rows: Record<string, unknown>[]) {
  const first = rows[0];
  if (!first) return "";
  const headers = Object.keys(first);
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" && Number.isFinite(v) ? v.toFixed(2).replace(".", ",") : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(cell).join(";"), ...rows.map((r) => headers.map((h) => cell(r[h])).join(";"))];
  return "\uFEFF" + lines.join("\r\n");
}

export function exportCsv(rows: Record<string, unknown>[], file: string) {
  if (!rows.length) return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, file.endsWith(".csv") ? file : file.replace(/\.\w+$/, "") + ".csv");
}

export const txToSheet = (t: Row<"transactions">) => ({
  Descrição: t.description, Tipo: t.type, Categoria: t.category, Valor: Number(t.amount), Moeda: t.currency,
  Vencimento: fmtDate(t.due_date || t.date), Situação: t.status, "Data da baixa": fmtDate(t.paid_at),
  Cliente: t.client_name, Empresa: t.company,
  Parcela: t.installment_count ? `${t.installment_index}/${t.installment_count}` : "",
});

export const clientToSheet = (c: Row<"clients">) => ({
  Nome: c.name, Empresa: c.company, País: c.country, "E-mail": c.email, Telefone: c.phone, Endereço: c.address, Situação: c.status,
});

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
}

export async function exportClientsPdf(clients: Row<"clients">[], company: Row<"companies"> | undefined, logoUrl: string | null) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  let x = 14;
  if (logoUrl) {
    try {
      const data = await toDataUrl(logoUrl);
      doc.addImage(data, 14, 10, 18, 18);
      x = 36;
    } catch { /* logo optional */ }
  }
  doc.setFontSize(14);
  doc.text(company?.legal_name || company?.name || "Clientes", x, 17);
  doc.setFontSize(9);
  if (company?.tax_id) doc.text(`CNPJ: ${company.tax_id}`, x, 23);
  autoTable(doc, {
    startY: 34,
    head: [["Nome", "Empresa", "País", "E-mail", "Telefone"]],
    body: clients.map((c) => [c.name, c.company ?? "", c.country ?? "", c.email ?? "", c.phone ?? ""]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 20, 20] },
  });
  doc.save(`clientes${company ? "-" + company.name : ""}.pdf`);
}
