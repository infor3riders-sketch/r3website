import { describe, expect, it } from "vitest";
import { announcementSchema, motorcycleFormSchema, profileSchema, sniffImage } from "@/lib/validators/profile";

const base = {
  full_name: "Juan Dela Cruz",
  road_name: "",
  phone: "",
  address: "",
  birthdate: "",
  blood_type: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
};

describe("profileSchema", () => {
  it("turns blanks into null and checkboxes into booleans", () => {
    const r = profileSchema.parse({ ...base, directory_visible: "on", show_phone: null });
    expect(r.road_name).toBeNull();
    expect(r.blood_type).toBeNull();
    expect(r.phone).toBeNull();
    expect(r.directory_visible).toBe(true);
    expect(r.show_phone).toBe(false);
    expect(r.show_email).toBe(false);
  });
  it("validates blood type, phone and birthdate", () => {
    expect(profileSchema.safeParse({ ...base, blood_type: "Z+" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, blood_type: "O+" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, phone: "abc" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, birthdate: "2999-01-01" }).success).toBe(false);
  });
  it("requires a name", () => {
    expect(profileSchema.safeParse({ ...base, full_name: " " }).success).toBe(false);
  });
});

describe("motorcycleFormSchema", () => {
  it("coerces numbers and nulls blanks", () => {
    const r = motorcycleFormSchema.parse({ make: "Honda", model: "Click", year: "2020", displacement_cc: "", color: "", plate_number: "" });
    expect(r.year).toBe(2020);
    expect(r.displacement_cc).toBeNull();
  });
  it("rejects impossible years", () => {
    expect(motorcycleFormSchema.safeParse({ make: "A", model: "B", year: "1800", displacement_cc: "", color: "", plate_number: "" }).success).toBe(false);
  });
});

describe("announcementSchema", () => {
  it("requires title and body", () => {
    expect(announcementSchema.safeParse({ title: "", body: "x" }).success).toBe(false);
    expect(announcementSchema.parse({ title: "Ride", body: "Details", pinned: "on" }).pinned).toBe(true);
  });
});

describe("sniffImage", () => {
  it("recognises real image signatures only", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImage(webp)).toBe("image/webp");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });
});
