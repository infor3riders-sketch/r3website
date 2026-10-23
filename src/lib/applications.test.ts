import { describe, expect, it } from "vitest";
import { applicationReference, canTransition, motorcycleRowsFromApplication, profileFromApplication, readMotorcycles } from "@/lib/applications";
import { applicationSchema, personalStep, referencesStep } from "@/lib/validators/application";

const valid = {
  full_name: "Juan Dela Cruz",
  email: "Juan@Example.com",
  phone: "0917 123 4567",
  birthdate: "1990-05-01",
  address: "Iloilo City",
  road_name: "Juan",
  riding_years: "5",
  riding_experience: "Daily commuter and weekend tours.",
  license_number: "N01-23-456789",
  motorcycles: [{ make: "Honda", model: "CB500X", year: "2021", displacement_cc: "500" }],
  references: [
    { name: "A", phone: "0917 000 0001", relationship: "Friend" },
    { name: "B", phone: "0917 000 0002", relationship: "Colleague" },
  ],
  volunteer_interests: ["Charity rides"],
  agreed_rules: true,
  consent_privacy: true,
};

describe("applicationSchema", () => {
  it("accepts a complete application and normalises types", () => {
    const r = applicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("juan@example.com");
      expect(r.data.riding_years).toBe(5);
      expect(r.data.motorcycles[0].year).toBe(2021);
    }
  });
  it("requires the rules agreement and privacy consent", () => {
    expect(applicationSchema.safeParse({ ...valid, agreed_rules: false }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...valid, consent_privacy: false }).success).toBe(false);
  });
  it("rejects minors and bad birthdates", () => {
    const year = new Date().getFullYear() - 10;
    expect(personalStep.safeParse({ ...valid, birthdate: `${year}-01-01` }).success).toBe(false);
    expect(personalStep.safeParse({ ...valid, birthdate: "nope" }).success).toBe(false);
  });
  it("needs exactly two references and at least one motorcycle", () => {
    expect(referencesStep.safeParse({ references: [valid.references[0]] }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...valid, motorcycles: [] }).success).toBe(false);
  });
  it("rejects unknown volunteer interests", () => {
    expect(applicationSchema.safeParse({ ...valid, volunteer_interests: ["Hacking"] }).success).toBe(false);
  });
});

describe("application helpers", () => {
  it("makes a stable short reference", () => {
    expect(applicationReference("123e4567-e89b-12d3-a456-426614174000")).toBe("APP-123E4567");
  });
  it("copies profile fields and stamps member_since", () => {
    const p = profileFromApplication(
      { full_name: "A", phone: "1", address: "x", birthdate: "1990-01-01", road_name: null, membership_type_id: null },
      new Date("2026-11-05T10:00:00Z"),
    );
    expect(p.member_since).toBe("2026-11-05");
    expect(p.full_name).toBe("A");
  });
  it("re-validates untrusted motorcycle JSON", () => {
    expect(readMotorcycles("garbage")).toEqual([]);
    expect(readMotorcycles([{ make: 1 }])).toEqual([]);
    const rows = motorcycleRowsFromApplication("pid", [{ make: "Honda", model: "Click", year: 2020 }]);
    expect(rows).toEqual([{ profile_id: "pid", make: "Honda", model: "Click", year: 2020, displacement_cc: null, color: null, plate_number: null }]);
  });
  it("only allows review transitions from open states", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("info_requested", "rejected")).toBe(true);
    expect(canTransition("approved", "rejected")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
  });
});
