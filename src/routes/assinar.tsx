import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PricingPlans } from "@/components/app/PricingPlans";
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import { planId, type Tier } from "@/lib/billing";
import { getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

export const Route = createFileRoute("/assinar")({
  validateSearch: (search: Record<string, unknown>): { plano?: "anual" | "mensal"; tier?: Tier } => ({
    plano: search["plano"] === "mensal" ? "mensal" : "anual",
    tier: search["tier"] === "starter" || search["tier"] === "enterprise" ? search["tier"] : "business",
  }),
  head: () => ({
    meta: [
      { title: "Assinar | NEXO HUB" },
      { name: "description", content: "Assine o NEXO HUB: 3 dias grátis nos planos Starter, Business e Enterprise." },
      { property: "og:title", content: "Assine o NEXO HUB" },
      { property: "og:description", content: "3 dias grátis para testar o sistema de gestão completo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/assinar") throw redirect({ href: "/#planos" });
  },
  component: () => <Outlet />, 
});

function Assinar() {
  const { plano } = Route.useSearch();
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [err, setErr] = useState("");
  const checkout = useServerFn(createCheckoutSession);
  const start = async (tier: Tier, cycle: "mensal" | "anual") => {
    setErr(""); setPendingTier(tier);
    try {
      const r = await checkout({ data: { priceId: planId(tier, cycle), environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/assinar/obrigado?session_id={CHECKOUT_SESSION_ID}` } });
      if ("error" in r) { setErr(r.error); return; }
      window.location.assign(r.url);
    } catch { setErr("Não foi possível abrir a Stripe. Tente novamente."); }
    finally { setPendingTier(null); }
  };

  return (
    <div className="dark nexo-lp min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <img src="/ultrax-attached-b6d76d11-e9f3-4cbb-9c6f-6bfde7abb0ed.svg" alt="NEXO HUB" className="mb-3 h-auto w-24 max-w-full object-contain" />
        <h1 className="text-3xl font-bold">NEXO HUB</h1>
        <p className="mt-2 text-muted-foreground">Teste grátis por 3 dias. R$ 0,00 hoje, a assinatura começa a ser cobrada após o teste.</p>
        {err && <p role="alert" className="mt-4 text-sm text-destructive">{err}</p>}
        <div className="mt-8"><PricingPlans initialAnnual={plano !== "mensal"} onCheckout={(tier, cycle) => void start(tier, cycle)} pendingTier={pendingTier} /></div>
        <p className="mt-8 text-center text-sm text-muted-foreground">Já é assinante? <Link to="/login" className="text-primary underline">Entrar</Link></p>
        <p className="mt-3 text-center text-xs text-muted-foreground">Não recebeu o link de acesso? <a href="mailto:agencyadm@outlook.com" className="underline">agencyadm@outlook.com</a></p>
      </div>
    </div>
  );
}
