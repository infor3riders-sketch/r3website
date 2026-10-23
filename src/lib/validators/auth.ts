import { z } from "zod";

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address")
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(200),
});

export const emailOnlySchema = z.object({ email: emailField });

export const PASSWORD_MIN = 10;

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
      .max(200)
      .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Include letters and at least one number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

/** Flatten a ZodError into { field: firstMessage } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
