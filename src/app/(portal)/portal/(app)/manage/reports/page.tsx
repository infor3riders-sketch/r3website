import Link from "next/link";
import { CalendarDays, ClipboardSignature, Coins, HandHeart, HeartHandshake, ShoppingBag, Users } from "lucide-react";
import { filterControl, filterLabel } from "@/components/portal/report";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { manilaToday } from "@/lib/report-range";
import { listPeriodsAdmin } from "@/server/queries/dues";
import { listAllEvents } from "@/server/queries/events";
import { listMembershipTypesAdmin } from "@/server/queries/admin";
import { listMemberPrograms } from "@/server/queries/volunteering";

export const metadata = { title: "Reports & printing" };

const card = "space-y-3 rounded-lg border border-line bg-panel p-5";
const linkCls = "text-sm font-medium text-gold hover:text-gold-hover";

function CardHead({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="h-7 w-7 shrink-0 text-gold" strokeWidth={1.5} />
      <div>
        <h2 className="text-xl font-semibold uppercase">{title}</h2>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

/** Date-range form shared by the donations and sales reports. */
function RangeForm({ action, id }: { action: string; id: string }) {
  const today = manilaToday();
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor={`${id}-from`} className={filterLabel}>From</label>
        <input id={`${id}-from`} name="from" type="date" defaultValue={`${today.slice(0, 8)}01`} className={filterControl} />
      </div>
      <div>
        <label htmlFor={`${id}-to`} className={filterLabel}>To</label>
        <input id={`${id}-to`} name="to" type="date" defaultValue={today} className={filterControl} />
      </div>
      <Button type="submit" variant="outline">Open report</Button>
    </form>
  );
}

export default async function ReportsPage() {
  const [events, periods, programs, types] = await Promise.all([listAllEvents(8), listPeriodsAdmin(), listMemberPrograms(), listMembershipTypesAdmin()]);
  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Reports &amp; printing</h1>
        <p className="text-sm text-muted">
          Open a report, check the preview, then press Print (or save as PDF from the print dialog). Reports with members&rsquo; personal details are recorded in the audit log.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Member roster" className={card}>
          <CardHead icon={Users} title="Member roster" text="Members with contact details, membership type and role. Optional emergency info and motorcycles for rides." />
          <form action="/manage/reports/roster" className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="r-status" className={filterLabel}>Status</label>
              <select id="r-status" name="status" defaultValue="active" className={`${filterControl} w-full`}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <label htmlFor="r-role" className={filterLabel}>Role</label>
              <select id="r-role" name="role" defaultValue="all" className={`${filterControl} w-full`}>
                <option value="all">All roles</option>
                <option value="member">Members</option>
                <option value="officer">Officers</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            <div>
              <label htmlFor="r-type" className={filterLabel}>Membership type</label>
              <select id="r-type" name="type" defaultValue="" className={`${filterControl} w-full`}>
                <option value="">All types</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-3">
              <input type="checkbox" name="emergency" value="1" className="h-5 w-5 accent-[#f2a81d]" /> Include blood type and emergency contacts
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-3">
              <input type="checkbox" name="bikes" value="1" className="h-5 w-5 accent-[#f2a81d]" /> Include motorcycles and plate numbers
            </label>
            <div className="sm:col-span-3">
              <Button type="submit" variant="gold">Open roster</Button>
            </div>
          </form>
        </section>

        <section aria-label="Event reports" className={card}>
          <CardHead icon={CalendarDays} title="Event report & sign-in sheet" text="Attendance summary for an event, or a blank sheet for riders to sign on the day." />
          {events.length === 0 ? (
            <p className="text-sm text-muted">No events yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.title}</span>
                    <span className="text-xs text-muted">{formatDateTime(e.starts_at)}</span>
                  </span>
                  <span className="flex gap-4">
                    <Link href={`/manage/events/${e.id}/report`} prefetch={false} className={linkCls}>Report</Link>
                    <Link href={`/manage/events/${e.id}/sign-in`} prefetch={false} className={linkCls}>Sign-in sheet</Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/manage/events" className="text-xs text-muted hover:text-white">Older events: open them from Manage Events &rarr;</Link>
        </section>

        <section aria-label="Dues collection" className={card}>
          <CardHead icon={Coins} title="Dues collection" text="Who has paid, is pending or still owes for a dues period, with totals." />
          {periods.length === 0 ? (
            <p className="text-sm text-muted">No dues periods yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {periods.slice(0, 8).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="block font-medium">{p.label}</span>
                    <span className="text-xs text-muted">Due {formatDate(p.due_on)} · {p.paid} of {p.members} paid</span>
                  </span>
                  <Link href={`/manage/dues/${p.id}/report`} prefetch={false} className={linkCls}>Collection report</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Volunteer hours" className={card}>
          <CardHead icon={HeartHandshake} title="Volunteer hours" text="Sign-ups and hours recorded for a program, by slot." />
          {programs.length === 0 ? (
            <p className="text-sm text-muted">No programs yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {programs.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-medium">{p.title}</span>
                  <Link href={`/manage/programs/${p.id}/report`} prefetch={false} className={linkCls}>Hours report</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Donations report" className={card}>
          <CardHead icon={HandHeart} title="Donations" text="Verified donations in a date range, with totals per campaign." />
          <RangeForm action="/manage/reports/donations" id="d" />
        </section>

        <section aria-label="Shop sales report" className={card}>
          <CardHead icon={ShoppingBag} title="Shop sales" text="Paid orders in a date range, with totals per item." />
          <RangeForm action="/manage/reports/sales" id="s" />
        </section>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted">
        <ClipboardSignature aria-hidden className="h-4 w-4" /> Tip: in the print dialog choose &ldquo;Save as PDF&rdquo; to keep a digital copy.
      </p>
    </div>
  );
}
