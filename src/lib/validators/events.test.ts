import { describe, expect, it } from "vitest";
import { eventSchema, programSchema, rsvpSchema, signupUpdateSchema, slotSchema } from "@/lib/validators/events";

const baseEvent = {
  title: "Charity Ride 2026",
  slug: "",
  description: "",
  program_id: "",
  starts_at: "2026-12-06T07:00",
  ends_at: "",
  meeting_point: "Plaza",
  route: "",
  requirements: "",
  capacity: "60",
};

describe("eventSchema", () => {
  it("builds slug, converts Manila time and nulls blanks", () => {
    const r = eventSchema.parse(baseEvent);
    expect(r.slug).toBe("charity-ride-2026");
    expect(r.starts_at).toBe("2026-12-05T23:00:00.000Z");
    expect(r.capacity).toBe(60);
    expect(r.description).toBeNull();
    expect(r.is_public).toBe(false);
  });
  it("requires a start and a sensible end", () => {
    expect(eventSchema.safeParse({ ...baseEvent, starts_at: "" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...baseEvent, ends_at: "2026-12-06T06:00" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...baseEvent, ends_at: "2026-12-06T12:00" }).success).toBe(true);
  });
  it("rejects zero or negative capacity", () => {
    expect(eventSchema.safeParse({ ...baseEvent, capacity: "0" }).success).toBe(false);
    expect(eventSchema.parse({ ...baseEvent, capacity: "" }).capacity).toBeNull();
  });
});

describe("rsvpSchema", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  it("requires at least one person when going", () => {
    expect(rsvpSchema.safeParse({ event_id: id, status: "going", riders: "0", passengers: "0" }).success).toBe(false);
    expect(rsvpSchema.safeParse({ event_id: id, status: "going", riders: "1", passengers: "1" }).success).toBe(true);
    expect(rsvpSchema.safeParse({ event_id: id, status: "no", riders: "0", passengers: "0" }).success).toBe(true);
  });
  it("rejects unknown statuses and absurd party sizes", () => {
    expect(rsvpSchema.safeParse({ event_id: id, status: "yes", riders: "1", passengers: "0" }).success).toBe(false);
    expect(rsvpSchema.safeParse({ event_id: id, status: "going", riders: "99", passengers: "0" }).success).toBe(false);
  });
});

describe("program, slot and signup schemas", () => {
  it("slugifies programs", () => {
    expect(programSchema.parse({ title: "Beach Clean-up", slug: "" }).slug).toBe("beach-clean-up");
  });
  it("validates slots", () => {
    const pid = "123e4567-e89b-12d3-a456-426614174000";
    expect(slotSchema.safeParse({ program_id: pid, title: "Marshals", event_id: "", starts_at: "", ends_at: "", capacity: "5" }).success).toBe(true);
    expect(slotSchema.safeParse({ program_id: pid, title: "", event_id: "", starts_at: "", ends_at: "", capacity: "" }).success).toBe(false);
  });
  it("limits signup updates to known statuses and sane hours", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(signupUpdateSchema.parse({ id, status: "completed", hours: "3.5" }).hours).toBe(3.5);
    expect(signupUpdateSchema.safeParse({ id, status: "hacked", hours: "" }).success).toBe(false);
    expect(signupUpdateSchema.safeParse({ id, status: "completed", hours: "-1" }).success).toBe(false);
  });
});
