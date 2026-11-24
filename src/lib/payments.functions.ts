import { PLANS, canCancelTrial } from "@/lib/billing";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { trialCheckoutOptions } from "@/lib/trial-checkout";

const PRICE_IDS = Object.keys(PLANS);
type PriceId = string;
const isEnv = (e: unknown): e is StripeEnv => e === "sandbox" || e === "live";

/** Public: anyone can start the trial checkout. The account is created by the webhook. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!PRICE_IDS.includes(d?.priceId as PriceId)) throw new Error("Plano inválido");
    if (!/^https?:\/\//.test(String(d.returnUrl))) throw new Error("Retorno inválido");
    if (!isEnv(d.environment)) throw new Error("Ambiente inválido");
    return { priceId: d.priceId, returnUrl: d.returnUrl, environment: d.environment };
  })
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) throw new Error("Plano não encontrado");
      const session = await stripe.checkout.sessions.create(trialCheckoutOptions(price.id, data.returnUrl));
      if (!session.url) throw new Error("Pagamento indisponível");
      return { url: session.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

async function mySub(context: { supabase: any; userId: string }, env: StripeEnv) {
  const { data } = await context.supabase.from("subscriptions").select("*")
    .eq("user_id", context.userId).eq("environment", env)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) throw new Error("Assinatura não encontrada");
  return data as { stripe_subscription_id: string; status: string; trial_end: string | null };
}

/** Subscriber cancels: during the trial access ends now; after that it lasts until the paid period ends. */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) => {
    if (!isEnv(d?.environment)) throw new Error("Ambiente inválido");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; immediate: boolean } | { error: string }> => {
    try {
      const sub = await mySub(context, data.environment);
      const stripe = createStripeClient(data.environment);
      if (sub.status === "trialing") {
        if (!canCancelTrial(sub.trial_end)) return { error: "O cancelamento do teste fecha 2 horas antes da primeira cobrança." };
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        return { ok: true, immediate: true };
      }
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
      return { ok: true, immediate: false };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Switch to any plan right away, charging the prorated difference. */
export const changeMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priceId: string; environment: StripeEnv }) => {
    if (!PRICE_IDS.includes(d?.priceId as PriceId)) throw new Error("Plano inválido");
    if (!isEnv(d.environment)) throw new Error("Ambiente inválido");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const sub = await mySub(context, data.environment);
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) throw new Error("Plano não encontrado");
      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const item = current.items.data[0];
      if (!item) throw new Error("Assinatura sem plano");
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: item.id, price: price.id }],
        proration_behavior: current.status === "trialing" ? "none" : "always_invoice",
        cancel_at_period_end: false,
      });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Apenas a conta dona do sistema pode fazer isso");
}

/** Owner: e-mail the subscriber a fresh link to create a new password. */
export const resendAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string; origin: string }) => {
    if (!/^[0-9a-f-]{36}$/.test(String(d?.subscriptionId))) throw new Error("Assinante inválido");
    if (!/^https?:\/\/[^/]+$/.test(String(d.origin))) throw new Error("Origem inválida");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: s } = await context.supabase.from("subscriptions").select("email").eq("id", data.subscriptionId).maybeSingle();
    if (!s) throw new Error("Assinante não encontrado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(s.email, { redirectTo: `${data.origin}/reset-password` });
    if (error) throw new Error(`Não foi possível enviar: ${error.message}`);
    return { ok: true };
  });

/** Owner only: change a subscriber's login e-mail (subscribers cannot change it themselves). */
export const changeSubscriberEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string; email: string }) => {
    if (!/^[0-9a-f-]{36}$/.test(String(d?.subscriptionId))) throw new Error("Assinante inválido");
    const email = String(d.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    return { subscriptionId: d.subscriptionId, email };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: s } = await context.supabase.from("subscriptions").select("user_id,stripe_customer_id,environment").eq("id", data.subscriptionId).maybeSingle();
    if (!s?.user_id) throw new Error("Assinante sem acesso criado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(s.user_id, { email: data.email, email_confirm: true });
    if (error) throw new Error(`Não foi possível trocar: ${error.message}`);
    await supabaseAdmin.from("profiles").update({ email: data.email }).eq("id", s.user_id);
    await supabaseAdmin.from("subscriptions").update({ email: data.email }).eq("user_id", s.user_id);
    try {
      await createStripeClient(s.environment as StripeEnv).customers.update(s.stripe_customer_id, { email: data.email });
    } catch (e) {
      console.error("stripe email update failed", e);
    }
    return { ok: true };
  });

/** Owner: give someone access without Stripe. Free = no end date; custom = until the chosen date. */
export const createManualSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; email: string; country?: string; until?: string | null; environment: StripeEnv }) => {
    const email = String(d?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    const until = d.until ? String(d.until) : null;
    if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) throw new Error("Data inválida");
    if (!isEnv(d.environment)) throw new Error("Ambiente inválido");
    return { name: String(d.name ?? "").trim().slice(0, 120), email, country: String(d.country ?? "").trim().slice(0, 60) || null, until, environment: d.environment };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { ensureUser, registerClient } = await import("@/lib/subscribers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await ensureUser(data.email);
    if (!userId) throw new Error("Não foi possível criar o acesso");
    const id = `manual_${crypto.randomUUID()}`;
    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId, email: data.email, name: data.name || null, country: data.country,
      stripe_subscription_id: id, stripe_customer_id: id,
      price_id: data.until ? "acesso_personalizado" : "acesso_gratuito",
      status: "manual", current_period_start: new Date().toISOString(),
      current_period_end: data.until ? new Date(`${data.until}T23:59:59-03:00`).toISOString() : null,
      environment: data.environment,
    });
    if (error) throw new Error(error.message);
    await registerClient(data.email, data.name || null, data.country);
    return { ok: true };
  });

/** Owner: end a free/custom access now. */
export const endManualAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string }) => {
    if (!/^[0-9a-f-]{36}$/.test(String(d?.subscriptionId))) throw new Error("Assinante inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("subscriptions").update({ current_period_end: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", data.subscriptionId).eq("status", "manual");
    return { ok: true };
  });

/** Owner: cancel, pause, or reactivate any subscriber for a month or a year. */
export const adminSubscriptionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string; action: "cancel" | "pause" | "reactivate"; period?: "mensal" | "anual" }) => {
    if (!/^[0-9a-f-]{36}$/.test(String(d?.subscriptionId))) throw new Error("Assinante inválido");
    if (!["cancel", "pause", "reactivate"].includes(d.action)) throw new Error("Ação inválida");
    if (d.action === "reactivate" && d.period !== "mensal" && d.period !== "anual") throw new Error("Escolha mensal ou anual");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    await requireAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: s } = await db.from("subscriptions").select("*").eq("id", data.subscriptionId).maybeSingle();
    if (!s) return { error: "Assinante não encontrado" };
    const isStripe = s.status !== "manual" && !s.stripe_subscription_id.startsWith("manual_");
    const live = isStripe && !["canceled", "incomplete_expired"].includes(s.status);
    const now = new Date();
    try {
      const stripe = isStripe ? createStripeClient(s.environment as StripeEnv) : null;
      if (data.action === "cancel") {
        if (live && stripe) await stripe.subscriptions.cancel(s.stripe_subscription_id);
        await db.from("subscriptions").update({ status: isStripe ? "canceled" : "manual", current_period_end: now.toISOString(), paused: false, cancel_at_period_end: false, updated_at: now.toISOString() }).eq("id", s.id);
      } else if (data.action === "pause") {
        if (live && stripe) await stripe.subscriptions.update(s.stripe_subscription_id, { pause_collection: { behavior: "void" } });
        await db.from("subscriptions").update({ paused: true, updated_at: now.toISOString() }).eq("id", s.id);
      } else {
        const priceKey = data.period === "anual" ? "sistema_anual" : "sistema_mensal";
        if (live && stripe) {
          // Paying subscriber: resume charging on the chosen plan.
          const prices = await stripe.prices.list({ lookup_keys: [priceKey] });
          const price = prices.data[0];
          const cur = await stripe.subscriptions.retrieve(s.stripe_subscription_id);
          const item = cur.items.data[0];
          await stripe.subscriptions.update(s.stripe_subscription_id, {
            pause_collection: "",
            cancel_at_period_end: false,
            ...(price && item && item.price.id !== price.id && { items: [{ id: item.id, price: price.id }], proration_behavior: "none" as const }),
          });
          await db.from("subscriptions").update({ paused: false, price_id: priceKey, cancel_at_period_end: false, updated_at: now.toISOString() }).eq("id", s.id);
        } else {
          // Cancelled or courtesy: free access for one month or one year from today.
          const end = new Date(now);
          if (data.period === "anual") end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
          await db.from("subscriptions").update({ status: "manual", paused: false, price_id: "acesso_personalizado", current_period_start: now.toISOString(), current_period_end: end.toISOString(), updated_at: now.toISOString() }).eq("id", s.id);
        }
      }
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Subscriber: card on file + a Stripe portal link to update it. */
export const getMyPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) => {
    if (!isEnv(d?.environment)) throw new Error("Ambiente inválido");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ brand: string | null; last4: string | null } | { error: string }> => {
    try {
      const sub = await mySub(context, data.environment);
      const stripe = createStripeClient(data.environment);
      const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, { expand: ["default_payment_method", "customer.invoice_settings.default_payment_method"] });
      const cust = s.customer as { invoice_settings?: { default_payment_method?: unknown } } | string;
      const pm = (s.default_payment_method ?? (typeof cust === "object" ? cust.invoice_settings?.default_payment_method : null)) as { card?: { brand?: string; last4?: string } } | null;
      return { brand: pm?.card?.brand ?? null, last4: pm?.card?.last4 ?? null };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const openMyBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv; returnUrl: string }) => {
    if (!isEnv(d?.environment)) throw new Error("Ambiente inválido");
    if (!/^https?:\/\//.test(String(d.returnUrl))) throw new Error("Retorno inválido");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    try {
      const sub = await mySub(context, data.environment) as { stripe_subscription_id: string; stripe_customer_id?: string };
      const stripe = createStripeClient(data.environment);
      const customer = sub.stripe_customer_id ?? String((await stripe.subscriptions.retrieve(sub.stripe_subscription_id)).customer);
      const s = await stripe.billingPortal.sessions.create({ customer, return_url: data.returnUrl, flow_data: { type: "payment_method_update" } });
      return { url: s.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
