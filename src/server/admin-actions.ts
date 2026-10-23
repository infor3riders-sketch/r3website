"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { portalUrl } from "@/lib/env";
import { settingDef } from "@/lib/settings-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { albumSchema, inviteSchema, memberUpdateSchema, membershipTypeSchema, newsSchema } from "@/lib/validators/admin";
import { EXT_FOR, sniffImage } from "@/lib/validators/profile";
import { echoValues, type FormState } from "@/server/form-guard";

async function admin() {
  try {
    return await requireRole("admin");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}
const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION") && k !== "cover" && k !== "photo"));
const NOT_AUTH: FormState = { error: "Only admins can do that." };

/** The public site caches pages for a few minutes; this refreshes the ones that read site settings now. */
const PUBLIC_PATHS = ["/site", "/site/about", "/site/membership", "/site/contact", "/site/donations", "/site/news", "/site/services"];
const refreshSite = () => PUBLIC_PATHS.forEach((p) => revalidatePath(p));

// ---------------------------------------------------------------------------
// Site content
// ---------------------------------------------------------------------------
export async function saveSetting(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const def = settingDef(String(fd.get("key") ?? ""));
  if (!def) return { error: "Unknown setting." };
  const raw: Record<string, string> = {};
  for (const f of def.fields) raw[f.name] = typeof fd.get(f.name) === "string" ? String(fd.get(f.name)) : "";
  const parsed = def.parse(raw);
  if (!parsed.ok) return { fieldErrors: parsed.errors, values: raw };

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({ key: def.key, value: parsed.value, is_public: def.isPublic, updated_by: me.id }, { onConflict: "key" });
  if (error) {
    console.error("setting save failed", error);
    return { error: "Could not save." };
  }
  refreshSite();
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function updateMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const parsed = memberUpdateSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, ...changes } = parsed.data;
  // Safety: an admin cannot remove their own admin access or deactivate themselves (prevents lockout).
  if (id === me.id && (changes.role !== "admin" || changes.status !== "active")) return { error: "You cannot demote or deactivate your own account. Ask another admin." };

  const supabase = await createClient(); // RLS + the guard trigger independently require an admin
  const { error } = await supabase.from("profiles").update(changes).eq("id", id);
  if (error) {
    console.error("member update failed", error);
    return { error: "Could not update the member." };
  }
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return { ok: true, message: "Member updated." };
}

export async function inviteMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const parsed = inviteSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  let client: ReturnType<typeof createAdminClient>;
  try {
    client = createAdminClient();
  } catch {
    return { error: "The service role key is not configured." };
  }
  const { data, error } = await client.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: portalUrl("/auth/callback?next=/accept-invite"),
    data: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) {
    console.error("invite failed", error);
    return { error: error?.message?.includes("already") ? "That email already has an account." : "Could not send the invitation." };
  }
  const { error: pErr } = await client
    .from("profiles")
    .update({ full_name: parsed.data.full_name, role: parsed.data.role, member_since: new Date().toISOString().slice(0, 10) })
    .eq("id", data.user.id);
  if (pErr) return { error: "Invitation sent, but the role could not be set. Set it from the member page." };
  revalidatePath("/admin/members");
  return { ok: true, message: `Invitation sent to ${parsed.data.email}.` };
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------
async function uploadImage(supabase: Awaited<ReturnType<typeof createClient>>, file: FormDataEntryValue | null, folder: string): Promise<{ path?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > 5 * 1024 * 1024) return { error: "Images must be under 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: "Upload a JPG, PNG or WebP image." };
  const path = `${folder}/${Date.now()}.${EXT_FOR[type]}`;
  const { error } = await supabase.storage.from("public-media").upload(path, bytes, { contentType: type });
  if (error) {
    console.error("image upload failed", error);
    return { error: "Image upload failed." };
  }
  return { path };
}

export async function saveNews(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = newsSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  const supabase = await createClient();
  const newId = id.data ?? crypto.randomUUID();
  const cover = await uploadImage(supabase, fd.get("cover"), `news/${newId}`);
  if (cover.error) return { error: cover.error, values: echoValues(fd) };
  const row = { ...parsed.data, ...(cover.path ? { cover_path: cover.path } : {}) };

  const { error } = id.data
    ? await supabase.from("news_posts").update(row).eq("id", id.data)
    : await supabase.from("news_posts").insert({ ...row, id: newId, author_id: me.id });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used by another post." }, values: echoValues(fd) };
    console.error("news save failed", error);
    return { error: "Could not save the post." };
  }
  refreshSite();
  revalidatePath("/admin/news");
  if (!id.data) redirect(`/admin/news/${newId}`);
  return { ok: true, message: "Post saved." };
}

export async function deleteNews(fd: FormData): Promise<void> {
  const me = await admin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("news_posts").delete().eq("id", id.data);
  refreshSite();
  revalidatePath("/admin/news");
  redirect("/admin/news");
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export async function saveAlbum(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = albumSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  if (id.data) {
    const { error } = await supabase.from("gallery_albums").update(parsed.data).eq("id", id.data);
    if (error) return albumFailure(error);
    revalidatePath("/site/gallery");
    revalidatePath(`/admin/gallery/${id.data}`);
    return { ok: true, message: "Album saved." };
  }
  const { data, error } = await supabase.from("gallery_albums").insert(parsed.data).select("id").single();
  if (error) return albumFailure(error);
  revalidatePath("/admin/gallery");
  redirect(`/admin/gallery/${data.id}`);
}

function albumFailure(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used by another album." } };
  console.error("album save failed", error);
  return { error: "Could not save the album." };
}

export async function deleteAlbum(fd: FormData): Promise<void> {
  const me = await admin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  const { data: photos } = await supabase.from("gallery_photos").select("path").eq("album_id", id.data);
  await supabase.from("gallery_albums").delete().eq("id", id.data);
  if (photos?.length) await supabase.storage.from("public-media").remove(photos.map((p) => p.path));
  revalidatePath("/admin/gallery");
  revalidatePath("/site/gallery");
  redirect("/admin/gallery");
}

export async function uploadAlbumPhoto(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const albumId = z.uuid().safeParse(fd.get("album_id"));
  if (!albumId.success) return { error: "Invalid request." };
  const supabase = await createClient();
  const up = await uploadImage(supabase, fd.get("photo"), `gallery/${albumId.data}`);
  if (up.error) return { error: up.error };
  if (!up.path) return { error: "Choose an image." };
  const { count } = await supabase.from("gallery_photos").select("id", { count: "exact", head: true }).eq("album_id", albumId.data);
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 200) || null;
  const { error } = await supabase.from("gallery_photos").insert({ album_id: albumId.data, path: up.path, caption, sort_order: count ?? 0 });
  if (error) return { error: "Uploaded, but could not attach the photo." };
  revalidatePath(`/admin/gallery/${albumId.data}`);
  revalidatePath("/site/gallery");
  return { ok: true, message: "Photo added." };
}

export async function deletePhoto(fd: FormData): Promise<void> {
  const me = await admin();
  const id = z.uuid().safeParse(fd.get("id"));
  const albumId = z.uuid().safeParse(fd.get("album_id"));
  if (!me || !id.success || !albumId.success) return;
  const supabase = await createClient();
  const { data: photo } = await supabase.from("gallery_photos").select("path").eq("id", id.data).maybeSingle();
  await supabase.from("gallery_photos").delete().eq("id", id.data);
  if (photo?.path) await supabase.storage.from("public-media").remove([photo.path]);
  revalidatePath(`/admin/gallery/${albumId.data}`);
  revalidatePath("/site/gallery");
}

// ---------------------------------------------------------------------------
// Membership types (shown on the public Membership page and in the application form)
// ---------------------------------------------------------------------------
export async function saveMembershipType(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await admin();
  if (!me) return NOT_AUTH;
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = membershipTypeSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  const { error } = id.data
    ? await supabase.from("membership_types").update(parsed.data).eq("id", id.data)
    : await supabase.from("membership_types").insert(parsed.data);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used." }, values: echoValues(fd) };
    console.error("membership type save failed", error);
    return { error: "Could not save the membership type." };
  }
  refreshSite();
  revalidatePath("/admin/membership-types");
  return { ok: true, message: id.data ? "Saved." : "Membership type created." };
}

export async function deleteMembershipType(fd: FormData): Promise<void> {
  const me = await admin();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("membership_types").delete().eq("id", id.data);
  refreshSite();
  revalidatePath("/admin/membership-types");
}
