import { z } from "zod";
import { slugify } from "@/lib/format";
import { emailField } from "@/lib/validators/auth";
import { checkbox } from "@/lib/validators/profile";
import { consentField, phoneField } from "@/lib/validators/public";

export const MAX_CART_LINES = 30;
export const MAX_LINE_QTY = 20;

export const cartSchema = z
  .array(z.object({ variant_id: z.uuid(), quantity: z.coerce.number().int().min(1).max(MAX_LINE_QTY) }))
  .min(1, "Your cart is empty")
  .max(MAX_CART_LINES);

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(120),
  email: emailField,
  phone: phoneField,
  address_line: z.string().trim().min(1, "Street address is required").max(300),
  city: z.string().trim().min(1, "City is required").max(100),
  province: z.string().trim().min(1, "Province is required").max(100),
  postal_code: optText(10),
  notes: optText(500),
  discount_code: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  payment_reference: optText(60),
  consent: consentField,
});
export type CheckoutInput = z.output<typeof checkoutSchema>;

export const PRODUCT_STATUSES = ["pending_payment", "paid", "processing", "shipped", "completed", "cancelled", "expired"] as const;

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150),
    slug: z.string().trim().max(80),
    description: optText(5000),
    category: optText(60),
    is_active: checkbox,
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.name) }));

const money = z.coerce.number().min(0, "Enter 0 or more").max(1_000_000);
const whole = (max = 100000) => z.coerce.number().int().min(0, "Enter 0 or more").max(max);

export const variantSchema = z.object({
  product_id: z.uuid(),
  label: z.string().trim().min(1, "Label is required").max(80),
  size: optText(20),
  color: optText(40),
  sku: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  price_php: money,
  stock: whole(),
  is_active: checkbox,
});

export const discountCodeSchema = z
  .object({
    code: z.string().trim().min(3, "At least 3 characters").max(40).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only").transform((v) => v.toUpperCase()),
    kind: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive("Enter a value above 0").max(1_000_000),
    min_subtotal: z.coerce.number().min(0).max(1_000_000).optional().transform((v) => v ?? 0),
    max_uses: z.union([z.literal(""), z.coerce.number().int().min(1)]).optional().transform((v) => (v === "" || v === undefined ? null : Number(v))),
    is_active: checkbox,
  })
  .refine((v) => v.kind !== "percent" || v.value <= 100, { path: ["value"], message: "Percent cannot exceed 100" });

export const orderStatusUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["processing", "shipped", "completed"]),
  tracking_note: optText(500),
});

/** PDF or image signature check for payment proof uploads. */
export function sniffProof(bytes: Uint8Array): { type: string; ext: string } | null {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) return { type: "image/jpeg", ext: "jpg" };
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return { type: "image/png", ext: "png" };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { type: "image/webp", ext: "webp" };
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return { type: "application/pdf", ext: "pdf" };
  return null;
}
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
