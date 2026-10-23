"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import {
  AVATAR_MAX_BYTES,
  EXT_FOR,
  motorcycleFormSchema,
  profileSchema,
  sniffImage,
} from "@/lib/validators/profile";
import { echoValues, type FormState } from "@/server/form-guard";

const NOT_SIGNED_IN: FormState = { error: "Please sign in again." };

async function member() {
  try {
    return await requireRole("member");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await member();
  if (!me) return NOT_SIGNED_IN;
  const parsed = profileSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  // Role/status/membership fields are not in the schema, and the DB guard trigger blocks them anyway.
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", me.id);
  if (error) {
    console.error("profile update failed", error);
    return { error: "Could not save your profile. Please try again." };
  }
  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatar(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await member();
  if (!me) return NOT_SIGNED_IN;
  const file = fd.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "That image is larger than 2 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: "Upload a JPG, PNG or WebP image." };

  const supabase = await createClient();
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", me.id).maybeSingle();
  const path = `${me.id}/${Date.now()}.${EXT_FOR[type]}`;
  const { error: upErr } = await supabase.storage.from("member-avatars").upload(path, bytes, { contentType: type });
  if (upErr) {
    console.error("avatar upload failed", upErr);
    return { error: "Upload failed. Please try again." };
  }
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", me.id);
  if (error) return { error: "Uploaded, but could not update your profile." };
  if (current?.avatar_path) await supabase.storage.from("member-avatars").remove([current.avatar_path]);

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true, message: "Photo updated." };
}

export async function removeAvatar(): Promise<FormState> {
  const me = await member();
  if (!me) return NOT_SIGNED_IN;
  const supabase = await createClient();
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", me.id).maybeSingle();
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", me.id);
  if (current?.avatar_path) await supabase.storage.from("member-avatars").remove([current.avatar_path]);
  revalidatePath("/profile");
  return { ok: true, message: "Photo removed." };
}

export async function saveMotorcycle(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await member();
  if (!me) return NOT_SIGNED_IN;
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = motorcycleFormSchema.safeParse(plain(fd));
  if (!id.success || !parsed.success) {
    return { fieldErrors: parsed.success ? undefined : fieldErrors(parsed.error), values: echoValues(fd), error: id.success ? undefined : "Invalid request." };
  }

  const supabase = await createClient();
  const result = id.data
    ? await supabase.from("motorcycles").update(parsed.data).eq("id", id.data).eq("profile_id", me.id)
    : await supabase.from("motorcycles").insert({ ...parsed.data, profile_id: me.id });
  if (result.error) {
    console.error("motorcycle save failed", result.error);
    return { error: "Could not save the motorcycle." };
  }
  revalidatePath("/profile/motorcycles");
  return { ok: true, message: id.data ? "Motorcycle updated." : "Motorcycle added." };
}

export async function deleteMotorcycle(fd: FormData): Promise<void> {
  const me = await member();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("motorcycles").delete().eq("id", id.data).eq("profile_id", me.id);
  revalidatePath("/profile/motorcycles");
}
