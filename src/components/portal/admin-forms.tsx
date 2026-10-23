"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { isoToManilaLocal } from "@/lib/events";
import type { FieldDef } from "@/lib/settings-schema";
import type { Row } from "@/lib/supabase/types";
import { inviteMember, saveAlbum, saveNews, saveSetting, updateMember, uploadAlbumPhoto } from "@/server/admin-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;
const fileClass = "block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white";

export function SettingForm({ settingKey, fields, values }: { settingKey: string; fields: FieldDef[]; values: Record<string, string> }) {
  const [state, action] = useActionState(saveSetting, initial);
  const v = state.values ?? values;
  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="key" value={settingKey} />
      {fields.map((f) => {
        const id = `${settingKey}-${f.name}`;
        if (f.kind === "checkbox") {
          return (
            <label key={f.name} className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name={f.name} defaultChecked={v[f.name] === "on"} className="h-5 w-5 accent-[#f2a81d]" /> {f.label}
            </label>
          );
        }
        return (
          <Field key={f.name} label={f.label} htmlFor={id} error={state.fieldErrors?.[f.name]} hint={f.hint}>
            {f.kind === "text" ? (
              <Input id={id} name={f.name} defaultValue={v[f.name]} {...inv(state, f.name)} />
            ) : (
              <Textarea id={id} name={f.name} rows={f.rows ?? 4} defaultValue={v[f.name]} {...inv(state, f.name)} />
            )}
          </Field>
        );
      })}
      <FormFeedback state={state} />
      <SubmitButton variant="outline">Save</SubmitButton>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, initial);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-4">
      <Field label="Full name" htmlFor="inv-name" error={state.fieldErrors?.full_name} required>
        <Input id="inv-name" name="full_name" defaultValue={v.full_name} required {...inv(state, "full_name")} />
      </Field>
      <Field label="Email" htmlFor="inv-email" error={state.fieldErrors?.email} required>
        <Input id="inv-email" name="email" type="email" defaultValue={v.email} required {...inv(state, "email")} />
      </Field>
      <Field label="Role" htmlFor="inv-role">
        <Select id="inv-role" name="role" defaultValue={v.role ?? "member"}>
          <option value="member">Member</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <div className="self-end"><SubmitButton pendingText="Inviting…">Send invitation</SubmitButton></div>
      <div className="sm:col-span-4"><FormFeedback state={state} /></div>
    </form>
  );
}

export function MemberForm({ profile, types }: { profile: Row<"profiles">; types: { id: string; name: string }[] }) {
  const [state, action] = useActionState(updateMember, initial);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="id" value={profile.id} />
      <Field label="Role" htmlFor="role">
        <Select id="role" name="role" defaultValue={profile.role}>
          <option value="member">Member</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={profile.status}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </Select>
      </Field>
      <Field label="Membership type" htmlFor="membership_type_id">
        <Select id="membership_type_id" name="membership_type_id" defaultValue={profile.membership_type_id ?? ""}>
          <option value="">None</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </Field>
      <div className="space-y-3 sm:col-span-3">
        <FormFeedback state={state} />
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}

export function NewsForm({ post }: { post?: Row<"news_posts"> }) {
  const [state, action] = useActionState(saveNews, initial);
  const v = state.values;
  const val = (k: keyof Row<"news_posts">) => v?.[k] ?? (post?.[k] == null ? "" : String(post[k]));
  return (
    <form action={action} noValidate className="space-y-4">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={state.fieldErrors?.title} required>
          <Input id="title" name="title" defaultValue={val("title")} required {...inv(state, "title")} />
        </Field>
        <Field label="URL name" htmlFor="slug" error={state.fieldErrors?.slug} hint="Auto-generated from the title if empty">
          <Input id="slug" name="slug" defaultValue={val("slug")} {...inv(state, "slug")} />
        </Field>
      </div>
      <Field label="Short excerpt" htmlFor="excerpt" error={state.fieldErrors?.excerpt}>
        <Input id="excerpt" name="excerpt" defaultValue={val("excerpt")} />
      </Field>
      <Field label="Body" htmlFor="body">
        <Textarea id="body" name="body" rows={10} defaultValue={val("body")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cover image" htmlFor="cover" hint="JPG, PNG or WebP up to 5 MB. Leave empty to keep the current one.">
          <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className={fileClass} />
        </Field>
        <Field label="Publish date (Manila time)" htmlFor="published_at" error={state.fieldErrors?.published_at} hint="Empty = now, when public">
          <Input id="published_at" name="published_at" type="datetime-local" defaultValue={v?.published_at ?? isoToManilaLocal(post?.published_at)} {...inv(state, "published_at")} />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="is_public" defaultChecked={v ? v.is_public === "on" : Boolean(post?.is_public)} className="h-5 w-5 accent-[#f2a81d]" /> Publish on the public website
      </label>
      <FormFeedback state={state} />
      <SubmitButton size="lg" pendingText="Saving…">{post ? "Save post" : "Create post"}</SubmitButton>
    </form>
  );
}

export function AlbumForm({ album }: { album?: Row<"gallery_albums"> }) {
  const [state, action] = useActionState(saveAlbum, initial);
  const v = state.values;
  const val = (k: keyof Row<"gallery_albums">) => v?.[k] ?? (album?.[k] == null ? "" : String(album[k]));
  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
      {album ? <input type="hidden" name="id" value={album.id} /> : null}
      <Field label="Title" htmlFor="a-title" error={state.fieldErrors?.title} required>
        <Input id="a-title" name="title" defaultValue={val("title")} required {...inv(state, "title")} />
      </Field>
      <Field label="URL name" htmlFor="a-slug" error={state.fieldErrors?.slug}>
        <Input id="a-slug" name="slug" defaultValue={val("slug")} {...inv(state, "slug")} />
      </Field>
      <Field label="Description" htmlFor="a-desc" className="sm:col-span-2">
        <Textarea id="a-desc" name="description" rows={2} defaultValue={val("description")} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="is_public" defaultChecked={v ? v.is_public === "on" : Boolean(album?.is_public)} className="h-5 w-5 accent-[#f2a81d]" /> Show on the public website
      </label>
      <div className="space-y-3 sm:col-span-2">
        <FormFeedback state={state} />
        <SubmitButton>{album ? "Save album" : "Create album"}</SubmitButton>
      </div>
    </form>
  );
}

export function PhotoUploadForm({ albumId }: { albumId: string }) {
  const [state, action] = useActionState(uploadAlbumPhoto, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="album_id" value={albumId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Photo" htmlFor="photo" hint="JPG, PNG or WebP up to 5 MB">
          <input id="photo" name="photo" type="file" required accept="image/jpeg,image/png,image/webp" className={fileClass} />
        </Field>
        <Field label="Caption" htmlFor="caption">
          <Input id="caption" name="caption" />
        </Field>
      </div>
      <FormFeedback state={state} />
      <SubmitButton variant="outline" pendingText="Uploading…">Upload photo</SubmitButton>
    </form>
  );
}
