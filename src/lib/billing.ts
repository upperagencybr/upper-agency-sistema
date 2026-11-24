/** Pure subscription rules shared by the app gate, the Assinantes tab and tests. */
export type Tier = "starter" | "business" | "enterprise";
/** Business keeps the original sistema_* ids so existing subscriptions stay valid. */
export const PLANS = {
  starter_mensal: { tier: "starter", cycle: "mensal", label: "Starter Mensal", price: "R$ 19,99/mês", perMonth: 19.99 },
  starter_anual: { tier: "starter", cycle: "anual", label: "Starter Anual", price: "R$ 119,88/ano", perMonth: 9.99 },
  sistema_mensal: { tier: "business", cycle: "mensal", label: "Business Mensal", price: "R$ 29,99/mês", perMonth: 29.99 },
  sistema_anual: { tier: "business", cycle: "anual", label: "Business Anual", price: "R$ 239,88/ano", perMonth: 19.99 },
  enterprise_mensal: { tier: "enterprise", cycle: "mensal", label: "Enterprise Mensal", price: "R$ 49,99/mês", perMonth: 49.99 },
  enterprise_anual: { tier: "enterprise", cycle: "anual", label: "Enterprise Anual", price: "R$ 479,88/ano", perMonth: 39.99 },
} as const;
/** Limits per tier; the database triggers enforce the same numbers. */
export const TIERS: Record<Tier, { name: string; audience: string; companies: number; socios: number; funcionarios: number; tags: number | null; perks: string[] }> = {
  starter: { name: "Starter", audience: "Para empreendedor ou pessoa física", companies: 1, socios: 0, funcionarios: 1, tags: 3, perks: ["Até 3 etiquetas personalizadas", "1 empresa cadastrada", "Sem sócios", "1 funcionário editor (sem excluir e sem Financeiro)"] },
  business: { name: "Business", audience: "Para negócios em crescimento", companies: 2, socios: 1, funcionarios: 3, tags: 5, perks: ["Até 5 etiquetas personalizadas", "Até 2 empresas cadastradas", "1 sócio", "Até 3 funcionários editores"] },
  enterprise: { name: "Enterprise", audience: "Para empresas já sólidas", companies: 10, socios: 10, funcionarios: 100, tags: null, perks: ["Etiquetas ilimitadas", "Até 10 empresas cadastradas", "Até 10 sócios", "Até 100 funcionários com níveis e abas diferentes"] },
};
export const planId = (tier: Tier, cycle: "mensal" | "anual"): PlanId => (Object.keys(PLANS) as PlanId[]).find((k) => PLANS[k].tier === tier && PLANS[k].cycle === cycle)!;
export const MANUAL_PLANS: Record<string, string> = { acesso_gratuito: "Gratuito", acesso_personalizado: "Personalizado" };
export type PlanId = keyof typeof PLANS;
export const TRIAL_DAYS = 3;
/** Trial cancellation closes this long before the first charge. */
export const TRIAL_CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;
/** False when the trial ends in less than the cutoff (cancel is locked, the charge goes through). */
export function canCancelTrial(trialEnd: string | null | undefined, now = Date.now()): boolean {
  if (!trialEnd) return true;
  return Date.parse(trialEnd) - now > TRIAL_CANCEL_CUTOFF_MS;
}
/** After the first failed renewal, access stays open this long (one retry window). */
export const PAST_DUE_GRACE_MS = 24 * 60 * 60 * 1000;

export type SubLike = {
  status: string;
  current_period_end: string | null;
  past_due_since: string | null;
  paused?: boolean;
};

/** True when the subscriber must see the blocked screen. No subscription row = not a subscriber = never blocked. */
export function accessBlocked(sub: SubLike | null | undefined, now = Date.now()): boolean {
  if (!sub) return false;
  if (sub.paused) return true;
  const end = sub.current_period_end ? Date.parse(sub.current_period_end) : null;
  switch (sub.status) {
    case "active":
    case "trialing":
      return false;
    case "past_due": {
      const since = sub.past_due_since ? Date.parse(sub.past_due_since) : now;
      return now - since >= PAST_DUE_GRACE_MS;
    }
    case "manual": // free (no end) or custom access given by the owner
      return !!(end && end <= now);
    case "canceled":
      return !(end && end > now);
    default:
      return true; // unpaid, incomplete, incomplete_expired, paused
  }
}

export type SubSituation = "teste" | "ativo" | "atrasado" | "cancelando" | "cancelado" | "bloqueado" | "cortesia" | "pausado";
export function situation(sub: SubLike & { cancel_at_period_end?: boolean }, now = Date.now()): SubSituation {
  if (sub.paused) return "pausado";
  if (accessBlocked(sub, now)) return sub.status === "canceled" || sub.status === "manual" ? "cancelado" : "bloqueado";
  if (sub.status === "manual") return "cortesia";
  if (sub.status === "past_due") return "atrasado";
  if (sub.status === "canceled" || sub.cancel_at_period_end) return "cancelando";
  if (sub.status === "trialing") return "teste";
  return "ativo";
}

/** Days until the next charge/end date (ceil), null when unknown. */
export function daysUntilRenewal(sub: { status: string; trial_end?: string | null; current_period_end?: string | null }, now = Date.now()): number | null {
  const end = sub.status === "trialing" ? sub.trial_end ?? sub.current_period_end : sub.current_period_end;
  if (!end) return null;
  return Math.max(0, Math.ceil((new Date(end).getTime() - now) / 86400000));
}

/** Status label: "Ativa", or "Ativa, vence em N dias" when 3 days or fewer remain. */
export function renewalLabel(days: number | null, base = "Ativa"): string {
  if (days === null || days > 3) return base;
  if (days === 0) return `${base}, vence hoje`;
  return `${base}, vence em ${days} dia${days === 1 ? "" : "s"}`;
}

/** Errors raised by plan-limit triggers mention "plano"; these open the upgrade screen. */
export const isPlanLimitError = (msg: string) => /seu plano|no plano|suba para o plano/i.test(msg);
