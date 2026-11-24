import { useI18n } from "@/lib/i18n-context";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/ui";
import { PricingPlans } from "@/components/app/PricingPlans";
import { PLANS, planId, type PlanId, type Tier } from "@/lib/billing";
import { getStripeEnvironment } from "@/lib/stripe";
import { useMySubscription } from "@/lib/subscription";
import { changeMyPlan, createCheckoutSession } from "@/lib/payments.functions";

export const Route = createFileRoute("/_app/planos")({
  head: () => ({
    meta: [
      { title: "Planos | NEXO HUB" },
      { name: "description", content: "Suba de plano para liberar mais recursos." },
      { property: "og:title", content: "Planos | NEXO HUB" },
      { property: "og:description", content: "Suba de plano para liberar mais recursos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planos,
});

function Planos() {
  const { tr } = useI18n();
  const { data: s } = useMySubscription();
  const qc = useQueryClient();
  const nav = useNavigate();
  const checkout = useServerFn(createCheckoutSession);
  const [pending, setPending] = useState<Tier | null>(null);
  const current = s?.price_id && s.price_id in PLANS ? PLANS[s.price_id as PlanId] : null;
  const go = async (tier: Tier, cycle: "mensal" | "anual") => {
    const id = planId(tier, cycle);
    if (!s || s.status === "manual") {
      setPending(tier);
      try {
        const result = await checkout({ data: {
          priceId: id,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/assinar/obrigado?session_id={CHECKOUT_SESSION_ID}`,
        } });
        if ("error" in result) { toast.error(result.error); return; }
        window.location.assign(result.url);
      } catch (error) {
        toast.error((error as Error).message || tr("Não foi possível abrir a Stripe. Tente novamente."));
      } finally {
        setPending(null);
      }
      return;
    }
    if (id === s.price_id) { toast.info(tr("Este já é o seu plano.")); return; }
    if (!confirm(tr("Trocar para {0} ({1})?", [PLANS[id].label, PLANS[id].price]))) return;
    setPending(tier);
    const r = await changeMyPlan({ data: { priceId: id, environment: getStripeEnvironment() } });
    setPending(null);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(tr("Plano trocado para {0}.", [PLANS[id].label]));
    setTimeout(() => qc.invalidateQueries({ queryKey: ["my-subscription"] }), 2500);
    void nav({ to: "/configuracoes" });
  };
  return (
    <div>
      <PageHeader title={tr("Suba de plano")} sub={current ? tr("Seu plano atual: {0}. Escolha um plano para liberar mais recursos.", [current.label]) : tr("Escolha o plano com os recursos que você precisa.")} />
      <PricingPlans initialAnnual={current?.cycle !== "mensal"} onCheckout={(t, c) => void go(t, c)} pendingTier={pending} ctaLabel={s && s.status !== "manual" ? tr("Mudar para") : tr("Testar")} />
    </div>
  );
}
