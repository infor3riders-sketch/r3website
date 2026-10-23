import { describe, expect, it } from "vitest";
import { isInternalPath, isPortalPublicPath, resolveSiteKind, toInternalPath } from "@/lib/hosts";

const cfg = { siteHost: "localhost:3000", portalHost: "portal.localhost:3000" };

describe("resolveSiteKind", () => {
  it("routes the portal host to the portal", () => {
    expect(resolveSiteKind("portal.localhost:3000", cfg)).toBe("portal");
    expect(resolveSiteKind("PORTAL.localhost:3000", cfg)).toBe("portal");
  });
  it("tolerates a different port on the portal host", () => {
    expect(resolveSiteKind("portal.localhost:3001", cfg)).toBe("portal");
  });
  it("routes everything else to the public site", () => {
    expect(resolveSiteKind("localhost:3000", cfg)).toBe("site");
    expect(resolveSiteKind("random.vercel.app", cfg)).toBe("site");
    expect(resolveSiteKind(null, cfg)).toBe("site");
  });
});

describe("internal paths", () => {
  it("detects direct access to internal prefixes", () => {
    expect(isInternalPath("/portal")).toBe(true);
    expect(isInternalPath("/portal/login")).toBe(true);
    expect(isInternalPath("/site/about")).toBe(true);
  });
  it("does not flag lookalikes", () => {
    expect(isInternalPath("/portals")).toBe(false);
    expect(isInternalPath("/sitemap.xml")).toBe(false);
    expect(isInternalPath("/about")).toBe(false);
  });
  it("maps external to internal paths", () => {
    expect(toInternalPath("site", "/")).toBe("/site");
    expect(toInternalPath("site", "/about")).toBe("/site/about");
    expect(toInternalPath("portal", "/login")).toBe("/portal/login");
  });
});

describe("isPortalPublicPath", () => {
  it("allows only the auth entry points", () => {
    expect(isPortalPublicPath("/login")).toBe(true);
    expect(isPortalPublicPath("/accept-invite")).toBe(true);
    expect(isPortalPublicPath("/")).toBe(false);
    expect(isPortalPublicPath("/loginx")).toBe(false);
    expect(isPortalPublicPath("/admin")).toBe(false);
  });
});
