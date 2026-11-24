import { useI18n } from "@/lib/i18n-context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, todayStr } from "@/lib/format";

export type Period = { mode: string; anchor: string; from?: string; to?: string };
export const defaultPeriod = (mode = "30"): Period => ({ mode, anchor: todayStr() });

const MODES = [
  { id: "30", label: "Últimos 30 dias" },
  { id: "60", label: "Últimos 60 dias" },
  { id: "90", label: "Últimos 90 dias" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
  { id: "custom", label: "Personalizado" },
];

/** Returns the date range and chart buckets ("YYYY-MM-DD" days or "YYYY-MM" months). */
export function periodRange(p: Period) {
  let from: string, to: string;
  if (p.mode === "ano") { from = `${p.anchor.slice(0, 4)}-01-01`; to = `${p.anchor.slice(0, 4)}-12-31`; }
  else if (p.mode === "mes") { from = `${p.anchor.slice(0, 7)}-01`; to = addDays(addMonths(from, 1), -1); }
  else if (p.mode === "custom") {
    const start = p.from || p.to || p.anchor;
    const end = p.to || p.from || p.anchor;
    [from, to] = start <= end ? [start, end] : [end, start];
  } else { to = p.anchor; from = addDays(to, -Number(p.mode) + 1); }
  const daily = p.mode !== "ano";
  const keys: string[] = [];
  if (daily) { for (let d = from; d <= to; d = addDays(d, 1)) keys.push(d); }
  else { for (let m = from; m <= to; m = addMonths(m, 1)) keys.push(m.slice(0, 7)); }
  return { from, to, daily, keys };
}

export function bucketLabel(k: string, locale = "pt-BR") {
  const [y = 0, m = 1, d] = k.split("-").map(Number);
  const dt = new Date(y, m - 1, d ?? 1);
  return d ? dt.toLocaleDateString(locale, { day: "numeric", month: "short" }) : dt.toLocaleDateString(locale, { month: "short" });
}

export function periodTitle(p: Period) {
  const { from, to } = periodRange(p);
  if (p.mode === "ano") return from.slice(0, 4);
  if (p.mode === "custom") return `${from.split("-").reverse().join("/")} a ${to.split("-").reverse().join("/")}`;
  if (p.mode === "mes") return new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return `${from.split("-").reverse().join("/")} a ${to.split("-").reverse().join("/")}`;
}

function shift(p: Period, dir: number): Period {
  if (p.mode === "ano") return { ...p, anchor: addMonths(p.anchor, 12 * dir) };
  if (p.mode === "mes") return { mode: p.mode, anchor: addMonths(p.anchor, dir) };
  if (p.mode === "custom") {
    const { from, to } = periodRange(p);
    const span = Math.max(0, (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
    const nextFrom = addDays(from, span * dir + dir);
    const nextTo = addDays(to, span * dir + dir);
    return { mode: p.mode, anchor: nextTo, from: nextFrom, to: nextTo };
  }
  return { mode: p.mode, anchor: addDays(p.anchor, Number(p.mode) * dir) };
}

export function PeriodNav({ value, onChange, modes }: { value: Period; onChange: (p: Period) => void; modes?: string[] }) {
  const { tr } = useI18n();
  const list = MODES.filter((m) => !modes || modes.includes(m.id));
  return (
    <div className="flex items-center gap-1.5">
      <button aria-label={tr("Anterior")} className="rounded-md border border-border p-1.5 hover:border-primary" onClick={() => onChange(shift(value, -1))}><ChevronLeft className="h-4 w-4" /></button>
      <select className="field h-8 w-auto text-xs" value={value.mode} onChange={(e) => {
        const mode = e.target.value;
        const today = todayStr();
        onChange(mode === "custom"
          ? { mode, anchor: today, from: addDays(today, -29), to: today }
          : { mode, anchor: today });
      }}>
        {list.map((m) => <option key={m.id} value={m.id}>{tr(m.label)}</option>)}
      </select>
      {value.mode === "custom" && (
        <div className="flex items-center gap-1">
          <input aria-label={tr("Data inicial")} type="date" className="field h-8 w-32 text-xs" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value, anchor: e.target.value || value.anchor })} />
          <span className="text-xs text-muted-foreground">{tr("a")}</span>
          <input aria-label={tr("Data final")} type="date" className="field h-8 w-32 text-xs" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value, anchor: e.target.value || value.anchor })} />
        </div>
      )}
      <button aria-label={tr("Próximo")} className="rounded-md border border-border p-1.5 hover:border-primary" onClick={() => onChange(shift(value, 1))}><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

/** Month stepper: arrows plus a month picker. value is "YYYY-MM". */
export function MonthNav({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-1.5">
      <button aria-label={tr("Mês anterior")} className="rounded-md border border-border p-1.5 hover:border-primary" onClick={() => onChange(addMonths(`${value}-01`, -1).slice(0, 7))}><ChevronLeft className="h-4 w-4" /></button>
      <input type="month" className="field h-8 w-40 text-xs" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
      <button aria-label={tr("Próximo mês")} className="rounded-md border border-border p-1.5 hover:border-primary" onClick={() => onChange(addMonths(`${value}-01`, 1).slice(0, 7))}><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

export function monthName(m: string, locale = "pt-BR") {
  return new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
}
