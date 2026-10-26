import { z } from "zod";
import { manilaLocalToIso } from "@/lib/events";
import { slugify } from "@/lib/format";
import { emailField } from "@/lib/validators/auth";
import { checkbox } from "@/lib/validators/profile";

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export const memberUpdateSchema = z.object({
  id: z.uuid(),
  role: z.enum(["member", "officer", "admin"]),
  status: z.enum(["active", "inactive", "suspended"]),
  membership_type_id: z.union([z.literal(""), z.uuid()]).optional().transform((v) => (v ? v : null)),
});

export const inviteSchema = z.object({
  email: emailField,
  full_name: z.string().trim().min(1, "Name is required").max(120),
  role: z.enum(["member", "officer", "admin"]),
});

export const newsSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    slug: z.string().trim().max(80).optional(),
    excerpt: optText(300),
    body: optText(20000),
    is_public: checkbox,
    published_at: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const iso = manilaLocalToIso(v);
        if (!iso) ctx.addIssue({ code: "custom", message: "Enter a valid publish date" });
        return iso;
      }),
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.title), published_at: v.is_public ? (v.published_at ?? new Date().toISOString()) : v.published_at }));

export const albumSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    slug: z.string().trim().max(80).optional(),
    description: optText(500),
    is_public: checkbox,
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.title) }));

/** Keys that changed between two audit snapshots (for the audit viewer). */
export function changedKeys(oldData: unknown, newData: unknown): string[] {
  const o = (oldData && typeof oldData === "object" ? oldData : {}) as Record<string, unknown>;
  const n = (newData && typeof newData === "object" ? newData : {}) as Record<string, unknown>;
  return [...new Set([...Object.keys(o), ...Object.keys(n)])].filter((k) => k !== "updated_at" && JSON.stringify(o[k]) !== JSON.stringify(n[k])).sort();
}

const intOrZero = z.union([z.literal(""), z.coerce.number().int().min(0).max(999)]).optional().transform((v) => (v === "" || v === undefined ? 0 : Number(v)));

export const sponsorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  website_url: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null))
    .refine((v) => v === null || URL.canParse(v), "Enter a valid web address, e.g. https://example.com"),
  sort_order: intOrZero,
  is_public: checkbox,
});

export const membershipTypeSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    slug: z.string().trim().max(60).optional(),
    description: optText(500),
    requirements: optText(1000),
    fee_amount: z.coerce.number().min(0, "Enter 0 or more").max(1_000_000),
    benefits: z
      .string()
      .optional()
      .transform((v) => (v ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 20)),
    sort_order: intOrZero,
    is_public: checkbox,
    is_active: checkbox,
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.name) }));
