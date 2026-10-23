import type { Metadata } from "next";
import { CartView } from "@/components/site/cart-view";
import { PageHero, Section } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHero title="Your cart" />
      <Section id="cart" className="max-w-5xl">
        <CartView />
      </Section>
    </>
  );
}
