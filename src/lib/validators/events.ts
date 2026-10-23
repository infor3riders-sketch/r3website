import { z } from "zod";
import { manilaLocalToIso } from "@/lib/events";
import { slugify } from "@/lib/format";
import { checkbox } from "@/lib/validators/profile";

const optText = (max: number) =>
  z.string().trim().max(max, `Keep this under ${max} characters`).optional().transform((v) => (v ? v : null));
const intField = (min: number, max: number, msg: string) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(min, msg).max(max, msg)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)));

const localDateTime = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const iso = manilaLocalToIso(v);
      if (!iso) ctx.addIssue({ code: "custom", message: `Enter a valid ${label}` });
      return iso;
    });

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    slug: z.string().trim().max(80),
    description: optText(5000),
    program_id: z.union([z.literal(""), z.uuid()]).transform((v) => (v === "" ? null : v)),
    starts_at: localDateTime("start date and time").refine((v) => v !== null, "Start date and time is required"),
    ends_at: localDateTime("end date and time"),
    meeting_point: optText(300),
    route: optText(2000),
    requirements: optText(2000),
    capacity: intField(1, 5000, "Enter a capacity of 1 or more"),
    requires_waiver: checkbox,
    public_interest_enabled: checkbox,
    is_public: checkbox,
  })
  .refine((v) => !v.ends_at || !v.starts_at || v.ends_at > v.starts_at, { path: ["ends_at"], message: "End must be after the start" })
  .transform((v) => ({ ...v, starts_at: v.starts_at as string, slug: slugify(v.slug || v.title) }));

export const rsvpSchema = z
  .object({
    event_id: z.uuid(),
    status: z.enum(["going", "maybe", "no"], { error: "Choose going, maybe or not going" }),
    riders: z.coerce.number().int().min(0).max(20),
    passengers: z.coerce.number().int().min(0).max(20),
    waiver: checkbox,
  })
  .refine((v) => v.status !== "going" || v.riders + v.passengers >= 1, { path: ["riders"], message: "Going needs at least one person" });

export const programSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  slug: z.string().trim().max(80),
  summary: optText(300),
  description: optText(8000),
  schedule: optText(300),
  how_to_join: optText(1000),
  volunteer_enabled: checkbox,
  is_public: checkbox,
  sort_order: intField(0, 999, "Enter 0 to 999").transform((v) => v ?? 0),
}).transform((v) => ({ ...v, slug: slugify(v.slug || v.title) }));

export const slotSchema = z
  .object({
    program_id: z.uuid(),
    title: z.string().trim().min(1, "Title is required").max(150),
    event_id: z.union([z.literal(""), z.uuid()]).transform((v) => (v === "" ? null : v)),
    starts_at: localDateTime("start"),
    ends_at: localDateTime("end"),
    capacity: intField(1, 1000, "Enter a capacity of 1 or more"),
  })
  .refine((v) => !v.ends_at || !v.starts_at || v.ends_at > v.starts_at, { path: ["ends_at"], message: "End must be after the start" });

export const signupUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  hours: z.union([z.literal(""), z.coerce.number().min(0).max(999)]).transform((v) => (v === "" ? null : Number(v))),
});
