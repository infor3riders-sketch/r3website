import { z } from "zod";
import { slugify } from "@/lib/format";
import { emailField } from "@/lib/validators/auth";
import { checkbox } from "@/lib/validators/profile";

export const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500] as const;
export const MIN_DONATION = 20;
export const MAX_DONATION = 500_000;

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

/** `amount` is a preset value or "custom" with `custom_amount`. */
export const donationSchema = z
  .object({
    amount: z.string().trim().min(1, "Choose an amount"),
    custom_amount: z.string().trim().optional(),
    campaign_id: z.union([z.literal(""), z.uuid()]).optional().transform((v) => (v ? v : null)),
    donor_name: z.string().trim().min(1, "Your name is required").max(120),
    donor_email: emailField,
    is_anonymous: checkbox,
    message: optText(500),
    payment_reference: optText(60),
    consent: checkbox,
  })
  .transform((v, ctx) => {
    // Consent is checked here (not as a field rule) so a missing tick and a bad amount are reported together.
    if (!v.consent) ctx.addIssue({ code: "custom", path: ["consent"], message: "Please accept the privacy notice to continue" });
    const raw = v.amount === "custom" ? v.custom_amount : v.amount;
    const n = Number(String(raw ?? "").replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(n) || n < MIN_DONATION || n > MAX_DONATION) {
      ctx.addIssue({ code: "custom", path: [v.amount === "custom" ? "custom_amount" : "amount"], message: `Enter an amount between ₱${MIN_DONATION} and ₱${MAX_DONATION.toLocaleString("en-PH")}` });
    }
    if (ctx.issues.length > 0) return z.NEVER;
    const { amount, custom_amount, ...rest } = v;
    void amount;
    void custom_amount;
    return { ...rest, amount: Math.round(n * 100) / 100 };
  });
export type DonationInput = z.output<typeof donationSchema>;

export const campaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    slug: z.string().trim().max(80),
    description: optText(5000),
    goal_amount: z.union([z.literal(""), z.coerce.number().positive("Enter a goal above 0").max(100_000_000)]).optional().transform((v) => (v === "" || v === undefined ? null : Number(v))),
    is_public: checkbox,
    is_active: checkbox,
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.title) }));
