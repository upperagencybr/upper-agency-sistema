import { TRIAL_DAYS } from "@/lib/billing";
export function trialCheckoutOptions(priceId: string, returnUrl: string) {
  return { line_items: [{ price: priceId, quantity: 1 }], mode: "subscription" as const, ui_mode: "hosted_page" as const, success_url: returnUrl, cancel_url: new URL("/#planos", returnUrl).href, payment_method_collection: "always" as const, locale: "pt-BR" as const, subscription_data: { trial_period_days: TRIAL_DAYS }, metadata: { managed_payments: "false" } };
}