import type { Row } from "./data";
import { fmtDate, money } from "./format";

export type ExportFilters = { company: string; month: string; year: string; from: string; to: string };
export const emptyExportFilters: ExportFilters = { company: "", month: "", year: "", from: "", to: "" };

export function matchesExportFilter(company: string | null, date: string | null, filters: ExportFilters) {
  if (filters.company && company !== filters.company) return false;
  const day = date?.slice(0, 10) ?? "";
  if (filters.from && filters.to) return day >= filters.from && day <= filters.to;
  if (filters.year && day.slice(0, 4) !== filters.year) return false;
  if (filters.month && day.slice(5, 7) !== filters.month) return false;
  return true;
}

export function exportPeriodLabel(filters: ExportFilters) {
  if (filters.from && filters.to) return `${fmtDate(filters.from)} a ${fmtDate(filters.to)}`;
  const month = filters.month ? new Date(2000, Number(filters.month) - 1, 1).toLocaleDateString("pt-BR", { month: "long" }) : "Todos os meses";
  return !filters.month && !filters.year ? "Todos os períodos" : `${month}, ${filters.year || "todos os anos"}`;
}

export function clientFinancialSheet(client: Row<"clients">, transactions: Row<"transactions">[]) {
  const linked = transactions.filter((t) => t.type === "receita" && (t.client_id === client.id || (t.client_id === null && t.client_name === client.name && t.company === client.company)));
  const paid = linked.filter((t) => t.status === "pago");
  const pending = linked.filter((t) => t.status === "pendente" || t.status === "vencido");
  const totals = (rows: Row<"transactions">[]) => {
    const amounts = new Map<string, number>();
    for (const t of rows) amounts.set(t.currency, (amounts.get(t.currency) ?? 0) + Number(t.amount));
    return [...amounts].map(([currency, amount]) => money(amount, currency)).join("; ");
  };
  const counts = linked.map((t) => t.installment_count ?? 1);
  const paymentDates = [...new Set(paid.map((t) => t.paid_at).filter((d): d is string => Boolean(d)))].sort();
  const dates = linked.map((t) => t.date).filter((d): d is string => Boolean(d)).sort();
  return {
    Nome: client.name,
    "Data do cadastro": fmtDate(client.created_at),
    "E-mail": client.email ?? "",
    Telefone: client.phone ?? "",
    Endereço: client.address ?? "",
    Empresa: client.company ?? "",
    Etapa: ({ ativo: "Ativo", pausado: "Pausado", encerrado: "Encerrado" } as Record<string, string>)[client.status] ?? client.status,
    País: client.country ?? "",
    "Primeiro lançamento": fmtDate(dates[0]),
    Parcelas: counts.length ? `${Math.max(...counts)}x` : "",
    "Dia(s) que pagou": paymentDates.map(fmtDate).join(", "),
    "Tem parcela pendente": pending.length ? "Sim" : "Não",
    "Valor pendente": totals(pending),
    "Quanto já pagou": totals(paid),
    Observações: client.notes ?? "",
  };
}