import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProgramForm, SlotForm } from "@/components/portal/volunteer-forms";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";
import { deleteProgram, deleteSlot, updateSignup } from "@/server/volunteer-actions";
import { listAllEvents } from "@/server/queries/events";
import { getProgramById, getProgramRoster } from "@/server/queries/volunteering";

export const metadata = { title: "Program roster" };

export default async function ManageProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const program = await getProgramById(id);
  if (!program) notFound();
  const [{ rows, slots, totalHours }, events] = await Promise.all([getProgramRoster(id), listAllEvents(100)]);

  return (
    <div className="space-y-8">
      <Link href="/manage/programs" className="text-sm text-gold hover:text-gold-hover">
        &larr; All programs
      </Link>
      <header>
        <h1 className="text-3xl font-semibold uppercase">{program.title}</h1>
        <p className="text-sm text-muted">{rows.filter((r) => r.status !== "cancelled").length} active sign-ups · {totalHours} volunteer hours recorded</p>
      </header>

      <section aria-labelledby="slots-h" className="space-y-3">
        <h2 id="slots-h" className="text-2xl font-semibold uppercase text-gold">Slots</h2>
        {slots.length > 0 ? (
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
            {slots.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted">
                    {s.starts_at ? formatDateTime(s.starts_at) : "Flexible"} · {s.taken}
                    {s.capacity ? `/${s.capacity}` : ""} filled
                  </p>
                </div>
                <form action={deleteSlot}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="program_id" value={program.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-300">Delete</Button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="rounded-lg border border-line bg-panel p-4">
          <SlotForm programId={program.id} events={events.map((e) => ({ id: e.id, title: e.title }))} />
        </div>
      </section>

      <section aria-labelledby="roster-h" className="space-y-3">
        <h2 id="roster-h" className="text-2xl font-semibold uppercase text-gold">Volunteer roster</h2>
        {rows.length === 0 ? (
          <p className="text-muted">No sign-ups yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">Volunteer</th>
                  <th scope="col" className="px-3 py-2">Slot</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">Hours</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Save</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-white">{r.name}</p>
                      <p className="text-xs text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}{r.profile_id ? " · member" : " · public"}</p>
                    </td>
                    <td className="px-3 py-2 text-muted">{r.slot_title}</td>
                    <td colSpan={3} className="px-3 py-2">
                      <form action={updateSignup} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="program_id" value={program.id} />
                        <label className="sr-only" htmlFor={`st-${r.id}`}>Status for {r.name}</label>
                        <Select id={`st-${r.id}`} name="status" defaultValue={r.status} className="w-36">
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </Select>
                        <label className="sr-only" htmlFor={`hr-${r.id}`}>Hours for {r.name}</label>
                        <Input id={`hr-${r.id}`} name="hours" type="number" step="0.25" min={0} defaultValue={r.hours ?? ""} className="w-24" placeholder="Hours" />
                        <Button type="submit" size="sm" variant="outline">Save</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="edit-h" className="max-w-3xl space-y-3">
        <h2 id="edit-h" className="text-2xl font-semibold uppercase text-gold">Edit program</h2>
        <div className="rounded-lg border border-line bg-panel p-5">
          <ProgramForm program={program} />
        </div>
        <form action={deleteProgram}>
          <input type="hidden" name="id" value={program.id} />
          <Button type="submit" variant="danger" size="sm">Delete program</Button>
        </form>
      </section>
    </div>
  );
}
