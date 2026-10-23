"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { announcementSchema } from "@/lib/validators/profile";
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

export async function createAnnouncement(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("officer");
  if (!me) return { error: "Only officers can post announcements." };
  const parsed = announcementSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, author_id: me.id });
  if (error) {
    console.error("announcement insert failed", error);
    return { error: "Could not post the announcement." };
  }
  revalidatePath("/announcements");
  revalidatePath("/");
  return { ok: true, message: "Announcement posted." };
}

export async function deleteAnnouncement(fd: FormData): Promise<void> {
  const me = await role("officer");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id.data);
  revalidatePath("/announcements");
  revalidatePath("/");
}

export async function togglePin(fd: FormData): Promise<void> {
  const me = await role("officer");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const pinned = fd.get("pinned") === "true";
  const supabase = await createClient();
  await supabase.from("announcements").update({ pinned: !pinned }).eq("id", id.data);
  revalidatePath("/announcements");
}

/** Marks one announcement (or all visible ones when no id is given) as read for the current member. */
export async function markRead(id?: string): Promise<void> {
  const me = await role("member");
  if (!me) return;
  const supabase = await createClient();
  const parsed = z.uuid().safeParse(id);
  let ids: string[];
  if (parsed.success) ids = [parsed.data];
  else {
    const { data } = await supabase.from("announcements").select("id").limit(200);
    ids = (data ?? []).map((a) => a.id);
  }
  if (ids.length === 0) return;
  await supabase
    .from("announcement_reads")
    .upsert(ids.map((announcement_id) => ({ announcement_id, profile_id: me.id })), { onConflict: "announcement_id,profile_id", ignoreDuplicates: true });
  revalidatePath("/announcements");
  revalidatePath("/");
}
