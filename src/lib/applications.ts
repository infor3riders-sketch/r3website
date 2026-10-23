import { z } from "zod";
import type { Row } from "@/lib/supabase/types";
import { motorcycleSchema, referenceSchema } from "@/lib/validators/application";

/** Short, human-friendly reference shown to applicants (derived from the row id). */
export const applicationReference = (id: string) => `APP-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const storedMotorcycles = z.array(motorcycleSchema.partial().extend({ make: z.string(), model: z.string() }));
const storedReferences = z.array(referenceSchema.partial());

/** Application JSON columns are written by anon users, so always re-validate before use. */
export function readMotorcycles(json: unknown) {
  const r = storedMotorcycles.safeParse(json);
  return r.success ? r.data : [];
}
export function readReferences(json: unknown) {
  const r = storedReferences.safeParse(json);
  return r.success ? r.data : [];
}

type App = Pick<Row<"applications">, "full_name" | "phone" | "address" | "birthdate" | "road_name" | "membership_type_id">;

/** Fields copied from an approved application onto the new member's profile. */
export function profileFromApplication(app: App, today = new Date()) {
  return {
    full_name: app.full_name,
    phone: app.phone,
    address: app.address,
    birthdate: app.birthdate,
    road_name: app.road_name,
    membership_type_id: app.membership_type_id,
    member_since: today.toISOString().slice(0, 10),
  };
}

export function motorcycleRowsFromApplication(profileId: string, json: unknown) {
  return readMotorcycles(json).map((m) => ({
    profile_id: profileId,
    make: m.make,
    model: m.model,
    year: m.year ?? null,
    displacement_cc: m.displacement_cc ?? null,
    color: m.color ?? null,
    plate_number: m.plate_number ?? null,
  }));
}

/** Allowed review transitions. Approved/rejected are terminal; only pending/info_requested can move. */
const TRANSITIONS: Record<Row<"applications">["status"], Row<"applications">["status"][]> = {
  pending: ["approved", "rejected", "info_requested"],
  info_requested: ["approved", "rejected", "info_requested"],
  approved: [],
  rejected: [],
};
export const canTransition = (from: Row<"applications">["status"], to: Row<"applications">["status"]) => TRANSITIONS[from].includes(to);
