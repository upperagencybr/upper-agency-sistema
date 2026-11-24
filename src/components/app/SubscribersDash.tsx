import { useI18n } from "@/lib/i18n-context";
import { PLANS, situation, type SubLike } from "@/lib/billing";
import type { Period } from "@/components/app/PeriodNav";

type Sub = SubLike & { price_id?: string | null; created_at: string; cancel_at_period_end?: boolean; status: string; current_period_end?: string | null; trial_end?: string | null };
const MONTHLY: Record<string, number> = Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, p.perMonth]));
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Paying subscriptions alive during [start, end): started before end, not ended before start, not in trial during the whole range, not manual access. */
function mrrIn(subs: Sub[], start: Date, end: Date) {
  let total = 0;
  for (const s of subs) {
    const price = MONTHLY[s.price_id ?? ""];
    if (!price || s.status === "manual") continue;
    if (new Date(s.created_at) >= end) continue;
    if (s.trial_end && new Date(s.trial_end) >= end) continue;
    if (["canceled", "incomplete_expired"].includes(s.status) && s.current_period_end && new Date(s.current_period_end) < start) continue;
    if (s.status === "canceled" && !s.current_period_end) continue;
    total += price;
  }
  return total;
}

function Card({ label, value, tone }: { label: string; value: string; tone: string }) {
  const { tr } = useI18n();
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{tr(label)}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

/** Mini dashboard of subscribers, calculated independently for the selected date range. */
export function SubscribersDash({ subs, period }: { subs: Sub[]; period: { from: string; to: string } }) {
  const { tr } = useI18n();
  const start = new Date(`${period.from}T00:00:00Z`);
  const end = new Date(Date.parse(`${period.to}T00:00:00Z`) + 86400000);
  const inPeriod = subs.filter((s) => {
    const createdAt = new Date(s.created_at);
    return createdAt >= start && createdAt < end;
  });
  const sits = inPeriod.map((s) => situation(s));
  const ativos = sits.filter((x) => ["ativo", "cancelando", "atrasado", "cortesia"].includes(x)).length;
  const cancelados = sits.filter((x) => x === "cancelado").length;
  const teste = sits.filter((x) => x === "teste").length;
  const mrr = mrrIn(subs, start, end);
  const arr = mrr * 12;
  return (
    <div className="mb-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label={tr("Assinantes ativos")} value={String(ativos)} tone="text-success" />
        <Card label={tr("Em teste")} value={String(teste)} tone="text-primary" />
        <Card label={tr("Cancelados")} value={String(cancelados)} tone="text-destructive" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card label={tr("Recorrente mensal")} value={brl(mrr)} tone="text-success" />
        <Card label={tr("Recorrente anual")} value={brl(arr)} tone="text-success" />
      </div>
    </div>
  );
}
