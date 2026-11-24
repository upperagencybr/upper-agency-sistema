import Stripe from 'stripe';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

/** The connected account's mode comes from the secret key itself (sk_test_ vs sk_live_). */
export function getStripeMode(): StripeEnv {
  return getEnv('STRIPE_SECRET_KEY').startsWith('sk_test_') ? 'sandbox' : 'live';
}

/** Direct connection to the owner's own Stripe account (bring-your-own-key). */
export function createStripeClient(_env?: StripeEnv): Stripe {
  return new Stripe(getEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }

  return 'Stripe request failed';
}

/**
 * Confirms a Stripe notification by fetching the event itself with the account's secret key.
 * A forged request cannot be fetched back from Stripe, so no signing secret is needed here.
 * The event returned by Stripe is the source of truth, never the request body.
 */
export async function verifyWebhook(req: Request, env?: StripeEnv): Promise<{ type: string; data: { object: any } }> {
  const body = (await req.json().catch(() => null)) as { id?: unknown; type?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^evt_[A-Za-z0-9_]+$/.test(id)) throw new Error("Aviso sem identificador válido");
  const event = await createStripeClient(env).events.retrieve(id);
  if (event.type !== body?.type) throw new Error("Aviso não confere com o evento");
  return { type: event.type, data: { object: event.data.object } };
}
