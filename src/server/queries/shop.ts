import "server-only";
import { availableStock } from "@/lib/pricing";
import { createPublicClient, publicMediaUrl } from "@/lib/supabase/public";
import type { Row } from "@/lib/supabase/types";

export interface ShopVariant {
  id: string;
  label: string;
  size: string | null;
  color: string | null;
  price: number;
  available: number;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  images: { url: string; alt: string }[];
  variants: ShopVariant[];
  minPrice: number;
  inStock: boolean;
}

/** Public catalogue via the anon client (RLS: active products/variants only). Raw stock counts are not exposed to pages. */
export async function listProducts(category?: string): Promise<ShopProduct[]> {
  const db = createPublicClient();
  if (!db) return [];
  let q = db.from("products").select("*").order("created_at", { ascending: false });
  if (category) q = q.eq("category", category);
  const { data: products, error } = await q;
  if (error || !products?.length) return [];
  return hydrate(db, products);
}

export async function getProduct(slug: string): Promise<ShopProduct | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data } = await db.from("products").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  return (await hydrate(db, [data]))[0] ?? null;
}

export async function listCategories(): Promise<string[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from("products").select("category");
  return [...new Set((data ?? []).map((p) => p.category).filter((c): c is string => Boolean(c)))].sort();
}

async function hydrate(db: NonNullable<ReturnType<typeof createPublicClient>>, products: Row<"products">[]): Promise<ShopProduct[]> {
  const ids = products.map((p) => p.id);
  const [{ data: variants }, { data: images }] = await Promise.all([
    db.from("product_variants").select("*").in("product_id", ids).order("price_php", { ascending: true }),
    db.from("product_images").select("*").in("product_id", ids).order("sort_order", { ascending: true }),
  ]);
  return products.map((p) => {
    const vs: ShopVariant[] = (variants ?? [])
      .filter((v) => v.product_id === p.id)
      .map((v) => ({ id: v.id, label: v.label, size: v.size, color: v.color, price: Number(v.price_php), available: availableStock(v) }));
    const imgs = (images ?? [])
      .filter((i) => i.product_id === p.id)
      .map((i) => ({ url: publicMediaUrl(i.path) ?? "", alt: i.alt ?? p.name }))
      .filter((i) => i.url);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      images: imgs,
      variants: vs,
      minPrice: vs.length ? Math.min(...vs.map((v) => v.price)) : 0,
      inStock: vs.some((v) => v.available > 0),
    };
  });
}
