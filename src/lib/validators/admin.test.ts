import { describe, expect, it } from "vitest";
import { albumSchema, changedKeys, inviteSchema, memberUpdateSchema, newsSchema } from "@/lib/validators/admin";

describe("admin validators", () => {
  it("member updates only accept known roles and statuses", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(memberUpdateSchema.safeParse({ id, role: "officer", status: "active", membership_type_id: "" }).success).toBe(true);
    expect(memberUpdateSchema.safeParse({ id, role: "owner", status: "active" }).success).toBe(false);
    expect(memberUpdateSchema.safeParse({ id, role: "member", status: "banned" }).success).toBe(false);
  });
  it("invites normalise email and require a name", () => {
    expect(inviteSchema.parse({ email: " New@Example.COM ", full_name: "New Rider", role: "member" }).email).toBe("new@example.com");
    expect(inviteSchema.safeParse({ email: "x@example.test", full_name: "", role: "member" }).success).toBe(false);
  });
  it("news gets a slug and a publish time when made public", () => {
    const pub = newsSchema.parse({ title: "Big Ride!", slug: "", is_public: "on" });
    expect(pub.slug).toBe("big-ride");
    expect(pub.published_at).toBeTruthy();
    const draft = newsSchema.parse({ title: "Draft", slug: "" });
    expect(draft.published_at).toBeNull();
    expect(newsSchema.parse({ title: "T", slug: "", is_public: "on", published_at: "2026-12-01T09:00" }).published_at).toBe("2026-12-01T01:00:00.000Z");
  });
  it("albums slugify", () => {
    expect(albumSchema.parse({ title: "Charity Ride 2026" }).slug).toBe("charity-ride-2026");
  });
  it("diffs audit snapshots ignoring updated_at", () => {
    expect(changedKeys({ role: "member", status: "active", updated_at: "a" }, { role: "officer", status: "active", updated_at: "b" })).toEqual(["role"]);
    expect(changedKeys(null, { id: 1 })).toEqual(["id"]);
  });
});
