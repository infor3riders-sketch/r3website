import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/manage/shop", label: "Orders", id: "orders" },
  { href: "/manage/shop/products", label: "Products", id: "products" },
  { href: "/manage/shop/codes", label: "Discount codes", id: "codes" },
] as const;

export function ShopTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Shop management" className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={t.id === active ? "page" : undefined}
          className={cn("flex min-h-11 items-center rounded-md border px-4 text-sm font-medium", t.id === active ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
