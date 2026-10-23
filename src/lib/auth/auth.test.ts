import { describe, expect, it } from "vitest";
import { hasRole, isAdmin, isOfficer } from "@/lib/auth/roles";
import { sanitizeNext } from "@/lib/auth/safe-redirect";
import { fieldErrors, loginSchema, setPasswordSchema } from "@/lib/validators/auth";

describe("hasRole", () => {
  it("orders member < officer < admin", () => {
    expect(hasRole("member", "member")).toBe(true);
    expect(hasRole("member", "officer")).toBe(false);
    expect(hasRole("officer", "officer")).toBe(true);
    expect(hasRole("officer", "admin")).toBe(false);
    expect(hasRole("admin", "officer")).toBe(true);
  });
  it("denies missing or unknown roles", () => {
    expect(hasRole(null, "member")).toBe(false);
    expect(hasRole(undefined, "member")).toBe(false);
    expect(hasRole("superuser" as never, "member")).toBe(false);
    expect(isOfficer("member")).toBe(false);
    expect(isAdmin("admin")).toBe(true);
  });
});

describe("sanitizeNext", () => {
  it("keeps safe relative paths", () => {
    expect(sanitizeNext("/events")).toBe("/events");
    expect(sanitizeNext("/events?id=1")).toBe("/events?id=1");
  });
  it("rejects open-redirect attempts", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/https://evil.com", "events", "/a\nb"]) {
      expect(sanitizeNext(bad), bad).toBe("/");
    }
    expect(sanitizeNext(null)).toBe("/");
    expect(sanitizeNext(undefined, "/x")).toBe("/x");
  });
  it("hides the internal prefix and avoids login loops", () => {
    expect(sanitizeNext("/portal/events")).toBe("/events");
    expect(sanitizeNext("/portal")).toBe("/");
    expect(sanitizeNext("/login")).toBe("/");
  });
});

describe("auth validators", () => {
  it("normalises email and requires a password", () => {
    const ok = loginSchema.safeParse({ email: "  Rider@Example.COM ", password: "x" });
    expect(ok.success && ok.data.email).toBe("rider@example.com");
    const bad = loginSchema.safeParse({ email: "nope", password: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(Object.keys(fieldErrors(bad.error)).sort()).toEqual(["email", "password"]);
  });
  it("enforces password strength and confirmation", () => {
    expect(setPasswordSchema.safeParse({ password: "short1", confirm: "short1" }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ password: "onlyletterslong", confirm: "onlyletterslong" }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ password: "longenough123", confirm: "different123" }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ password: "longenough123", confirm: "longenough123" }).success).toBe(true);
  });
});
