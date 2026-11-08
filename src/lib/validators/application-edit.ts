import { z } from "zod";
import { emailField } from "@/lib/validators/auth";
import { phoneField } from "@/lib/validators/public";

/**
 * Officer corrections to an open application. Looser than the public form (officers fix typos and
 * fill gaps; they shouldn't be blocked by rules meant for applicants), but the contact fields that
 * approval depends on stay required and valid. Repeated rows use flat names: bike_0_make, ref_1_name.
 */
export const EDIT_BIKE_ROWS = 5;
export const EDIT_REF_ROWS = 3;

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v ? v : null));
const optInt = (min: number, max: number, msg: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: msg });
        return z.NEVER;
      }
      return n;
    });

const thisYear = new Date().getFullYear();

export const applicationEditSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120),
  email: emailField,
  phone: phoneField,
  birthdate: z
    .string()
    .trim()
    .refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime())), "Enter a valid date")
    .transform((v) => (v ? v : null)),
  address: opt(300),
  road_name: opt(40),
  membership_type_id: z.union([z.uuid(), z.literal("")]).transform((v) => (v ? v : null)),
  riding_years: optInt(0, 80, "Enter a number from 0 to 80"),
  riding_experience: opt(2000),
  license_number: opt(40),
});

const bikeRow = z.object({
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),
  year: optInt(1950, thisYear + 1, "Enter a valid year"),
  displacement_cc: optInt(50, 3000, "Enter the engine size in cc"),
  color: opt(40),
  plate_number: opt(20),
});
const refRow = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.union([z.literal(""), phoneField]).transform((v) => (v ? v : null)),
  relationship: opt(80),
});

const BIKE_KEYS = ["make", "model", "year", "displacement_cc", "color", "plate_number"] as const;
const REF_KEYS = ["name", "phone", "relationship"] as const;

export type ApplicationEditResult =
  | { ok: true; value: z.output<typeof applicationEditSchema> & { motorcycles: z.output<typeof bikeRow>[]; references: z.output<typeof refRow>[] } }
  | { ok: false; fieldErrors: Record<string, string> };

/** Reads the flat edit form. Blank repeated rows are dropped; partly filled rows are validated. */
export function parseApplicationEdit(get: (name: string) => unknown): ApplicationEditResult {
  const str = (k: string) => {
    const v = get(k);
    return typeof v === "string" ? v : "";
  };
  const errors: Record<string, string> = {};

  const base = applicationEditSchema.safeParse(Object.fromEntries(Object.keys(applicationEditSchema.shape).map((k) => [k, str(k)])));
  if (!base.success) for (const i of base.error.issues) errors[String(i.path[0])] ??= i.message;

  const rows = <T extends z.ZodType>(prefix: string, count: number, keys: readonly string[], schema: T) => {
    const out: z.output<T>[] = [];
    for (let n = 0; n < count; n++) {
      const raw = Object.fromEntries(keys.map((k) => [k, str(`${prefix}_${n}_${k}`)]));
      if (Object.values(raw).every((v) => !v.trim())) continue;
      const r = schema.safeParse(raw);
      if (r.success) out.push(r.data);
      else for (const i of r.error.issues) errors[`${prefix}_${n}_${String(i.path[0])}`] ??= i.message;
    }
    return out;
  };
  const motorcycles = rows("bike", EDIT_BIKE_ROWS, BIKE_KEYS, bikeRow);
  const references = rows("ref", EDIT_REF_ROWS, REF_KEYS, refRow);

  if (!base.success || Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { ...base.data, motorcycles, references } };
}
