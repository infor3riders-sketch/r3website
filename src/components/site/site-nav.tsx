"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/org";
import { cn } from "@/lib/utils";

/** The browser pathname is the external one, but strip the internal prefix defensively. */
function normalize(pathname: string) {
  return pathname.replace(/^\/site(?=\/|$)/, "") || "/";
}

function isActive(current: string, href: string) {
  return href === "/" ? current === "/" : current === href || current.startsWith(`${href}/`);
}

export function SiteNav({ logo }: { logo: React.ReactNode }) {
  const current = normalize(usePathname());
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b gold-hairline bg-black/90 backdrop-blur">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="R3 Riders Incorporated home" onClick={() => setOpen(false)}>
          {logo}
          <span className="hidden font-display text-lg font-semibold uppercase tracking-widest text-white sm:block">
            R3 Riders
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => {
            const active = isActive(current, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative block px-4 py-5 font-display text-sm font-medium uppercase tracking-wider transition-colors",
                    "after:absolute after:inset-x-4 after:bottom-3 after:h-0.5 after:origin-left after:scale-x-0 after:bg-gold after:transition-transform",
                    active ? "text-white after:scale-x-100" : "text-white/80 hover:text-white hover:after:scale-x-100",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-white lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </nav>

      <div id="mobile-drawer" hidden={!open} className="border-t gold-hairline bg-black lg:hidden">
        <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
          {NAV_LINKS.map((l) => {
            const active = isActive(current, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block border-l-2 px-4 py-3.5 font-display text-base uppercase tracking-wider",
                    active ? "border-gold text-gold" : "border-transparent text-white/85",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
