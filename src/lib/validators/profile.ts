import { z } from "zod";
import { phoneField } from "@/lib/validators/public";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const blank = <T extends z.ZodType>(schema: T) => z.union([schema, z.literal("")]).transform((v) => (v === "" ? null : (v as z.output<T>)));
const optText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).transform((v) => (v === "" ? null : v));

/** HTML checkboxes arrive as "on" when ticked and are absent otherwise. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(true), z.literal(false), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120),
  road_name: optText(40),
  phone: blank(phoneField),
  address: optText(300),
  birthdate: blank(z.string().refine((v) => !Number.isNaN(new Date(v).getTime()) && new Date(v) < new Date(), "Enter a valid birthdate")),
  blood_type: blank(z.enum(BLOOD_TYPES, { error: "Choose a valid blood type" })),
  emergency_contact_name: optText(120),
  emergency_contact_phone: blank(phoneField),
  emergency_contact_relation: optText(60),
  directory_visible: checkbox,
  show_phone: checkbox,
  show_email: checkbox,
  show_motorcycles: checkbox,
});
export type ProfileInput = z.output<typeof profileSchema>;

const thisYear = new Date().getFullYear();
const num = (min: number, max: number, msg: string) =>
  z.union([z.literal(""), z.coerce.number().int().min(min, msg).max(max, msg)]).transform((v) => (v === "" ? null : Number(v)));

export const motorcycleFormSchema = z.object({
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),
  year: num(1950, thisYear + 1, "Enter a valid year"),
  displacement_cc: num(50, 3000, "Enter the engine size in cc"),
  color: optText(40),
  plate_number: optText(20),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  body: z.string().trim().min(1, "Write the announcement").max(5000),
  pinned: checkbox,
});

/** Image signature check: the browser-supplied MIME type is not trusted. */
export function sniffImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const EXT_FOR: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
