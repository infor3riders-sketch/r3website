import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { PaymentInstructions } from "@/components/site/payment-instructions";
import { buttonVariants } from "@/components/ui/button";
import { configuredProviderName } from "@/lib/payments";
import { getPaymentInstructions } from "@/server/queries/orders";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const ref = ((await searchParams).ref ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
  const instructions = configuredProviderName() === "manual" ? await getPaymentInstructions() : null;
  return (
    <>
      <PageHero eyebrow="Donation" title="Thank you, ally" />
      <Section id="thanks" className="max-w-2xl space-y-6 text-center">
        <Check aria-hidden className="mx-auto h-14 w-14 text-gold" />
        <p className="text-lg text-white/90">
          We received your pledge{ref ? <> (reference <span className="font-mono font-semibold text-gold">{ref}</span>)</> : ""}. An officer will verify your payment and email you an acknowledgement.
        </p>
        {instructions ? (
          <div className="text-left">
            <PaymentInstructions instructions={instructions} reference={ref || undefined} />
          </div>
        ) : null}
        <Link href="/" className={buttonVariants({ variant: "outline" })}>Back to home</Link>
      </Section>
    </>
  );
}
