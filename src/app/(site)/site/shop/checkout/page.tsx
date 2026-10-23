import type { Metadata } from "next";
import { CheckoutForm } from "@/components/site/checkout-form";
import { PageHero, Section } from "@/components/site/page-hero";
import { PaymentInstructions } from "@/components/site/payment-instructions";
import { configuredProviderName } from "@/lib/payments";
import { getPaymentInstructions } from "@/server/queries/orders";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const manual = configuredProviderName() === "manual";
  const instructions = manual ? await getPaymentInstructions() : null;
  return (
    <>
      <PageHero title="Checkout" />
      <Section id="checkout" className="max-w-6xl space-y-8">
        {instructions ? <PaymentInstructions instructions={instructions} /> : null}
        <CheckoutForm />
      </Section>
    </>
  );
}
