import { useI18n } from "@/lib/i18n-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { PLANS, type PlanId, canCancelTrial, daysUntilRenewal, renewalLabel, situation } from "@/lib/billing";
import { getStripeEnvironment } from "@/lib/stripe";
import { useMySubscription } from "@/lib/subscription";
import { cancelMySubscription, changeMyPlan, getMyPaymentMethod, openMyBillingPortal } from "@/lib/payments.functions";

/** Subscriber's own plan: switch Mensal/Anual or cancel. Renders nothing for non-subscribers. */
export function MySubscription() {
  const { tr } = useI18n();
  const { data: s } = useMySubscription();
  const qc = useQueryClient();
  const [opening, setOpening] = useState(false);
  const pm = useQuery({
    queryKey: ["my-payment-method", s?.stripe_subscription_id],
    enabled: !!s && s.status !== "manual",
    queryFn: () => getMyPaymentMethod({ data: { environment: getStripeEnvironment() } }),
  });
  if (!s) return null;
  if (s.status === "manual") return <p className="text-sm">{tr("Acesso cortesia")}{s.current_period_end ? tr(" até {0}", [fmtDate(s.current_period_end)]) : tr(", sem data para acabar")}.</p>;
  const sit = situation(s);
  const current = s.price_id as PlanId;
  const others = (Object.keys(PLANS) as PlanId[]).filter((k) => k !== current);
  const refresh = () => setTimeout(() => qc.invalidateQueries({ queryKey: ["my-subscription"] }), 2500);

  const change = async (other: PlanId) => {
    if (!confirm(tr("Trocar para {0} ({1})?", [tr(PLANS[other].label), tr(PLANS[other].price)]))) return;
    const r = await changeMyPlan({ data: { priceId: other, environment: getStripeEnvironment() } });
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(tr("Plano trocado para {0}. A diferença é cobrada agora.", [tr(PLANS[other].label)])); refresh();
  };
  const cancel = async () => {
    const msg = s.status === "trialing" ? "Cancelar agora? No período de teste o acesso termina na hora e nada é cobrado." : "Cancelar? Você continua usando até o fim do período já pago.";
    if (!confirm(tr(msg))) return;
    const r = await cancelMySubscription({ data: { environment: getStripeEnvironment() } });
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(tr("Assinatura cancelada")); refresh();
  };

  const plan = PLANS[s.price_id as PlanId];
  const days = daysUntilRenewal(s);
  const renewAt = s.status === "trialing" ? s.trial_end ?? s.current_period_end : s.current_period_end;
  const base = sit === "teste" ? "Teste grátis ativo" : sit === "ativo" ? "Ativa" : sit === "atrasado" ? "Pagamento atrasado" : sit === "cancelando" ? "Cancelada, acesso até o fim do período" : sit === "cancelado" ? "Cancelada" : sit;
  const label = sit === "ativo" || sit === "teste" ? days !== null && days <= 3 ? days === 0 ? tr("{0}, vence hoje", [tr(base)]) : tr("{0}, vence em {1} dia{2}", [tr(base), days, days === 1 ? "" : "s"]) : tr(base) : tr(base);
  const card = pm.data && !("error" in pm.data) && pm.data.last4 ? tr("{0} final {1}", [(pm.data.brand ?? "Cartão").toUpperCase(), pm.data.last4]) : pm.isLoading ? "Carregando..." : "Cartão não informado";
  const editCard = async () => {
    setOpening(true);
    const r = await openMyBillingPortal({ data: { environment: getStripeEnvironment(), returnUrl: window.location.href } });
    setOpening(false);
    if ("error" in r) { toast.error(r.error); return; }
    window.location.assign(r.url);
  };
  const row = (k: string, v: React.ReactNode) => <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2 last:border-0"><span className="text-muted-foreground">{tr(k)}</span><span className="font-medium">{typeof v === "string" ? tr(v) : v}</span></div>;

  return (
    <div className="grid gap-2 text-sm">
      <div>
        {row("Situação", <span className={days !== null && days <= 3 || sit === "atrasado" ? "text-destructive" : "text-success"}>{label}</span>)}
        {row("Plano", `${tr(plan?.label ?? s.price_id ?? "")} (${tr(plan?.price ?? "")})`)}
        {row("Tipo", tr(plan?.cycle === "anual" ? "Anual" : "Mensal"))}
        {row(s.cancel_at_period_end ? "Acesso até" : sit === "teste" ? "Primeira cobrança" : "Renova em", renewAt ? fmtDate(renewAt) : "-")}
        {row("Dias para vencer", days === null ? "-" : tr("{0} dia{1}", [days, days === 1 ? "" : "s"]))}
        {row("Forma de pagamento", <span className="flex items-center gap-2">{tr(card)}<Button size="sm" variant="outline" disabled={opening} onClick={editCard}>{opening ? tr("Abrindo...") : tr("Editar cartão")}</Button></span>)}
      </div>
      {s.status === "trialing" && s.trial_end && <p>{tr("Teste grátis até")} {fmtDate(s.trial_end)}{tr(". A primeira cobrança acontece nesse dia. Dá pra cancelar até 2 horas antes.")}</p>}
      {s.cancel_at_period_end && s.current_period_end && <p className="text-muted-foreground">{tr("Cancelado. Acesso até")} {fmtDate(s.current_period_end)}.</p>}
      {sit === "atrasado" && <p className="text-destructive">{tr("Pagamento recusado. Vamos tentar de novo em 24h; se falhar, o sistema fica indisponível.")}</p>}
      {!s.cancel_at_period_end && s.status !== "canceled" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <select aria-label={tr("Trocar de plano")} className="field h-9 w-auto text-sm" value="" onChange={(e) => e.target.value && change(e.target.value as PlanId)}>
            <option value="">{tr("Trocar de plano (upgrade ou downgrade)...")}</option>
            {others.map((k) => <option key={k} value={k}>{tr(PLANS[k].label)} ({tr(PLANS[k].price)})</option>)}
          </select>
          {s.status === "trialing" && !canCancelTrial(s.trial_end)
            ? <span className="text-xs text-muted-foreground">{tr("Cancelamento encerrado: faltam menos de 2 horas para a primeira cobrança.")}</span>
            : <Button size="sm" variant="ghost" onClick={cancel}>{tr("Cancelar assinatura")}</Button>}
        </div>
      )}
    </div>
  );
}
