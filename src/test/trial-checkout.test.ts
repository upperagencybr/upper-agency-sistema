import { expect, it } from "vitest";
import { trialCheckoutOptions } from "@/lib/trial-checkout";
it("inicia três dias grátis no pagamento Stripe sem cobrança avulsa", () => {
  const options = trialCheckoutOptions("price_selected", "https://nexohub.upperagencycompany.co/assinar/obrigado");
  expect(options.subscription_data.trial_period_days).toBe(3);
  expect(options.mode).toBe("subscription");
  expect(options.line_items).toEqual([{ price: "price_selected", quantity: 1 }]);
  expect(options.ui_mode).toBe("hosted_page");
  expect(options.payment_method_collection).toBe("always");
  expect(options.cancel_url).toBe("https://nexohub.upperagencycompany.co/#planos");
});