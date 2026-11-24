import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";
import { ensureUser, registerClient } from "@/lib/subscribers.server";

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

function fields(sub: any) {
  const item = sub.items?.data?.[0];
  return {
    price_id: item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id,
    product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id,
    status: sub.status as string,
    trial_end: iso(sub.trial_end),
    current_period_start: iso(item?.current_period_start ?? sub.current_period_start),
    current_period_end: iso(sub.ended_at ?? item?.current_period_end ?? sub.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}

async function upsertSubscription(sub: any, env: StripeEnv) {
  const db = await admin();
  const stripe = createStripeClient(env);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const customer: any = await stripe.customers.retrieve(customerId);
  const email = String(customer.email ?? "").toLowerCase();
  if (!email) return console.error("subscription without customer email", sub.id);
  const name = customer.name || sub.metadata?.name || null;
  let country: string | null = customer.address?.country ?? null;
  if (!country && sub.default_payment_method) {
    try {
      const pmId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method.id;
      const pm: any = await stripe.paymentMethods.retrieve(pmId);
      country = pm.billing_details?.address?.country ?? pm.card?.country ?? null;
    } catch (e) { console.error("payment method lookup failed", e); }
  }
  const userId = await ensureUser(email);
  const { data: prev } = await db.from("subscriptions").select("past_due_since").eq("stripe_subscription_id", sub.id).maybeSingle();
  const f = fields(sub);
  await db.from("subscriptions").upsert({
    ...f,
    user_id: userId,
    email,
    name,
    country,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    environment: env,
    past_due_since: f.status === "past_due" ? (prev?.past_due_since ?? new Date().toISOString()) : null,
  }, { onConflict: "stripe_subscription_id" });
  await registerClient(email, name, country);
}

async function updateSubscription(sub: any, env: StripeEnv) {
  const db = await admin();
  // Cancelling during the trial ends access immediately.
  if (sub.status === "trialing" && sub.cancel_at_period_end) {
    await createStripeClient(env).subscriptions.cancel(sub.id);
    return;
  }
  const { data: prev } = await db.from("subscriptions").select("id,past_due_since").eq("stripe_subscription_id", sub.id).maybeSingle();
  if (!prev) return upsertSubscription(sub, env);
  const f = fields(sub);
  await db.from("subscriptions").update({
    ...f,
    past_due_since: f.status === "past_due" ? (prev.past_due_since ?? new Date().toISOString()) : null,
  }).eq("stripe_subscription_id", sub.id).eq("environment", env);
}

function invoiceSubId(inv: any): string | null {
  const s = inv.parent?.subscription_details?.subscription ?? inv.subscription;
  return typeof s === "string" ? s : s?.id ?? null;
}

async function handle(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const obj = event.data.object;
  const db = await admin();
  switch (event.type) {
    case "customer.subscription.created":
      await upsertSubscription(obj, env);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await updateSubscription(obj, env);
      break;
    case "invoice.payment_failed": {
      const id = invoiceSubId(obj);
      if (id) await db.from("subscriptions").update({ past_due_since: new Date().toISOString() }).eq("stripe_subscription_id", id).is("past_due_since", null);
      break;
    }
    case "invoice.paid": {
      const id = invoiceSubId(obj);
      if (id) await db.from("subscriptions").update({ past_due_since: null }).eq("stripe_subscription_id", id);
      break;
    }
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        try {
          await handle(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
