import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { portalNavFor, type PortalRole } from "@/components/portal/nav-config";

/** Dense app shell: sidebar on desktop, scrolling tab strip on mobile (large tap targets). */
export function PortalShell({ role, children }: { role: PortalRole; children: React.ReactNode }) {
  const items = portalNavFor(role);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-panel lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-3 lg:py-5">
          <Logo className="w-10" />
          <span className="font-display text-sm uppercase tracking-widest text-gold">Member Portal</span>
        </div>
        <nav aria-label="Portal" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
            >
              <i.icon aria-hidden className="h-4 w-4 text-gold" />
              {i.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
