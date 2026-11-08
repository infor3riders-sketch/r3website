import { describe, expect, it } from "vitest";
import { parseApplicationEdit } from "./application-edit";

const base = { full_name: "Juan Dela Cruz", email: "juan@example.com", phone: "0917 123 4567", birthdate: "", address: "", road_name: "", membership_type_id: "", riding_years: "", riding_experience: "", license_number: "" };
const run = (extra: Record<string, string>) => {
  const form: Record<string, string> = { ...base, ...extra };
  return parseApplicationEdit((k) => form[k]);
};

describe("parseApplicationEdit", () => {
  it("accepts a minimal correction and turns blanks into nulls", () => {
    const r = run({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.address).toBeNull();
      expect(r.value.riding_years).toBeNull();
      expect(r.value.motorcycles).toEqual([]);
      expect(r.value.references).toEqual([]);
    }
  });

  it("keeps filled bike and reference rows and skips blank ones", () => {
    const r = run({ bike_0_make: "Honda", bike_0_model: "ADV 160", bike_0_year: "2024", bike_2_make: "Yamaha", bike_2_model: "NMAX", ref_1_name: "Maria", ref_1_phone: "0918 000 0000" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.motorcycles.map((m) => m.model)).toEqual(["ADV 160", "NMAX"]);
      expect(r.value.motorcycles[0].year).toBe(2024);
      expect(r.value.references).toEqual([{ name: "Maria", phone: "0918 000 0000", relationship: null }]);
    }
  });

  it("reports errors against the exact field", () => {
    const r = run({ email: "not-an-email", bike_1_make: "Honda", riding_years: "abc", ref_0_phone: "0917 111 2222" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(["bike_1_model", "email", "ref_0_name", "riding_years"]);
    }
  });
});
