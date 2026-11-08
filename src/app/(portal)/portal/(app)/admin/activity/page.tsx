import Link from "next/link";
import { z } from "zod";
import { ActivityTabs } from "@/components/portal/activity-tabs";
import { EmptyState } from "@/components/ui/states";
import { formatDateTimeFull } from "@/lib/format";
import { parseReportRange } from "@/lib/report-range";
import { cn } from "@/lib/utils";
import { getProfileName, LOGIN_EVENT_LABEL, LOGIN_EVENT_TYPES, listLoginEvents } from "@/server/queries/activity";

export const metadata = { title: "Login activity" };
export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  login: "text-emerald-300",
  logout: "text-white/85",
  login_failed: "text-amber-300",
  access_revoked: "text-red-300",
  access_restored: "text-emerald-300",
};

export default async function LoginActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page) || 0);
  const event = z.enum(LOGIN_EVENT_TYPES).nullable().catch(null).parse(sp.event || null);
  const member = z.uuid().nullable().catch(null).parse(sp.member || null);
  const range = sp.from || sp.to ? parseReportRange(sp.from || sp.to, sp.to || sp.from) : null;

  const [{ rows, pageSize }, memberName] = await Promise.all([
    listLoginEvents({ profileId: member, event, from: range?.startIso, to: range?.endIso, page }),
    member ? getProfileName(member) : Promise.resolve(null),
  ]);

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { event: event ?? undefined, member: member ?? undefined, from: range?.from, to: range?.to, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "0")) p.set(k, v);
    const s = p.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };
  const control = "h-11 rounded-md border border-line bg-black/40 px-3 text-white";

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Login activity</h1>
          <p className="text-sm text-muted">Every sign-in, sign-out and failed attempt, and when an admin turned someone&apos;s access on or off. Times are Philippine time, to the second.</p>
        </div>
        <ActivityTabs current="logins" />
      </header>

      {member ? (
        <p className="flex flex-wrap items-center gap-3 text-sm">
          Showing only <strong className="text-white">{memberName ?? "this member"}</strong>
          <Link href={qs({ member: undefined, page: "0" })} className="text-gold hover:text-gold-hover">Show everyone</Link>
        </p>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" role="search">
        {member ? <input type="hidden" name="member" value={member} /> : null}
        <label className="text-sm">
          <span className="mb-1 block text-muted">What</span>
          <select name="event" defaultValue={event ?? ""} className={control}>
            <option value="">Everything</option>
            {LOGIN_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{LOGIN_EVENT_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">From</span>
          <input type="date" name="from" defaultValue={range?.from ?? ""} className={control} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">To</span>
          <input type="date" name="to" defaultValue={range?.to ?? ""} className={control} />
        </label>
        <button type="submit" className="h-11 rounded-md border border-line px-4 text-sm font-medium hover:bg-white/10">Filter</button>
        {event || range ? <Link href={qs({ event: undefined, from: undefined, to: undefined, page: "0" })} className="flex h-11 items-center text-sm text-gold hover:text-gold-hover">Clear</Link> : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No activity found">{page > 0 ? "There are no older entries." : "Sign-ins and sign-outs will appear here."}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Date &amp; time</th>
                <th scope="col" className="px-4 py-3">Who</th>
                <th scope="col" className="px-4 py-3">What happened</th>
                <th scope="col" className="px-4 py-3">Device</th>
                <th scope="col" className="px-4 py-3">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-white/90">
                    <time dateTime={r.created_at}>{formatDateTimeFull(r.created_at)}</time>
                  </td>
                  <td className="px-4 py-2">
                    {r.profile_id ? (
                      <Link href={qs({ member: r.profile_id, page: "0" })} className="font-medium hover:text-gold">{r.person}</Link>
                    ) : (
                      <span className="font-medium">{r.person}</span>
                    )}
                    {r.email && r.email !== r.person ? <div className="text-xs text-muted">{r.email}</div> : null}
                  </td>
                  <td className={cn("px-4 py-2", TONE[r.event])}>{r.label}</td>
                  <td className="px-4 py-2 text-xs text-muted" title={r.user_agent ?? undefined}>{r.device}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{r.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Pagination" className="flex gap-3 text-sm">
        {page > 0 ? <Link href={qs({ page: String(page - 1) })} className="text-gold hover:text-gold-hover">&larr; Newer</Link> : null}
        {rows.length === pageSize ? <Link href={qs({ page: String(page + 1) })} className="text-gold hover:text-gold-hover">Older &rarr;</Link> : null}
      </nav>

      <p className="text-xs text-muted">
        &ldquo;Signed out&rdquo; is recorded when someone presses Sign out. Closing the browser or letting a session expire does not create an entry.
      </p>
    </div>
  );
}
