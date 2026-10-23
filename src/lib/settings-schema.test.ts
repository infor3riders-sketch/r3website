import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/site-defaults";
import { SETTING_DEFS, fundUsageTotal, settingDef, splitLines, splitPairs } from "@/lib/settings-schema";

const def = (k: string) => settingDef(k)!;

describe("line and pair parsing", () => {
  it("splits lines and trims blanks", () => {
    expect(splitLines("  a \n\n b\r\n")).toEqual(["a", "b"]);
    expect(splitLines(undefined)).toEqual([]);
  });
  it("parses pairs and reports the first bad line", () => {
    expect(splitPairs("A | B\nC | D").rows).toEqual([["A", "B"], ["C", "D"]]);
    expect(splitPairs("A | B\nno separator").badLine).toBe(2);
    expect(splitPairs("A |  ").badLine).toBe(1);
  });
});

describe("membership_stats", () => {
  it("round-trips the declared numbers", () => {
    const parsed = def("membership_stats").parse({ text: "Iloilo City | 20\nCabatuan | 30\nSta. Barbara | 15" });
    expect(parsed).toEqual({ ok: true, value: [{ area: "Iloilo City", members: 20 }, { area: "Cabatuan", members: 30 }, { area: "Sta. Barbara", members: 15 }] });
    expect(def("membership_stats").format(DEFAULT_SETTINGS.membership_stats).text).toBe("Iloilo City | 20\nCabatuan | 30\nSta. Barbara | 15");
  });
  it("rejects non-numeric counts", () => {
    const r = def("membership_stats").parse({ text: "Iloilo City | many" });
    expect(r.ok).toBe(false);
  });
});

describe("other settings", () => {
  it("officers and chapters", () => {
    expect(def("officers").parse({ text: "Juan Cruz | President" })).toEqual({ ok: true, value: [{ name: "Juan Cruz", role: "President" }] });
    expect(def("chapters").parse({ text: "Iloilo | Iloilo City" })).toEqual({ ok: true, value: [{ name: "Iloilo", area: "Iloilo City" }] });
    expect(def("officers").parse({ text: "just a name" }).ok).toBe(false);
  });
  it("fund usage wraps items and validates percentages", () => {
    const ok = def("fund_usage").parse({ text: "Ride beneficiaries | 60\nOutreach | 40" });
    expect(ok).toEqual({ ok: true, value: { items: [{ label: "Ride beneficiaries", pct: 60 }, { label: "Outreach", pct: 40 }] } });
    if (ok.ok) expect(fundUsageTotal(ok.value)).toBe(100);
    expect(def("fund_usage").parse({ text: "Too much | 140" }).ok).toBe(false);
  });
  it("contact validates email, map URL and social links", () => {
    const base = { email: "a@example.test", phone: "1", address: "x", map_embed_url: "", socials: "Facebook | https://facebook.com/r3" };
    expect(def("contact").parse(base).ok).toBe(true);
    expect(def("contact").parse({ ...base, email: "nope" }).ok).toBe(false);
    expect(def("contact").parse({ ...base, map_embed_url: "https://evil.example/embed" }).ok).toBe(false);
    expect(def("contact").parse({ ...base, socials: "Facebook | javascript:alert(1)" }).ok).toBe(false);
  });
  it("registration requires the legal name", () => {
    expect(def("registration").parse({ legal_name: "" }).ok).toBe(false);
    expect(def("registration").parse({ legal_name: "R3 Riders Organization Incorporated", sec_registration_no: "2026100273107-46" }).ok).toBe(true);
  });
  it("payment instructions drop empty fields and the receipts flag stays private", () => {
    expect(def("payment_instructions").parse({ gcash_number: "0900", notes: "" })).toEqual({ ok: true, value: { gcash_number: "0900" } });
    expect(def("official_receipts_enabled").isPublic).toBe(false);
    expect(def("official_receipts_enabled").parse({ enabled: "on" })).toEqual({ ok: true, value: true });
    expect(def("official_receipts_enabled").parse({})).toEqual({ ok: true, value: false });
  });
  it("every public default setting has an editor with matching keys", () => {
    for (const key of Object.keys(DEFAULT_SETTINGS)) expect(settingDef(key), key).not.toBeNull();
    expect(new Set(SETTING_DEFS.map((d) => d.key)).size).toBe(SETTING_DEFS.length);
  });
});
