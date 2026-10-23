"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fitsCapacity, isPastEvent } from "@/lib/events";
import { AuthError, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { eventSchema, rsvpSchema } from "@/lib/validators/events";
import { echoValues, type FormState } from "@/server/form-guard";

async function role(min: "member" | "officer") {
  try {
    return await requireRole(min);
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));

// ---------------------------------------------------------------------------
// Member RSVP
// ---------------------------------------------------------------------------
export async function saveRsvp(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("member");
  if (!me) return { error: "Please sign in again." };
  const parsed = rsvpSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", d.event_id).maybeSingle();
  if (!event) return { error: "Event not found." };
  if (isPastEvent(event)) return { error: "This event has already taken place." };
  if (d.status === "going" && event.requires_waiver && !d.waiver) {
    return { fieldErrors: { waiver: "Please acknowledge the ride waiver to join." }, values: echoValues(fd) };
  }

  const party = d.status === "going" ? d.riders + d.passengers : 0;
  if (d.status === "going" && event.capacity != null) {
    // Friendly pre-check; the database trigger is the real guard against races.
    const [{ data: seats }, { data: mine }] = await Promise.all([
      supabase.rpc("event_seats_taken", { p_events: [event.id] }),
      supabase.from("event_rsvps").select("riders, passengers, status").eq("event_id", event.id).eq("profile_id", me.id).maybeSingle(),
    ]);
    const taken = Number(seats?.[0]?.taken ?? 0);
    const own = mine?.status === "going" ? mine.riders + mine.passengers : 0;
    if (!fitsCapacity(event.capacity, taken, party, own)) return { error: "Sorry, there are not enough seats left for your group." };
  }

  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: event.id,
      profile_id: me.id,
      status: d.status,
      riders: d.status === "no" ? 0 : d.riders,
      passengers: d.status === "no" ? 0 : d.passengers,
      waiver_signed_at: d.status === "going" && event.requires_waiver && d.waiver ? new Date().toISOString() : null,
    },
    { onConflict: "event_id,profile_id" },
  );
  if (error) {
    if (error.message.includes("event_full")) return { error: "Sorry, this event just filled up." };
    console.error("rsvp failed", error);
    return { error: "Could not save your RSVP. Please try again." };
  }
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/");
  return { ok: true, message: d.status === "going" ? "You're in! See you on the road." : d.status === "maybe" ? "Marked as maybe." : "Marked as not going." };
}

// ---------------------------------------------------------------------------
// Officer: manage events
// ---------------------------------------------------------------------------
export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("officer");
  if (!me) return { error: "Only officers can manage events." };
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = eventSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  const supabase = await createClient();
  const row = parsed.data;
  if (id.data) {
    const { error } = await supabase.from("events").update(row).eq("id", id.data);
    if (error) return failure(error);
    revalidateEvents(row.slug);
    return { ok: true, message: "Event updated." };
  }
  const { data, error } = await supabase.from("events").insert({ ...row, created_by: me.id }).select("id").single();
  if (error) return failure(error);
  revalidateEvents(row.slug);
  redirect(`/manage/events/${data.id}`);
}

function failure(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used by another event." } };
  console.error("event save failed", error);
  return { error: "Could not save the event." };
}

function revalidateEvents(slug: string) {
  revalidatePath("/manage/events");
  revalidatePath("/events");
  revalidatePath("/");
  // public site caches (ISR) are refreshed on their own 5 minute timer
  void slug;
}

export async function deleteEvent(fd: FormData): Promise<void> {
  const me = await role("officer");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id.data);
  revalidateEvents("");
  redirect("/manage/events");
}

/** Officer check-in toggle for any active member (RSVP not required). */
export async function toggleCheckIn(fd: FormData): Promise<void> {
  const me = await role("officer");
  const eventId = z.uuid().safeParse(fd.get("event_id"));
  const profileId = z.uuid().safeParse(fd.get("profile_id"));
  if (!me || !eventId.success || !profileId.success) return;
  const supabase = await createClient();
  const { data: existing } = await supabase.from("event_attendance").select("id").eq("event_id", eventId.data).eq("profile_id", profileId.data).maybeSingle();
  if (existing) await supabase.from("event_attendance").delete().eq("id", existing.id);
  else await supabase.from("event_attendance").insert({ event_id: eventId.data, profile_id: profileId.data, checked_in_by: me.id });
  revalidatePath(`/manage/events/${eventId.data}`);
}
