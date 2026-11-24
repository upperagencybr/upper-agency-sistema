import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

// Chave pública da conta Stripe do dono do sistema (segura para ficar no código).
// Quando a conta sair do modo teste, trocar para a pk_live_ correspondente.
const PUBLISHABLE_KEY =
  (import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'] as string | undefined) ??
  "pk_live_51UbKsNEYGwLpArYMxelHwrEp4QJA4BA0Q44U5PXaoRAFACq08ljDQpsjiD8sjdZE5ELkyVpUcSUpzttrdnwI69Mg00NmRNDbwQ";

function paymentsEnvironment(): StripeEnv {
  if (PUBLISHABLE_KEY.startsWith("pk_test_")) return "sandbox";
  if (PUBLISHABLE_KEY.startsWith("pk_live_")) return "live";
  throw new Error("Pagamentos ainda não configurados.");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(PUBLISHABLE_KEY);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}
