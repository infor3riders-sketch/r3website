import { describe, expect, it } from "vitest";
import { campaignSchema, donationSchema } from "@/lib/validators/donations";

const base = { donor_name: "Ana", donor_email: "ana@example.test", consent: "on" };

describe("donationSchema", () => {
  it("accepts a preset amount", () => {
    const r = donationSchema.parse({ ...base, amount: "500" });
    expect(r.amount).toBe(500);
    expect(r.is_anonymous).toBe(false);
    expect(r.campaign_id).toBeNull();
  });
  it("accepts a custom amount with peso sign and commas", () => {
    expect(donationSchema.parse({ ...base, amount: "custom", custom_amount: "₱1,250.50" }).amount).toBe(1250.5);
  });
  it("rejects too small, too large, and garbage amounts", () => {
    expect(donationSchema.safeParse({ ...base, amount: "custom", custom_amount: "5" }).success).toBe(false);
    expect(donationSchema.safeParse({ ...base, amount: "custom", custom_amount: "99999999" }).success).toBe(false);
    expect(donationSchema.safeParse({ ...base, amount: "custom", custom_amount: "abc" }).success).toBe(false);
    expect(donationSchema.safeParse({ ...base, amount: "-100" }).success).toBe(false);
  });
  it("requires consent and a valid email", () => {
    expect(donationSchema.safeParse({ donor_name: "A", donor_email: "a@example.test", amount: "100" }).success).toBe(false);
    expect(donationSchema.safeParse({ ...base, donor_email: "nope", amount: "100" }).success).toBe(false);
  });
  it("honours the anonymous flag", () => {
    expect(donationSchema.parse({ ...base, amount: "100", is_anonymous: "on" }).is_anonymous).toBe(true);
  });
});

describe("campaignSchema", () => {
  it("builds a slug and nulls an empty goal", () => {
    const r = campaignSchema.parse({ title: "Charity Ride 2027", slug: "", goal_amount: "" });
    expect(r.slug).toBe("charity-ride-2027");
    expect(r.goal_amount).toBeNull();
  });
  it("rejects a zero goal", () => {
    expect(campaignSchema.safeParse({ title: "X", slug: "", goal_amount: "0" }).success).toBe(false);
  });
});
