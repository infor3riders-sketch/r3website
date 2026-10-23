import Link from "next/link";
import { History, Images, Newspaper, Settings2, Users } from "lucide-react";

export const metadata = { title: "Admin" };

const TOOLS = [
  { href: "/admin/members", icon: Users, title: "Members & roles", text: "Invite members, change roles and status." },
  { href: "/admin/settings", icon: Settings2, title: "Site content & settings", text: "About, officers, contact, membership stats, payment instructions." },
  { href: "/admin/news", icon: Newspaper, title: "News", text: "Write and publish news posts." },
  { href: "/admin/gallery", icon: Images, title: "Gallery", text: "Photo albums for the public site." },
  { href: "/admin/audit", icon: History, title: "Audit log", text: "Who changed what, and data exports." },
] as const;

export default function AdminHomePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Admin</h1>
        <p className="text-sm text-muted">Events, programs, shop, donations, dues and documents are managed from the officer menu.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="flex h-full gap-4 rounded-lg border border-line bg-panel p-5 hover:border-gold">
              <t.icon aria-hidden className="h-8 w-8 shrink-0 text-gold" strokeWidth={1.5} />
              <span>
                <span className="block text-xl font-semibold uppercase">{t.title}</span>
                <span className="text-sm text-muted">{t.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
