import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, TIERS, planId, type Tier } from "@/lib/billing";

const INCLUDED = ["Dashboard e metas mensais", "CRM e cadastro de clientes", "Projetos e mentorados", "Receitas, despesas e recorrências"];
const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PricingPlans({ initialAnnual = true, onCheckout, pendingTier, ctaLabel }: { ctaLabel?: string; initialAnnual?: boolean; onCheckout?: (tier: Tier, cycle: "anual" | "mensal") => void; pendingTier?: Tier | null }) {
  const { tr } = useI18n();
  const [annual, setAnnual] = useState(initialAnnual);
  const tiers = Object.keys(TIERS) as Tier[];
  const maxDiscount = Math.max(...tiers.map(tier => Math.floor((1 - PLANS[planId(tier, "anual")].perMonth / PLANS[planId(tier, "mensal")].perMonth) * 100)));

  return <>
    <div className="mb-10 flex flex-col items-center gap-3">
      <p className="text-sm font-semibold text-primary">{tr("Economize até")} {maxDiscount}{tr("% no anual")}</p>
      <div role="group" aria-label={tr("Período de assinatura")} className="inline-flex gap-1 rounded-md border border-border bg-muted p-1">
        <Button aria-pressed={annual} variant={annual ? "default" : "ghost"} onClick={() => setAnnual(true)}>{tr("Anual")} <span className="text-xs">{tr("Mais economia")}</span></Button>
        <Button aria-pressed={!annual} variant={!annual ? "default" : "ghost"} onClick={() => setAnnual(false)}>{tr("Mensal")}</Button>
      </div>
    </div>
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
      {tiers.map(tier => {
        const monthly = PLANS[planId(tier, "mensal")];
        const yearly = PLANS[planId(tier, "anual")];
        const discount = Math.floor((1 - yearly.perMonth / monthly.perMonth) * 100);
        const recommended = tier === "business";
        return <article key={tier} aria-label={`Plano ${TIERS[tier].name}`} className={`relative flex min-w-0 flex-col overflow-hidden rounded-md border bg-card ${recommended ? "border-primary ring-1 ring-primary" : "border-border"}`}>
          <div className={`flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs font-semibold ${recommended ? "bg-primary text-primary-foreground" : "border-b border-border text-muted-foreground"}`}>
            {recommended ? <><BadgeCheck className="h-4 w-4" />{tr("PLANO INDICADO")}</> : tr("3 DIAS GRÁTIS")}
          </div>
          <div className="flex flex-1 flex-col p-6">
            <h3 className="text-2xl font-semibold">{TIERS[tier].name}</h3>
            <p className="mt-2 min-h-10 text-sm text-muted-foreground">{tr(TIERS[tier].audience)}</p>
            <div className="mt-5 min-h-44">
              <div className="mb-3 flex min-h-6 items-center gap-2">
                {annual ? <><span className="rounded-sm bg-success/15 px-2 py-1 text-xs font-semibold text-success">{tr("Economize")} {discount}%</span><span className="text-sm text-muted-foreground line-through">{currency(monthly.perMonth)}</span></> : <span className="text-xs text-muted-foreground">{tr("Cobrança mensal")}</span>}
              </div>
              <div className="flex flex-wrap items-baseline gap-1"><span className={`text-4xl font-bold ${recommended ? "text-primary" : "text-foreground"}`}>{currency(annual ? yearly.perMonth : monthly.perMonth)}</span><span className="text-sm text-muted-foreground">{tr("/mês")}</span></div>
              <p className="mt-2 text-sm font-medium">{annual ? tr("{0}, cobrado anualmente", [tr(yearly.price)]) : tr("Cobrado mês a mês")}</p>
              <p className="mt-3 text-xs text-muted-foreground">{annual ? tr("Ou {0} no mensal", [tr(monthly.price)]) : tr("{0}/mês no anual, {1}", [currency(yearly.perMonth), tr(yearly.price)])}</p>
            </div>
            {onCheckout ? <Button size="lg" variant={recommended ? "default" : "outline"} className="w-full" disabled={!!pendingTier} onClick={() => onCheckout(tier, annual ? "anual" : "mensal")}>{pendingTier === tier ? tr("Abrindo...") : `${tr(ctaLabel ?? "Testar")} ${tr(annual ? "Anual" : "Mensal")}`}<ArrowUpRight className="h-4 w-4" /></Button> : <Button asChild size="lg" variant={recommended ? "default" : "outline"} className="w-full"><Link to="/assinar" search={{ plano: annual ? "anual" : "mensal", tier }}>{tr("Testar")} {tr(annual ? "Anual" : "Mensal")}<ArrowUpRight className="h-4 w-4" /></Link></Button>}
            <p className="mt-3 text-center text-xs text-muted-foreground">{tr("3 dias grátis")}</p>
            <div className="mt-6 flex-1 border-t border-border pt-6 text-sm">
              <ul className="space-y-3">{INCLUDED.map(item => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{tr(item)}</li>)}</ul>
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-4 font-semibold text-primary">{tier === "starter" ? tr("Sua equipe no Starter") : tr("Mais no {0}", [TIERS[tier].name])}</p>
                <ul className="space-y-3">{TIERS[tier].perks.map(item => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{tr(item)}</li>)}</ul>
              </div>
            </div>
          </div>
        </article>;
      })}
    </div>
  </>;
}