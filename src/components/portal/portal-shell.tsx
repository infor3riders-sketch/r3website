import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { portalNavFor, type PortalRole } from "@/components/portal/nav-config";
import { signOut } from "@/server/auth-actions";

interface ShellUser {
  name: string;
  role: PortalRole;
}

/** Dense app shell: sidebar on desktop, scrolling tab strip on mobile (large tap targets). */
export function PortalShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const items = portalNavFor(user.role);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b border-line bg-panel lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-3 lg:py-5">
          <Logo className="w-10" />
          <span className="font-display text-sm uppercase tracking-widest text-gold">Member Portal</span>
        </div>
        <nav aria-label="Portal" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pb-0">
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
        <div className="hidden items-center justify-between gap-2 border-t border-line p-3 lg:flex">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white" data-testid="user-name">
              {user.name}
            </p>
            <p className="text-xs capitalize text-muted">{user.role}</p>
          </div>
          <form action={signOut}>
            <button type="submit" aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden className="h-5 w-5" />
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <p className="truncate text-sm text-muted">
            Signed in as <span className="text-white">{user.name}</span>
          </p>
          <form action={signOut}>
            <button type="submit" className="min-h-11 rounded-md px-3 text-sm font-medium text-gold hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
