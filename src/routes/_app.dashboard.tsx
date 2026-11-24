import { useI18n } from "@/lib/i18n-context";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRows, type Row } from "@/lib/data";
import { useStatusStages } from "@/lib/useStatusStages";
import { addDays, addMonths, daysUntil, money, todayStr } from "@/lib/format";
import { useGoals, type Metric } from "@/lib/goals";
import { Button } from "@/components/ui/button";
import { GoalGauge } from "@/components/app/GoalGauge";
import { PeriodNav, bucketLabel, defaultPeriod, monthName, periodRange, type Period } from "@/components/app/PeriodNav";
import { Field as AppField, Modal as AppModal, PageHeader, Panel as AppPanel } from "@/components/app/ui";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard | NEXO HUB" },
      { name: "description", content: "Receitas, saldo, previsões e metas mês a mês." },
      { property: "og:title", content: "Dashboard | NEXO HUB" },
      { property: "og:description", content: "Receitas, saldo, previsões e metas mês a mês." },
    ],
  }),
  component: Dashboard,
});

type Tx = Row<"transactions">;
const SIT = [{ id: "pago", label: "Recebido" }, { id: "pendente", label: "Pendente" }, { id: "vencido", label: "Vencido" }];
const SIT_COLORS = ["var(--color-success)", "var(--color-warning)", "var(--color-destructive)"];
const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
const tip = { contentStyle: { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }, labelStyle: { color: "var(--color-foreground)" } };
const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11 };

const due = (t: Tx) => t.due_date || t.date || "";
const paidDay = (t: Tx) => t.paid_at || t.date || "";
const situation = (t: Tx) => (t.status === "pago" ? "pago" : daysUntil(due(t)) < 0 ? "vencido" : "pendente");
const sum = (a: Tx[]) => a.reduce((s, t) => s + Number(t.amount), 0);

function Panel({ title, children, action, className }: { title?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return <AppPanel {...(title === undefined ? {} : { title })} {...(action === undefined ? {} : { action })} {...(className === undefined ? {} : { className })} children={children ?? null} />;
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children?: ReactNode; wide?: boolean }) {
  return <AppModal open={open} onClose={onClose} title={title} {...(wide === undefined ? {} : { wide })} children={children ?? null} />;
}

function Field({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  return <AppField label={label} {...(className === undefined ? {} : { className })} children={children ?? null} />;
}

export function Dashboard() {
  const { tr, locale } = useI18n();
  const { data: txs = [] } = useRows("transactions");
  const { data: companies = [] } = useRows("companies");
  const { data: clients = [] } = useRows("clients");
  const { data: leads = [] } = useRows("crm_leads");
  const LEAD_STAGES = useStatusStages("crm", leads.map((l) => l.stage));
  const currencies = useMemo(() => {
    const c: Record<string, number> = {};
    txs.forEach((t) => (c[t.currency] = (c[t.currency] ?? 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [txs]);
  const [country, setCountry] = useState("");
  const [comp, setComp] = useState("");
  const [curSel, setCurSel] = useState("");
  const [sit, setSit] = useState("");
  const cur = curSel || currencies[0] || "USD";
  const allCountries = [...new Set(companies.map((c) => c.country).filter(Boolean))] as string[];
  const countryOf = (company: string | null) => companies.find((c) => c.name === company)?.country ?? null;

  const filtered = txs.filter((t) => t.currency === cur && (!comp || t.company === comp)
    && (!country || countryOf(t.company) === country) && (!sit || situation(t) === sit));
  const rec = filtered.filter((t) => t.type === "receita");
  const desp = filtered.filter((t) => t.type === "despesa");
  const paidRec = rec.filter((t) => t.status === "pago");

  const [period, setPeriod] = useState<Period>(() => defaultPeriod());
  const [pSales, setPSales] = useState<Period>(() => defaultPeriod());
  const [pFlow, setPFlow] = useState<Period>(() => defaultPeriod());
  const [pClients, setPClients] = useState<Period>(() => defaultPeriod());
  const [pLeads, setPLeads] = useState<Period>(() => defaultPeriod());
  const [pSituation, setPSituation] = useState<Period>(() => defaultPeriod());
  const [pCompany, setPCompany] = useState<Period>(() => defaultPeriod());
  const [pForecast, setPForecast] = useState<Period>(() => defaultPeriod());
  const [pFunnel, setPFunnel] = useState<Period>(() => defaultPeriod());
  const [pTicket, setPTicket] = useState<Period>(() => defaultPeriod());
  const changePeriod = (next: Period) => {
    setPeriod(next);
    setPSales(next);
    setPFlow(next);
    setPClients(next);
    setPLeads(next);
    setPSituation(next);
    setPCompany(next);
    setPForecast(next);
    setPFunnel(next);
    setPTicket(next);
  };
  const generalRange = periodRange(period);
  const inRange = (date: string | null | undefined, range: { from: string; to: string }) => {
    const day = date?.slice(0, 10) ?? "";
    return day >= range.from && day <= range.to;
  };
  const inGeneralRange = (date: string | null | undefined) => inRange(date, generalRange);

  const receitaMes = sum(paidRec.filter((t) => inGeneralRange(paidDay(t))));
  const despMes = sum(desp.filter((t) => t.status === "pago" && inGeneralRange(paidDay(t))));
  const pendMes = rec.filter((t) => t.status !== "pago" && inGeneralRange(due(t)));
  const pendAll = rec.filter((t) => t.status !== "pago");
  const activeClients = clients.filter((c) => (c.status || "ativo") === "ativo" && inGeneralRange(c.created_at));
  const newThisMonth = clients.filter((c) => inGeneralRange(c.created_at)).length;

  const rs = periodRange(pSales);
  const salesData = rs.keys.map((k) => ({ k: bucketLabel(k, locale), v: sum(paidRec.filter((t) => paidDay(t).startsWith(k))) }));
  const salesTotal = salesData.reduce((s, x) => s + x.v, 0);
  const best = salesData.reduce((b, x) => (x.v > b.v ? x : b), { k: "", v: 0 });
  const rf = periodRange(pFlow);
  const flowData = rf.keys.map((k) => ({ k: bucketLabel(k, locale), Receitas: sum(rec.filter((t) => due(t).startsWith(k))), Despesas: sum(desp.filter((t) => due(t).startsWith(k))) }));
  const rc = periodRange(pClients);
  const clientData = rc.keys.map((k) => ({ k: bucketLabel(k, locale), v: clients.filter((c) => c.created_at.startsWith(k)).length }));
  const rl = periodRange(pLeads);
  const leadData = rl.keys.map((k) => ({ k: bucketLabel(k, locale), ...Object.fromEntries(LEAD_STAGES.map((s) => [s.label, leads.filter((l) => l.stage === s.id && (l.created_at ?? "").startsWith(k)).length])) }));

  const situationRange = periodRange(pSituation);
  const companyRange = periodRange(pCompany);
  const forecastRange = periodRange(pForecast);
  const funnelRange = periodRange(pFunnel);
  const ticketRange = periodRange(pTicket);
  const situationRec = rec.filter((t) => inRange(due(t), situationRange));
  const companyPaidRec = paidRec.filter((t) => inRange(paidDay(t), companyRange));
  const companyPendingRec = rec.filter((t) => t.status !== "pago" && inRange(due(t), companyRange));
  const periodLeads = leads.filter((l) => inRange(l.created_at, funnelRange));
  const sitData = SIT.map((s) => ({ name: tr(s.label), value: sum(situationRec.filter((t) => situation(t) === s.id)) }));
  const byCompany = companies.map((c) => ({ name: c.name, got: sum(companyPaidRec.filter((t) => t.company === c.name)), open: sum(companyPendingRec.filter((t) => t.company === c.name)) })).sort((a, b) => b.got - a.got);
  const maxCo = Math.max(1, ...byCompany.map((c) => c.got));
  const forecastDays = Math.max(1, Math.round((Date.parse(`${forecastRange.to}T00:00:00Z`) - Date.parse(`${forecastRange.from}T00:00:00Z`)) / 86400000) + 1);
  const forecastBuckets = Math.min(3, forecastDays);
  const forecast = Array.from({ length: forecastBuckets }, (_, i) => {
    const fromOffset = Math.floor((forecastDays * i) / forecastBuckets);
    const toOffset = Math.floor((forecastDays * (i + 1)) / forecastBuckets) - 1;
    const from = addDays(forecastRange.from, fromOffset);
    const to = addDays(forecastRange.from, toOffset);
    const items = rec.filter((t) => t.status !== "pago" && due(t) >= from && due(t) <= to);
    const label = from === to ? bucketLabel(from, locale) : tr("{0} a {1}", [bucketLabel(from, locale), bucketLabel(to, locale)]);
    return { label, v: sum(items), n: items.length };
  });
  const fTotal = forecast.reduce((s, f) => s + f.v, 0);
  const funnel = LEAD_STAGES.map((s) => ({ name: s.label, v: periodLeads.filter((l) => l.stage === s.id).length }));
  const closed = periodLeads.filter((l) => l.stage === "fechado").length;
  const ticketPaidRec = paidRec.filter((t) => inRange(paidDay(t), ticketRange));
  const ticketPendingRec = rec.filter((t) => t.status !== "pago" && inRange(due(t), ticketRange));
  const buyers = new Set(ticketPaidRec.map((t) => t.client_id).filter(Boolean)).size;
  const overdue = rec.filter((t) => inRange(due(t), ticketRange) && situation(t) === "vencido");
  const inadPct = sum(ticketPendingRec) ? (sum(overdue) / sum(ticketPendingRec)) * 100 : 0;

  const goalValue = (m: string, metric: Metric) =>
    metric === "revenue" ? sum(paidRec.filter((t) => paidDay(t).startsWith(m)))
      : metric === "sales" ? paidRec.filter((t) => paidDay(t).startsWith(m)).length
        : clients.filter((c) => c.created_at.startsWith(m)).length;

  return (
    <div className="space-y-4">
      <PageHeader title={tr("Dashboard")} sub={tr("Painel de controle completo")} actions={
        <div className="flex flex-wrap gap-2">
          <select className="field h-8 w-auto text-xs" value={country} onChange={(e) => setCountry(e.target.value)} aria-label={tr("País")}>
            <option value="">{tr("País")}</option>{allCountries.map((c) => <option key={c}>{c}</option>)}
          </select>
          <PeriodNav value={period} onChange={changePeriod} />
          <select className="field h-8 w-auto text-xs" value={comp} onChange={(e) => setComp(e.target.value)} aria-label={tr("Empresa")}>
            <option value="">{tr("Todas as empresas")}</option>{companies.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
          <select className="field h-8 w-auto text-xs" value={cur} onChange={(e) => setCurSel(e.target.value)} aria-label={tr("Moeda")}>
            {(currencies.length ? currencies : ["USD"]).map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="field h-8 w-auto text-xs" value={sit} onChange={(e) => setSit(e.target.value)} aria-label={tr("Situação")}>
            <option value="">{tr("Situação")}</option>{SIT.map((s) => <option key={s.id} value={s.id}>{tr(s.label)}</option>)}
          </select>
        </div>
      } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label={tr("Clientes ativos")} value={String(activeClients.length)} sub={tr("{0} cliente(s) no período", [newThisMonth])} />
        <Kpi label={tr("Receita no período ({0})", [cur])} value={money(receitaMes, cur)} sub={tr("Despesas {0}", [money(despMes, cur)])} subTone="text-destructive" />
        <Kpi label={tr("Saldo no período ({0})", [cur])} value={money(receitaMes - despMes, cur)} sub={tr("Receita recebida no período menos despesas pagas no período")} subTone="text-success" />
        <Kpi label={tr("A receber no período ({0})", [cur])} value={money(sum(pendMes), cur)} sub={tr("{0} receita(s) pendente(s)", [pendMes.length])} subTone="text-warning" />
        <Kpi label={tr("A receber total ({0})", [cur])} value={money(sum(pendAll), cur)} sub={tr("{0} receita(s) pendente(s)", [pendAll.length])} subTone="text-warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tr("Vendas totais ({0})", [cur])} action={<PeriodNav value={pSales} onChange={setPSales} />}>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div><div className="kpi-label">{tr("Total no período")}</div><div className="text-lg font-bold">{money(salesTotal, cur)}</div></div>
            <div><div className="kpi-label">{tr("Melhor")} {rs.daily ? tr("dia") : tr("mês")}</div><div className="text-lg font-bold text-success">{money(best.v, cur)}</div><div className="text-xs text-muted-foreground">{best.k}</div></div>
            <div><div className="kpi-label">{tr("Último do gráfico")}</div><div className="text-lg font-bold">{money(salesData[salesData.length - 1]?.v ?? 0, cur)}</div></div>
          </div>
          <div className="h-56"><ResponsiveContainer><AreaChart data={salesData}>
            <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} /><XAxis dataKey="k" {...axis} /><YAxis {...axis} width={56} />
            <Tooltip {...tip} formatter={(v: number) => money(v, cur)} /><Area type="monotone" dataKey="v" name={tr("Vendas")} stroke="var(--color-success)" fill="url(#gs)" strokeWidth={2} />
          </AreaChart></ResponsiveContainer></div>
        </Panel>
        <GoalBoard cur={cur} valueOf={goalValue} />
      </div>

      <Panel title={tr("Receitas x Despesas ({0})", [cur])} action={<PeriodNav value={pFlow} onChange={setPFlow} />}>
        <div className="h-60"><ResponsiveContainer><AreaChart data={flowData}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} /><XAxis dataKey="k" {...axis} /><YAxis {...axis} width={56} />
          <Tooltip {...tip} formatter={(v: number) => money(v, cur)} /><Legend />
          <Area type="monotone" dataKey="Receitas" name={tr("Receitas")} stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.15} strokeWidth={2} />
          <Area type="monotone" dataKey="Despesas" name={tr("Despesas")} stroke="var(--color-destructive)" fill="var(--color-destructive)" fillOpacity={0.15} strokeWidth={2} />
        </AreaChart></ResponsiveContainer></div>
      </Panel>

      <Panel title={tr("Leads do CRM")} action={<PeriodNav value={pLeads} onChange={setPLeads} />}>
        <div className="h-56"><ResponsiveContainer><LineChart data={leadData}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} /><XAxis dataKey="k" {...axis} /><YAxis {...axis} width={30} allowDecimals={false} />
          <Tooltip {...tip} /><Legend />
          {LEAD_STAGES.map((s, i) => <Line key={s.id} type="monotone" dataKey={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
        </LineChart></ResponsiveContainer></div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={tr("Novos clientes")} action={<PeriodNav value={pClients} onChange={setPClients} />}>
          <div className="h-48"><ResponsiveContainer><BarChart data={clientData}>
            <XAxis dataKey="k" {...axis} /><YAxis {...axis} width={30} allowDecimals={false} /><Tooltip {...tip} />
            <Bar dataKey="v" name={tr("Clientes")} fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={tr("Situação das receitas")} action={<PeriodNav value={pSituation} onChange={setPSituation} />}>
          <div className="h-36"><ResponsiveContainer><PieChart><Pie data={sitData} dataKey="value" innerRadius={42} outerRadius={62} stroke="none">
            {sitData.map((_, i) => <Cell key={i} fill={SIT_COLORS[i]} />)}</Pie><Tooltip {...tip} formatter={(v: number) => money(v, cur)} /></PieChart></ResponsiveContainer></div>
          <ul className="mt-2 space-y-1 text-sm">{sitData.map((s, i) => (
            <li key={s.name} className="flex justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: SIT_COLORS[i] }} />{s.name}</span><b>{money(s.value, cur)}</b></li>
          ))}</ul>
        </Panel>
        <Panel title={tr("Receita por empresa")} action={<PeriodNav value={pCompany} onChange={setPCompany} />}>
          <ul className="space-y-3 text-sm">{byCompany.map((c, i) => (
            <li key={c.name}>
              <div className="flex justify-between font-medium"><span>{c.name}</span><span>{money(c.got, cur)}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-muted"><div className="h-full" style={{ width: `${(c.got / maxCo) * 100}%`, background: COLORS[i % COLORS.length] }} /></div>
              <div className="mt-0.5 text-xs text-muted-foreground">{tr("recebido")} {money(c.got, cur)}{tr(", a receber")} {money(c.open, cur)}</div>
            </li>
          ))}</ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tr("Previsão de recebimentos")} action={<PeriodNav value={pForecast} onChange={setPForecast} />}>
          <div className="text-2xl font-bold">{money(fTotal, cur)}</div>
          <div className="mb-3 text-xs text-muted-foreground">{tr("Total no período,")} {forecast.reduce((s, f) => s + f.n, 0)} {tr("parcela(s)")}</div>
          {forecast.map((f) => (
            <div key={f.label} className="mb-3">
              <div className="flex justify-between text-sm"><span>{f.label}</span><b className="text-success">{money(f.v, cur)}</b></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-success" style={{ width: `${fTotal ? (f.v / fTotal) * 100 : 0}%` }} /></div>
              <div className="text-xs text-muted-foreground">{f.n} {tr("parcela(s)")}</div>
            </div>
          ))}
        </Panel>
        <Panel title={tr("Funil de vendas")} action={<PeriodNav value={pFunnel} onChange={setPFunnel} />}>
          {funnel.map((f, i) => (
            <div key={f.name} className="mb-3">
              <div className="flex justify-between text-sm"><span>{f.name}</span><b>{f.v}</b></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-muted"><div className="h-full" style={{ width: `${periodLeads.length ? (f.v / periodLeads.length) * 100 : 0}%`, background: COLORS[i % COLORS.length] }} /></div>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-3 text-sm"><span>{tr("Taxa de conversão")}</span><b className="text-xl text-success">{periodLeads.length ? Math.round((closed / periodLeads.length) * 100) : 0}%</b></div>
        </Panel>
      </div>

      <Panel title={tr("Ticket médio e inadimplência")} action={<PeriodNav value={pTicket} onChange={setPTicket} />}>
        <div className="kpi-label">{tr("Ticket médio por cliente")}</div>
        <div className="text-2xl font-bold text-success">{money(buyers ? sum(ticketPaidRec) / buyers : 0, cur)}</div>
        <div className="mb-4 text-xs text-muted-foreground">{tr("em")} {buyers} {tr("cliente(s) com compras")}</div>
        <div className="kpi-label">{tr("Inadimplência (vencido)")}</div>
        <div className="text-2xl font-bold text-destructive">{money(sum(overdue), cur)}</div>
        <div className="text-xs text-muted-foreground">{overdue.length} {tr("receita(s) vencida(s) sem pagar,")} {inadPct.toFixed(1)}{tr("% a receber")}</div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-destructive" style={{ width: `${inadPct}%` }} /></div>
      </Panel>
    </div>
  );
}

function Kpi({ label, value, sub, subTone = "text-muted-foreground" }: { label: string; value: string; sub?: string; subTone?: string }) {
  return (
    <div className="panel p-4">
      <div className="kpi-label">{label}</div>
      <div className="mt-2 text-xl font-bold md:text-2xl">{value}</div>
      {sub && <div className={`mt-1 text-xs ${subTone}`}>{sub}</div>}
    </div>
  );
}

const METRICS: { id: Metric; label: string }[] = [{ id: "revenue", label: "Receita" }, { id: "sales", label: "Vendas" }, { id: "clients", label: "Clientes" }];

/** Monthly goal boards: 3 months side by side, arrows move month by month, or pick any month. */
function GoalBoard({ cur, valueOf }: { cur: string; valueOf: (m: string, metric: Metric) => number }) {
  const { tr, locale } = useI18n();
  const goals = useGoals();
  const thisMonth = todayStr().slice(0, 7);
  const [metric, setMetric] = useState<Metric>("revenue");
  const [end, setEnd] = useState(thisMonth);
  const [editing, setEditing] = useState<{ month: string; v: number } | null>(null);
  const months = [-2, -1, 0].map((d) => addMonths(`${end}-01`, d).slice(0, 7));
  const fmt = (v: number) => (metric === "revenue" ? money(v, cur) : String(v));
  return (
    <Panel title={tr("Meta do mês batida")} action={
      <div className="flex gap-1">{METRICS.map((m) => <button key={m.id} className="chip" data-on={metric === m.id} onClick={() => setMetric(m.id)}>{tr(m.label)}</button>)}</div>
    }>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button aria-label={tr("Mês anterior")} className="rounded-md border border-border p-1.5 hover:border-primary" onClick={() => setEnd(addMonths(`${end}-01`, -1).slice(0, 7))}><ChevronLeft className="h-4 w-4" /></button>
        <input type="month" aria-label={tr("Escolher mês")} className="field h-8 w-40 text-center text-xs" value={end} onChange={(e) => e.target.value && setEnd(e.target.value)} />
        <button aria-label={tr("Próximo mês")} className="rounded-md border border-border p-1.5 hover:border-primary" onClick={() => setEnd(addMonths(`${end}-01`, 1).slice(0, 7))}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map((m) => {
          const v = valueOf(m, metric);
          const g = goals.get(m, metric);
          const pct = g > 0 ? (v / g) * 100 : 0;
          return (
            <div key={m} className="flex flex-col items-center rounded-md border border-border p-2 text-center">
              <div className="kpi-label capitalize">{monthName(m, locale)}</div>
              {m === thisMonth && <span className="mt-1 rounded bg-success px-1.5 text-[10px] font-bold text-background">{tr("MÊS ATUAL")}</span>}
              <GoalGauge value={v} goal={g} />
              <div className="text-xl font-bold">{pct.toFixed(1).replace(".", ",")}%</div>
              <div className="text-sm font-semibold">{fmt(v)}</div>
              <div className="text-xs text-muted-foreground">{tr("de")} {fmt(g)}</div>
              <div className={`mt-2 min-h-8 text-xs font-medium ${pct >= 100 ? "text-success" : "text-warning"}`}>
                {g <= 0 ? tr("Sem meta") : pct >= 100 ? tr("Meta batida!") : tr("Falta {0} para bater a meta", [fmt(g - v)])}
              </div>
              <Button size="sm" variant="outline" className="mt-1" onClick={() => setEditing({ month: m, v: g })}>{tr("Editar")}</Button>
            </div>
          );
        })}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={tr("Meta de {0} em {1}", [tr(METRICS.find((x) => x.id === metric)?.label ?? ""), editing ? monthName(editing.month, locale) : ""])}>
        {editing && (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await goals.set(editing.month, metric, editing.v); setEditing(null); }}>
            <Field label={tr("Meta")}><input type="number" step="0.01" className="field" value={editing.v} onChange={(e) => setEditing({ ...editing, v: Number(e.target.value) })} /></Field>
            <div className="flex justify-end"><Button type="submit">{tr("Salvar")}</Button></div>
          </form>
        )}
      </Modal>
    </Panel>
  );
}
