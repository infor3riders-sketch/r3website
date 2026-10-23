import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ProductView } from "@/components/site/product-view";
import { Section } from "@/components/site/page-hero";
import { siteUrl } from "@/lib/env";
import { getProduct } from "@/server/queries/shop";

export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return { title: p.name, description: p.description?.slice(0, 160) ?? undefined, openGraph: p.images[0] ? { images: [p.images[0].url] } : undefined };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description ?? undefined,
          image: product.images.map((i) => i.url),
          url: siteUrl(`/shop/${product.slug}`),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "PHP",
            lowPrice: product.minPrice,
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
      <Section id="product" className="max-w-6xl">
        <ProductView product={product} />
      </Section>
    </>
  );
}
