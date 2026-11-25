import { useI18n } from "@/lib/i18n-context";
import { useAccess } from "@/lib/team";
import { DateInput } from "@/components/app/DateInput";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Check, Download, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useRows, useTableMutations, type Insert, type Row } from "@/lib/data";
import { CURRENCIES, addDays, addMonths, daysUntil, fmtDate, money, todayStr } from "@/lib/format";
import { exportCsv, exportExcel, txToSheet } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Empty as UiEmpty, Field as UiField, Modal as UiModal, PageHeader } from "@/components/app/ui";
import type { ReactNode } from "react";
import { MonthNav } from "@/components/app/PeriodNav";
import { ClientSelect } from "@/components/app/ClientSelect";
import { CompanySelect } from "@/components/app/CompanySelect";
import { OptionSelect } from "@/components/app/OptionSelect";
import { CreatedBy, PersonFilter, PersonSelect, TagBadges, TagFilter, TagPicker, byPerson, hasTag } from "@/components/app/team";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Financeiro | NEXO HUB" },
      { name: "description", content: "Receitas e despesas com moeda, parcelas e recorrência." },
      { property: "og:title", content: "Financeiro | NEXO HUB" },
      { property: "og:description", content: "Receitas e despesas." },
    ],
  }),
  component: Financeiro,
});

function Empty({ children }: { children?: ReactNode }) {
  return <UiEmpty children={children} />;
}

function Field({ label, children, className = "" }: { label: string; children?: ReactNode; className?: string }) {
  return <UiField label={label} className={className} children={children} />;
}

function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children?: ReactNode; wide?: boolean }) {
  return <UiModal open={open} onClose={onClose} title={title} wide={wide} children={children} />;
}

type Tx = Row<"transactions">;
const TABS = [
  { id: "mes", label: "Pendentes neste mês" },
  { id: "pend", label: "Pendentes geral" },
  { id: "pago", label: "Pagos" },
  { id: "todos", label: "Todos" },
] as const;

type Form = Partial<Tx> & { installments?: number; recurrence?: string; recurrenceTimes?: number };

type TxGroup = { key: string; label: string; items: Tx[]; rec: number; desp: number };

/** Groups transactions by due month/year, newest month first. Subtotals only count `currency`. */
function groupByMonth(list: Tx[], currency: string, dueOf: (t: Tx) => string): TxGroup[] {
  const map = new Map<string, TxGroup>();
  for (const t of list) {
    const key = (dueOf(t) || "").slice(0, 7);
    if (!key) continue;
    let g = map.get(key);
    if (!g) {
      const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${key}-01T00:00:00`));
      g = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [], rec: 0, desp: 0 };
      map.set(key, g);
    }
    g.items.push(t);
    if (t.currency === currency) { if (t.type === "receita") g.rec += Number(t.amount); else g.desp += Number(t.amount); }
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** Groups transactions by company A-Z; rows without a company go last. Subtotals only count `currency`. */
function groupByCompany(list: Tx[], currency: string): TxGroup[] {
  const map = new Map<string, TxGroup>();
  for (const t of list) {
    const name = (t.company || "").trim() || null;
    const key = name ? name.toLocaleLowerCase("pt-BR") : "\u0000none";
    let g = map.get(key);
    if (!g) { g = { key, label: name ?? "Sem empresa", items: [], rec: 0, desp: 0 }; map.set(key, g); }
    g.items.push(t);
    if (t.currency === currency) { if (t.type === "receita") g.rec += Number(t.amount); else g.desp += Number(t.amount); }
  }
  return [...map.values()].sort((a, b) => !a.label || a.label === "Sem empresa" ? 1 : !b.label || b.label === "Sem empresa" ? -1 : a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function Financeiro() {
  const { tr } = useI18n();
  const { canExport } = useAccess();
  const { data: txs = [] } = useRows("transactions");
  const { data: clients = [] } = useRows("clients");
  const { data: companies = [] } = useRows("companies");
  const m = useTableMutations("transactions");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("mes");
  const [type, setType] = useState<"" | "receita" | "despesa">("");
  const [edit, setEdit] = useState<Form | null>(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [fTag, setFTag] = useState("");
  const [fBy, setFBy] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "mesano" | "empresa">("lista");
  const curList = useMemo(() => { const c: Record<string, number> = {}; txs.forEach((t) => (c[t.currency] = (c[t.currency] ?? 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k); }, [txs]);
  const [curSel, setCurSel] = useState("");
  const kcur = curSel || curList[0] || "USD";
  const activeClients = clients.filter((c) => (c.status || "ativo") === "ativo").length;
  const due = (t: Tx) => t.due_date || t.date || "";

  const list = useMemo(() => txs
    .filter((t) => !type || t.type === type)
    .filter((t) => hasTag(t.tag_ids, fTag) && byPerson(t, fBy))
    .filter((t) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      const currentClientName = clients.find((c) => c.id === t.client_id)?.name;
      return [t.client_name, currentClientName].some((name) => name?.toLowerCase().includes(query));
    })
    .filter((t) => tab === "todos" ? true : tab === "pago" ? t.status === "pago"
      : t.status !== "pago" && (tab === "pend" || due(t).startsWith(month)))
    .sort((a, b) => due(a).localeCompare(due(b))), [txs, tab, type, month, fTag, fBy, q, clients]);

  const totals = useMemo(() => {
    const r: Record<string, { rec: number; desp: number }> = {};
    for (const t of list) {
      const k = t.currency; r[k] ??= { rec: 0, desp: 0 };
      if (t.type === "receita") r[k].rec += Number(t.amount); else r[k].desp += Number(t.amount);
    }
    return r;
  }, [list]);

  const save = async () => {
    if (!edit?.description || !edit.amount) { toast.error(tr("Informe descrição e valor")); return; }
    const { id, user_id: _u, created_at: _c, installments, recurrence, recurrenceTimes, ...rest } = edit as Form & Tx;
    const client = clients.find((c) => c.id === rest.client_id);
    rest.client_name = client?.name ?? null;
    rest.due_date = rest.due_date || rest.date || todayStr();
    rest.date = rest.due_date;
    if (id) {
      await m.update.mutateAsync({ id, ...rest });
    } else {
      const rows: Insert<"transactions">[] = [];
      const n = Math.max(1, Number(installments) || 1);
      const r = Math.max(1, Number(recurrenceTimes) || 1);
      if (n > 1) {
        const group = crypto.randomUUID();
        const per = Math.round((Number(rest.amount) / n) * 100) / 100;
        for (let i = 0; i < n; i++) {
          const d = addMonths(rest.due_date, i);
          rows.push({ ...rest, amount: per, date: d, due_date: d, description: `${rest.description} (${i + 1}/${n})`, installment_count: n, installment_index: i + 1, installment_group: group });
        }
      } else if (recurrence && r > 1) {
        const group = crypto.randomUUID();
        for (let i = 0; i < r; i++) {
          const d = recurrence === "semanal" ? addDays(rest.due_date, 7 * i) : recurrence === "anual" ? addMonths(rest.due_date, 12 * i) : addMonths(rest.due_date, i);
          rows.push({ ...rest, date: d, due_date: d, recurrence_freq: recurrence, recurrence_count: r, recurrence_index: i + 1, recurrence_group: group });
        }
      } else rows.push(rest);
      await m.insert.mutateAsync(rows);
    }
    setEdit(null);
  };

  const togglePaid = (t: Tx) =>
    m.update.mutate(t.status === "pago" ? { id: t.id, status: "pendente", paid_at: null } : { id: t.id, status: "pago", paid_at: todayStr() });

  const renderRow = (t: Tx) => {
                const late = t.status !== "pago" && daysUntil(due(t)) < 0;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap p-3">{fmtDate(due(t))}</td>
                    <td className="max-w-xs cursor-pointer p-3 hover:text-primary" onClick={() => setEdit(t)}>{t.description} <TagBadges ids={t.tag_ids} /></td>
                    <td className="p-3 text-muted-foreground">{[t.client_name, t.company].filter(Boolean).join(" · ")}</td>
                    <td className="p-3 text-muted-foreground">{t.category}</td>
                    <td className={`whitespace-nowrap p-3 text-right font-medium ${t.type === "receita" ? "text-success" : "text-destructive"}`}>{t.type === "despesa" ? "- " : ""}{money(t.amount, t.currency)}</td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      {t.status === "pago" ? <span className="text-success">{tr("Pago")} {t.paid_at ? fmtDate(t.paid_at) : ""}</span> : late ? <span className="text-destructive">{tr("Vencido")}</span> : <span className="text-warning">{tr("Pendente")}</span>}
                    </td>
                    <td className="p-3"><CreatedBy createdBy={t.created_by} owner={t.user_id} withName /></td>
                    <td className="p-3">
                      <button aria-label={t.status === "pago" ? tr("Desfazer baixa") : tr("Marcar como pago")} onClick={() => togglePaid(t)}
                        className="rounded border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                        {t.status === "pago" ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              };
  const head = (
    <thead className="text-left text-xs text-muted-foreground">
      <tr className="border-b border-border">
        <th className="p-3">{tr("Vencimento")}</th><th className="p-3">{tr("Descrição")}</th><th className="p-3">{tr("Cliente / Empresa")}</th><th className="p-3">{tr("Categoria")}</th><th className="p-3 text-right">{tr("Valor")}</th><th className="p-3">{tr("Situação")}</th><th className="p-3">{tr("Lançado por")}</th><th className="p-3" />
      </tr>
    </thead>
  );
  const groups = useMemo(() => view === "mesano" ? groupByMonth(list, kcur, due) : view === "empresa" ? groupByCompany(list, kcur) : [], [view, list, kcur]);

  return (
    <div>
      <PageHeader title={tr("Financeiro")} sub={tr("{0} lançamentos", [txs.length])}
        actions={<>
          {canExport && <><Button variant="outline" onClick={() => exportExcel(list.map(txToSheet), "Financeiro", `financeiro-${tab}.xlsx`)}><Download className="h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => exportCsv(list.map(txToSheet), `financeiro-${tab}.csv`)}><Download className="h-4 w-4" />CSV</Button></>}
          <Button onClick={() => setEdit({ type: "receita", currency: "BRL", status: "pendente", due_date: todayStr() })}><Plus className="h-4 w-4" />{tr("Novo lançamento")}</Button>
        </>} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="panel px-3 py-1.5 text-sm"><b>{activeClients}</b> <span className="text-muted-foreground">{tr("Clientes ativos")}</span></span>
        <div className="ml-auto flex items-center gap-2">
          <select aria-label={tr("Moeda")} className="field h-8 w-auto text-xs" value={kcur} onChange={(e) => setCurSel(e.target.value)}>{(curList.length ? curList : ["USD"]).map((c) => <option key={c}>{c}</option>)}</select>
          <MonthNav value={month} onChange={setMonth} />
        </div>
      </div>
      {(() => {
        const k = txs.filter((t) => t.currency === kcur);
        const s = (a: Tx[]) => a.reduce((x, t) => x + Number(t.amount), 0);
        const paidIn = (t: Tx) => t.status === "pago" && (t.paid_at || due(t)).startsWith(month);
        const recM = s(k.filter((t) => t.type === "receita" && paidIn(t)));
        const despM = s(k.filter((t) => t.type === "despesa" && paidIn(t)));
        const pendM = s(k.filter((t) => t.status !== "pago" && due(t).startsWith(month)));
        const pendG = s(k.filter((t) => t.status !== "pago"));
        const cards = [["Receitas do mês", recM, "text-success"], ["Despesas do mês", despM, "text-destructive"], ["Saldo do mês", recM - despM, recM - despM >= 0 ? "text-success" : "text-destructive"], ["Pendentes neste mês", pendM, "text-warning"], ["Pendentes (geral)", pendG, "text-warning"]] as const;
        return (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {cards.map(([l, v, c]) => <div key={l} className="panel p-4"><div className="kpi-label">{tr(l)}</div><div className={`mt-2 text-xl font-bold ${c}`}>{money(v, kcur)}</div></div>)}
          </div>
        );
      })()}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => <button key={t.id} className="chip" data-on={tab === t.id} onClick={() => setTab(t.id)}>{tr(t.label)}</button>)}
        <span className="mx-1 h-4 w-px bg-border" />
        <button className="chip" data-on={type === "receita"} onClick={() => setType(type === "receita" ? "" : "receita")}>{tr("Receitas")}</button>
        <button className="chip" data-on={type === "despesa"} onClick={() => setType(type === "despesa" ? "" : "despesa")}>{tr("Despesas")}</button>
        <input className="field h-8 w-48 text-xs" placeholder={tr("Buscar por nome do cliente")} value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="mx-1 h-4 w-px bg-border" />
        <div role="group" aria-label={tr("Visualização")} className="flex gap-1">
          <button className="chip" data-on={view === "lista"} onClick={() => setView("lista")}>{tr("Lista")}</button>
          <button className="chip" data-on={view === "mesano"} onClick={() => setView("mesano")}>{tr("Por mês e ano")}</button>
          <button className="chip" data-on={view === "empresa"} onClick={() => setView("empresa")}>{tr("Por empresa")}</button>
        </div>
        <div className="ml-auto flex gap-2"><TagFilter value={fTag} onChange={setFTag} /><PersonFilter value={fBy} onChange={setFBy} /></div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(totals).map(([cur, v]) => (
          <div key={cur} className="panel px-4 py-3 text-sm">
            <span className="kpi-label">{cur}</span>
            <div className="mt-1 flex gap-4"><span className="text-success">+ {money(v.rec, cur)}</span><span className="text-destructive">- {money(v.desp, cur)}</span></div>
          </div>
        ))}
      </div>
      {list.length === 0 ? <Empty>{tr("Nada por aqui.")}</Empty> : view !== "lista" ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="panel overflow-x-auto">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                <h3 className="font-semibold">{g.label}</h3>
                <span className="text-xs text-muted-foreground">{tr("{0} lançamentos", [g.items.length])}</span>
                <div className="ml-auto flex gap-4 text-sm"><span className="text-success">+ {money(g.rec, kcur)}</span><span className="text-destructive">- {money(g.desp, kcur)}</span></div>
              </div>
              <table className="w-full text-sm">{head}<tbody>{g.items.map(renderRow)}</tbody></table>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">{head}<tbody>{list.map(renderRow)}</tbody></table>
        </div>
      )}

      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tr("Editar lançamento") : tr("Novo lançamento")}>
        {edit && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label={tr("Tipo")}><select className="field" value={edit.type ?? "receita"} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="receita">{tr("Receita")}</option><option value="despesa">{tr("Despesa")}</option></select></Field>
            <Field label={tr("Descrição")} className="md:col-span-2"><input className="field" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label={tr("Valor total")}><input type="number" step="0.01" className="field" value={edit.amount ?? ""} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })} /></Field>
            <Field label={tr("Moeda")}><select className="field" value={edit.currency ?? "BRL"} onChange={(e) => setEdit({ ...edit, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label={tr("Vencimento")}><DateInput value={edit.due_date ?? ""} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} /></Field>
            <ClientSelect value={edit.client_id} placeholder={tr("Nenhum")} company={edit.company} onChange={(client_id) => setEdit({ ...edit, client_id })} />
            <CompanySelect placeholder={tr("Nenhuma")} value={edit.company} onChange={(company) => setEdit({ ...edit, company })} />
            <OptionSelect label={tr("Categoria")} list="tx_categories" value={edit.category} onChange={(category) => setEdit({ ...edit, category })} />
            <Field label={tr("Situação")}><select className="field" value={edit.status ?? "pendente"} onChange={(e) => setEdit({ ...edit, status: e.target.value, paid_at: e.target.value === "pago" ? edit.paid_at || todayStr() : null })}><option value="pendente">{tr("Pendente")}</option><option value="pago">{tr("Pago")}</option></select></Field>
            {edit.status === "pago" && <Field label={tr("Data da baixa")}><DateInput value={edit.paid_at ?? ""} onChange={(e) => setEdit({ ...edit, paid_at: e.target.value })} /></Field>}
            {!edit.id && (
              <>
                <Field label={tr("Parcelas (1 por mês)")}><input type="number" min={1} className="field" value={edit.installments ?? 1} onChange={(e) => setEdit({ ...edit, installments: Number(e.target.value) })} /></Field>
                <Field label={tr("Recorrência")}><select className="field" value={edit.recurrence ?? ""} onChange={(e) => setEdit({ ...edit, recurrence: e.target.value })}><option value="">{tr("Nenhuma")}</option><option value="semanal">{tr("Semanal")}</option><option value="mensal">{tr("Mensal")}</option><option value="anual">{tr("Anual")}</option></select></Field>
                {edit.recurrence && <Field label={tr("Quantas vezes")}><input type="number" min={1} className="field" value={edit.recurrenceTimes ?? 12} onChange={(e) => setEdit({ ...edit, recurrenceTimes: Number(e.target.value) })} /></Field>}
              </>
            )}
            <PersonSelect value={edit.created_by} owner={edit.user_id} onChange={(created_by) => setEdit({ ...edit, created_by })} />
            <TagPicker className="col-span-full" value={edit.tag_ids} onChange={(tag_ids) => setEdit({ ...edit, tag_ids })} />
            {edit.installment_count ? <p className="col-span-full text-xs text-muted-foreground">{tr("Parcela")} {edit.installment_index}/{edit.installment_count}</p> : null}
            <div className="col-span-full flex justify-between pt-2">
              {edit.id ? <Button variant="ghost" onClick={() => { if (confirm(tr("Excluir este lançamento?"))) { m.remove.mutate(edit.id!); setEdit(null); } }}><Trash2 className="h-4 w-4" />{tr("Excluir")}</Button> : <span />}
              <Button onClick={save}>{tr("Salvar")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
