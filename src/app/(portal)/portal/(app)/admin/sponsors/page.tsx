import Image from "next/image";
import { SponsorForm } from "@/components/portal/admin-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { publicMediaUrl } from "@/lib/supabase/public";
import { deleteSponsor } from "@/server/admin-actions";
import { listSponsorsAdmin } from "@/server/queries/admin";

export const metadata = { title: "Sponsors & partners" };

export default async function SponsorsPage() {
  const sponsors = await listSponsorsAdmin();
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Sponsors &amp; partners</h1>
        <p className="text-sm text-muted">Shown on the public Home page. Sponsors without a logo show their name.</p>
      </header>

      <section aria-labelledby="new-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="new-h" className="text-xl font-semibold uppercase text-gold">New sponsor</h2>
        <SponsorForm />
      </section>

      {sponsors.length === 0 ? (
        <EmptyState title="No sponsors yet" />
      ) : (
        sponsors.map((s) => {
          const logo = publicMediaUrl(s.logo_path);
          return (
            <section key={s.id} aria-label={s.name} className="space-y-3 rounded-lg border border-line bg-panel p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex h-16 w-32 shrink-0 items-center justify-center rounded-md border border-line bg-white/5 p-2">
                  {logo ? <Image src={logo} alt="" fill sizes="128px" className="object-contain p-2" /> : <span className="text-xs uppercase text-muted">No logo</span>}
                </div>
                <h2 className="text-xl font-semibold uppercase">{s.name}</h2>
                <StatusBadge status={s.is_public ? "approved" : "pending"} label={s.is_public ? "Public" : "Hidden"} />
              </div>
              <SponsorForm sponsor={s} />
              <form action={deleteSponsor}>
                <input type="hidden" name="id" value={s.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-red-300">
                  Delete
                </Button>
              </form>
            </section>
          );
        })
      )}
    </div>
  );
}
