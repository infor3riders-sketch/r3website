import { z } from "zod";
import { emailField } from "@/lib/validators/auth";
import { phoneField } from "@/lib/validators/public";

const text = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `Keep this under ${max} characters`);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const thisYear = new Date().getFullYear();

export const motorcycleSchema = z.object({
  make: text("Make", 60),
  model: text("Model", 60),
  year: z.coerce.number().int().min(1950, "Enter a valid year").max(thisYear + 1, "Enter a valid year"),
  displacement_cc: z.coerce.number().int().min(50, "Enter the engine size in cc").max(3000).optional().or(z.literal("").transform(() => undefined)),
  color: optional(40),
  plate_number: optional(20),
});

export const referenceSchema = z.object({
  name: text("Name", 120),
  phone: phoneField,
  relationship: text("Relationship", 80),
});

/** Step 1: personal information */
export const personalStep = z.object({
  full_name: text("Full name", 120),
  email: emailField,
  phone: phoneField,
  birthdate: z
    .string()
    .min(1, "Birthdate is required")
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 18 && age < 100;
    }, "You must be at least 18 years old"),
  address: text("Address", 300),
  road_name: optional(40),
});

/** Step 2: riding experience */
export const ridingStep = z.object({
  riding_years: z.coerce.number().int().min(0, "Enter 0 or more").max(80),
  riding_experience: text("Riding experience", 2000),
  license_number: text("Driver's license number", 40),
});

/** Step 3: motorcycles (at least one) */
export const motorcyclesStep = z.object({
  motorcycles: z.array(motorcycleSchema).min(1, "Add at least one motorcycle").max(5),
});

/** Step 4: references (exactly two) */
export const referencesStep = z.object({
  references: z.array(referenceSchema).length(2, "Provide two references"),
});

export const VOLUNTEER_INTERESTS = ["Charity rides", "Community outreach", "Fundraising", "Event logistics", "Media & documentation", "Safety / road marshal"] as const;

/** Step 5: agreements, membership type, volunteer interests */
export const agreementStep = z.object({
  membership_type_id: z.union([z.uuid(), z.literal("").transform(() => undefined)]).optional(),
  volunteer_interests: z.array(z.enum(VOLUNTEER_INTERESTS)).max(VOLUNTEER_INTERESTS.length).default([]),
  agreed_rules: z.literal(true, { error: "You must agree to the club rules" }),
  consent_privacy: z.literal(true, { error: "Please accept the privacy notice to continue" }),
});

export const applicationSchema = personalStep.extend(ridingStep.shape).extend(motorcyclesStep.shape).extend(referencesStep.shape).extend(agreementStep.shape);

export type ApplicationInput = z.input<typeof applicationSchema>;
export type ApplicationData = z.output<typeof applicationSchema>;

export const STEP_SCHEMAS = [personalStep, ridingStep, motorcyclesStep, referencesStep, agreementStep] as const;
export const STEP_TITLES = ["About you", "Riding experience", "Your motorcycle", "References", "Agreement"] as const;
export const STEP_FIELDS: readonly (readonly string[])[] = STEP_SCHEMAS.map((s) => Object.keys(s.shape));
