import { Bike, Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/portal/avatar";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import { searchDirectory, signedAvatarUrls } from "@/server/queries/members";

export const metadata = { title: "Member Directory" };

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const members = await searchDirectory(q);
  const avatars = await signedAvatarUrls(members.map((m) => m.avatar_path));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Member Directory</h1>
          <p className="text-sm text-muted">Members appear here only if they chose to be listed, and share only what they allow.</p>
        </div>
        <form role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search by name or road name
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name or road name"
            className="h-11 w-64 max-w-full rounded-md border border-line bg-black/40 px-3 text-sm text-white placeholder:text-muted/70 focus-visible:border-gold"
          />
          <button type="submit" className="h-11 rounded-md border border-line px-4 text-sm font-medium hover:bg-white/10">
            Search
          </button>
        </form>
      </header>

      {members.length === 0 ? (
        <EmptyState title="No members found">{q ? "Try a different search." : "No one has opted in to the directory yet."}</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <li key={m.id} className="flex gap-4 rounded-lg border border-line bg-panel p-4">
              <Avatar name={m.full_name ?? "Member"} src={m.avatar_path ? avatars[m.avatar_path] : null} />
              <div className="min-w-0 space-y-1">
                <p className="truncate text-lg font-semibold text-white">{m.full_name}</p>
                {m.road_name ? <p className="truncate text-sm font-medium text-gold">&ldquo;{m.road_name}&rdquo;</p> : null}
                {m.member_since ? <p className="text-xs text-muted">Member since {formatDate(m.member_since)}</p> : null}
                {m.phone ? (
                  <p className="flex items-center gap-2 text-sm text-white/90">
                    <Phone aria-hidden className="h-4 w-4 text-gold" /> {m.phone}
                  </p>
                ) : null}
                {m.email ? (
                  <p className="flex items-center gap-2 truncate text-sm text-white/90">
                    <Mail aria-hidden className="h-4 w-4 shrink-0 text-gold" /> <span className="truncate">{m.email}</span>
                  </p>
                ) : null}
                {m.motorcycles ? (
                  <p className="flex items-center gap-2 text-sm text-white/90">
                    <Bike aria-hidden className="h-4 w-4 shrink-0 text-gold" /> {m.motorcycles}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
