import { z } from "zod";
import { emailField } from "@/lib/validators/auth";

/** Lenient Philippine/international phone check: digits, spaces, + ( ) - and 7 to 20 chars. */
export const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Keep this under ${max} characters`);

/** Data Privacy Act consent: must be explicitly ticked. */
export const consentField = z
  .union([z.literal("on"), z.literal("true"), z.literal(true)], { error: "Please accept the privacy notice to continue" })
  .transform(() => true as const);

export const contactSchema = z.object({
  name: requiredText("Name", 120),
  email: emailField,
  subject: optionalText(150),
  message: requiredText("Message", 4000).pipe(z.string().min(10, "Tell us a little more (at least 10 characters)")),
  consent: consentField,
});

export const volunteerSchema = z.object({
  program_id: z.uuid("Choose a program"),
  name: requiredText("Name", 120),
  email: emailField,
  phone: phoneField.optional().or(z.literal("").transform(() => undefined)),
  message: optionalText(1000),
  consent: consentField,
});

export const eventInterestSchema = z.object({
  event_id: z.uuid(),
  name: requiredText("Name", 120),
  email: emailField,
  phone: phoneField.optional().or(z.literal("").transform(() => undefined)),
  consent: consentField,
});

export type ContactInput = z.infer<typeof contactSchema>;
export type VolunteerInput = z.infer<typeof volunteerSchema>;
export type EventInterestInput = z.infer<typeof eventInterestSchema>;
