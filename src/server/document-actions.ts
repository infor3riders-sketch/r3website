"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { DOC_MAX_BYTES, documentSchema, safeFileName, sniffDocument } from "@/lib/validators/documents";
import { echoValues, type FormState } from "@/server/form-guard";

async function officer() {
  try {
    return await requireRole("officer");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function uploadDocument(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return { error: "Only officers can upload documents." };
  const parsed = documentSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([k]) => k !== "file" && !k.startsWith("$ACTION"))));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  // Only admins may restrict a document to admins.
  if (parsed.data.min_role === "admin" && !hasRole(me.role, "admin")) return { fieldErrors: { min_role: "Only admins can create admin-only documents." }, values: echoValues(fd) };

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload.", values: echoValues(fd) };
  if (file.size > DOC_MAX_BYTES) return { error: "Documents must be under 20 MB.", values: echoValues(fd) };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffDocument(bytes, file.name);
  if (!kind) return { error: "Upload a PDF, JPG, PNG or Word (.docx) file.", values: echoValues(fd) };

  const supabase = await createClient();
  const storagePath = `${parsed.data.category}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage.from("documents").upload(storagePath, bytes, { contentType: kind.type });
  if (upErr) {
    console.error("document upload failed", upErr);
    return { error: "Upload failed. Please try again." };
  }
  const { error } = await supabase.from("documents").insert({ ...parsed.data, storage_path: storagePath, uploaded_by: me.id });
  if (error) {
    await supabase.storage.from("documents").remove([storagePath]); // do not leave orphaned files
    console.error("document insert failed", error);
    return { error: "Could not save the document." };
  }
  revalidatePath("/documents");
  revalidatePath("/manage/documents");
  return { ok: true, message: "Document uploaded." };
}

export async function deleteDocument(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id.data).maybeSingle();
  if (!doc) return;
  await supabase.from("documents").delete().eq("id", id.data);
  await supabase.storage.from("documents").remove([doc.storage_path]);
  revalidatePath("/documents");
  revalidatePath("/manage/documents");
}
