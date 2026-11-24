import { useI18n } from "@/lib/i18n-context";
import { DateInput } from "@/components/app/DateInput";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "./ui";
import { signedUrl, type Row } from "@/lib/data";
import { clientFinancialSheet, emptyExportFilters, exportPeriodLabel, matchesExportFilter, type ExportFilters } from "@/lib/export-data";
import { toCsv, txToSheet } from "@/lib/export";
import { buildReportPdf } from "@/lib/export-report";
import { deliverFile } from "@/lib/download";
import { money } from "@/lib/format";

type Props = { kind: "clientes" | "despesas"; clients: Row<"clients">[]; transactions: Row<"transactions">[]; companies: Row<"companies">[]; systemName: string };

export function ExportSection({ kind, clients, transactions, companies, systemName }: Props) {
  const { tr, locale } = useI18n();
  const [filters, setFilters] = useState<ExportFilters>({ ...emptyExportFilters });
  const [files, setFiles] = useState<{ pdf: Blob; excel: Blob } | null>(null);
  const [error, setError] = useState("");
  const update = (key: keyof ExportFilters, value: string) => setFilters((old) => ({ ...old, [key]: value }));
  const company = companies.find((c) => c.name === filters.company);
  const companyNames = [...new Set([...companies.map((c) => c.name), ...clients.map((c) => c.company), ...transactions.map((t) => t.company)].filter((name): name is string => Boolean(name)))].sort();
  const invalid = Boolean((filters.from || filters.to) && (!filters.from || !filters.to || filters.from > filters.to));
  const selected = useMemo(() => kind === "clientes"
    ? clients.filter((c) => matchesExportFilter(c.company, c.created_at, filters)).map((c) => clientFinancialSheet(c, transactions))
    : transactions.filter((t) => t.type === "despesa" && matchesExportFilter(t.company, t.date || t.due_date || t.created_at, filters)).map(txToSheet), [kind, clients, transactions, filters]);
  const years = [...new Set([...clients.map((c) => c.created_at), ...transactions.map((t) => t.date || t.due_date || t.created_at)].map((d) => d.slice(0, 4)))].sort().reverse();
  useEffect(() => {
    let active = true;
    setFiles(null); setError("");
    if (invalid || !selected.length) return;
    const prepare = async () => {
      try {
        const logoUrl = company?.logo_url ? (company.logo_url.startsWith("https://") ? company.logo_url : await signedUrl(company.logo_url)) : null;
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(selected);
        sheet["!cols"] = Object.keys(selected[0] ?? {}).map((key) => ({ wch: Math.min(50, Math.max(18, key.length + 3)) }));
        XLSX.utils.book_append_sheet(wb, sheet, kind === "clientes" ? "Clientes" : "Despesas");
        const excel = new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const pdfRows = selected.map((row) => "Valor" in row && "Moeda" in row ? { ...row, Valor: money(Number(row.Valor), String(row.Moeda)) } : row);
        const pdf = await buildReportPdf({ title: tr("Relatório de {0}", [kind]), rows: pdfRows, company, logoUrl, period: exportPeriodLabel(filters), systemName: filters.company || systemName });
        if (active) setFiles({ pdf, excel });
      } catch { if (active) setError(tr("Não foi possível preparar os arquivos. Tente novamente ou confira a logo da empresa.")); }
    };
    void prepare();
    return () => { active = false; };
  }, [selected, company, filters, systemName, kind, invalid]);
  const filename = `${kind}${company ? `-${company.name.replace(/[^\p{L}\p{N}]+/gu, "-")}` : ""}`;
  return (
    <section className="border-b border-border py-5 first:pt-0" aria-label={`Exportar ${kind}`}>
      <h2 className="mb-4 text-base font-semibold">{tr("Exportar")} {tr(kind === "clientes" ? "Clientes" : "Despesas")}</h2>
      <div className="grid gap-4">
        <Field label={tr("Empresa")}><select className="field" value={filters.company} onChange={(e) => update("company", e.target.value)}><option value="">{tr("Todas as empresas")}</option>{companyNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("Mês")}><select className="field" value={filters.month} onChange={(e) => update("month", e.target.value)}><option value="">{tr("Todos os meses")}</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" })}</option>)}</select></Field>
          <Field label={tr("Ano")}><select className="field" value={filters.year} onChange={(e) => update("year", e.target.value)}><option value="">{tr("Todos os anos")}</option>{years.map((year) => <option key={year}>{year}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={tr("Período personalizado, De")}><DateInput value={filters.from} onChange={(e) => update("from", e.target.value)} /></Field>
          <Field label={tr("Até")}><DateInput value={filters.to} min={filters.from || undefined} onChange={(e) => update("to", e.target.value)} /></Field>
        </div>
        {invalid && <p className="text-sm text-destructive" role="alert">{tr("Preencha as duas datas, com a data final igual ou posterior à inicial.")}</p>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <p className="text-sm text-muted-foreground" aria-live="polite">{selected.length} {tr("registro(s) no arquivo")}{filters.from && filters.to && !invalid ? ` · ${exportPeriodLabel(filters)}` : ""}</p>
        <Button disabled={!files || invalid} onClick={() => files && void deliverFile(files.excel, `${filename}.xlsx`)}>{!files && selected.length > 0 && !invalid && !error ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{tr("Baixar Excel de")} {tr(kind === "clientes" ? "Clientes" : "Despesas")}</Button>
        <Button variant="outline" disabled={!files || invalid} onClick={() => files && void deliverFile(files.pdf, `${filename}.pdf`)}><FileText className="h-4 w-4" />{tr("Baixar PDF de")} {tr(kind === "clientes" ? "Clientes" : "Despesas")}</Button>
        <Button variant="outline" disabled={!selected.length || invalid} onClick={() => void deliverFile(new Blob([toCsv(selected)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`)}><Download className="h-4 w-4" />{tr("Baixar CSV de")} {tr(kind === "clientes" ? "Clientes" : "Despesas")}</Button>
      </div>
    </section>
  );
}