import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "logins", href: "/admin/activity", label: "Login activity" },
  { key: "changes", href: "/admin/audit", label: "Changes (audit log)" },
] as const;

/** Switches between the two admin activity logs. */
export function ActivityTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Activity logs" className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cn("flex min-h-11 items-center rounded-md border px-4 text-sm font-medium", t.key === current ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
