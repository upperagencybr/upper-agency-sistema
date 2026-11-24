import { getStripeEnvironment } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (getStripeEnvironment() === "sandbox") {
    return (
      <div className="w-full border-b border-primary/40 bg-primary/15 px-4 py-2 text-center text-sm text-foreground">
        Pagamentos em modo de teste, nenhum valor real é cobrado.
      </div>
    );
  }
  return null;
}
