import { z } from "zod";

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export const periodSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(80),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
    due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a due date"),
    amount: z.coerce.number().min(0, "Enter 0 or more").max(1_000_000),
  })
  .refine((v) => v.due_on >= v.starts_on, { path: ["due_on"], message: "Due date must be on or after the start" });

export const duesProofSchema = z.object({
  period_id: z.uuid(),
  reference_no: z.string().trim().max(60).optional().transform((v) => (v ? v : null)),
});

export const duesDecisionSchema = z.object({
  id: z.uuid(),
  reject_reason: optText(300),
});

export const cashDuesSchema = z.object({ period_id: z.uuid(), profile_id: z.uuid() });

/** Display status for a member's dues in a period. */
export type DuesState = "paid" | "pending" | "rejected" | "overdue" | "due" | "upcoming";

export function duesState(period: { starts_on: string; due_on: string }, payment: { status: string } | null | undefined, today: string): DuesState {
  if (payment?.status === "paid") return "paid";
  if (payment?.status === "pending") return "pending";
  if (payment?.status === "rejected") return "rejected";
  if (today > period.due_on) return "overdue";
  if (today < period.starts_on) return "upcoming";
  return "due";
}
