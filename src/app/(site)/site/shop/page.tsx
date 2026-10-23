import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, Section } from "@/components/site/page-hero";
import { EmptyState } from "@/components/ui/states";
import { formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCategories, listProducts } from "@/server/queries/shop";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Shop",
  description: "Official R3 Riders merchandise. Every purchase supports our charity rides and outreach.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const category = (await searchParams).category?.slice(0, 60);
  const [products, categories] = await Promise.all([listProducts(category), listCategories()]);
  const chip = (active: boolean) => cn("flex min-h-11 items-center rounded-md border px-4 text-sm font-medium", active ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10");

  return (
    <>
      <PageHero eyebrow="Shop" title="Ride in R3 colors" subtitle="Support our cause with R3 Riders merch." />
      <Section id="products">
        {categories.length > 0 ? (
          <nav aria-label="Categories" className="mb-6 flex flex-wrap gap-2">
            <Link href="/shop" className={chip(!category)}>All</Link>
            {categories.map((c) => (
              <Link key={c} href={`/shop?category=${encodeURIComponent(c)}`} className={chip(category === c)}>
                {c}
              </Link>
            ))}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <EmptyState title="Merchandise is coming soon">Check back shortly for new gear.</EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id} className="group overflow-hidden rounded-lg border border-line bg-panel shadow-card">
                <Link href={`/shop/${p.slug}`} className="block">
                  <div className="relative aspect-square bg-ink">
                    {p.images[0] ? (
                      <Image src={p.images[0].url} alt={p.images[0].alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
                    )}
                    {!p.inStock ? <span className="absolute left-3 top-3 rounded bg-black/80 px-2 py-1 text-xs font-semibold uppercase">Sold out</span> : null}
                  </div>
                  <div className="p-4">
                    <h2 className="text-xl font-semibold uppercase">{p.name}</h2>
                    <p className="mt-1 text-gold">{p.variants.length > 1 ? "From " : ""}{formatPHP(p.minPrice)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
