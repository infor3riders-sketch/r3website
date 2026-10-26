import { z } from "zod";
import type { Json } from "@/lib/supabase/types";

/**
 * Admin-editable site content. Every setting is stored as JSON in `site_settings`; this module turns
 * the plain-text admin forms into those structured values (and back), validating on the way in.
 * Public rows are readable by the website; private ones (e.g. receipt toggle) are not.
 */
export type FieldKind = "text" | "textarea" | "lines" | "checkbox";

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  rows?: number;
}

export interface SettingDef {
  key: string;
  title: string;
  description: string;
  isPublic: boolean;
  fields: FieldDef[];
  /** Raw form strings -> JSON value, or per-field errors. */
  parse(raw: Record<string, string>): { ok: true; value: Json } | { ok: false; errors: Record<string, string> };
  /** Stored JSON -> raw form strings. */
  format(value: unknown): Record<string, string>;
}

// ---- helpers (exported for tests) -----------------------------------------
export const splitLines = (text: string | undefined): string[] =>
  (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** "A | B" per line -> [[A, B]]; rows without the separator are reported by index. */
export function splitPairs(text: string | undefined, parts = 2): { rows: string[][]; badLine?: number } {
  const rows: string[][] = [];
  const lines = splitLines(text);
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split("|").map((c) => c.trim());
    if (cells.length !== parts || cells.some((c) => !c)) return { rows, badLine: i + 1 };
    rows.push(cells);
  }
  return { rows };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

type Result = ReturnType<SettingDef["parse"]>;
const fail = (field: string, message: string): Result => ({ ok: false, errors: { [field]: message } });

function pairsDef(opts: { key: string; title: string; description: string; label: string; hint: string; map: (r: string[]) => Json; unmap: (v: unknown) => string; validate?: (r: string[]) => string | null; wrap?: boolean; isPublic?: boolean }): SettingDef {
  return {
    key: opts.key,
    title: opts.title,
    description: opts.description,
    isPublic: opts.isPublic ?? true,
    fields: [{ name: "text", label: opts.label, kind: "textarea", hint: opts.hint, rows: 6 }],
    parse(raw) {
      const { rows, badLine } = splitPairs(raw.text);
      if (badLine) return fail("text", `Line ${badLine} must look like: ${opts.hint}`);
      for (const r of rows) {
        const msg = opts.validate?.(r);
        if (msg) return fail("text", msg);
      }
      const items = rows.map(opts.map);
      return { ok: true, value: opts.wrap ? { items } : items };
    },
    format(value) {
      const list = opts.wrap ? arr(obj(value).items) : arr(value);
      return { text: list.map(opts.unmap).join("\n") };
    },
  };
}

export const SETTING_DEFS: SettingDef[] = [
  {
    key: "about_story",
    title: "Our story",
    description: "Shown on the About page.",
    isPublic: true,
    fields: [{ name: "text", label: "Story", kind: "textarea", rows: 8 }],
    parse: (raw) => {
      const text = (raw.text ?? "").trim();
      return text.length > 8000 ? fail("text", "Keep the story under 8,000 characters.") : { ok: true, value: text };
    },
    format: (v) => ({ text: str(v) }),
  },
  {
    key: "code_of_conduct",
    title: "Code of conduct",
    description: "One rule per line. Shown on the About page.",
    isPublic: true,
    fields: [{ name: "text", label: "Rules (one per line)", kind: "textarea", rows: 8 }],
    parse: (raw) => ({ ok: true, value: splitLines(raw.text).slice(0, 50) }),
    format: (v) => ({ text: arr(v).map(str).join("\n") }),
  },
  pairsDef({
    key: "officers",
    title: "Officers & board",
    description: "Shown on the About page.",
    label: "One per line: Name | Role",
    hint: "Name | Role",
    map: (r) => ({ name: r[0], role: r[1] }),
    unmap: (v) => `${str(obj(v).name)} | ${str(obj(v).role)}`,
  }),
  pairsDef({
    key: "chapters",
    title: "Chapters",
    description: "Shown on the About page when not empty.",
    label: "One per line: Chapter name | Area",
    hint: "Name | Area",
    map: (r) => ({ name: r[0], area: r[1] }),
    unmap: (v) => `${str(obj(v).name)} | ${str(obj(v).area)}`,
  }),
  pairsDef({
    key: "membership_stats",
    title: "Membership stats",
    description: "Member counts per area, shown on Home and Membership.",
    label: "One per line: Area | Number of members",
    hint: "Area | 20",
    validate: (r) => (/^\d{1,5}$/.test(r[1]) ? null : `"${r[1]}" is not a whole number of members.`),
    map: (r) => ({ area: r[0], members: Number(r[1]) }),
    unmap: (v) => `${str(obj(v).area)} | ${Number(obj(v).members) || 0}`,
  }),
  {
    key: "registration",
    title: "Registration details",
    description: "SEC registration shown on the About page.",
    isPublic: true,
    fields: [
      { name: "legal_name", label: "Registered name", kind: "text" },
      { name: "sec_registration_no", label: "SEC registration no.", kind: "text" },
      { name: "date_registered", label: "Date registered", kind: "text" },
      { name: "corporation_type", label: "Corporation type", kind: "text" },
      { name: "registered_with", label: "Registered with", kind: "text" },
      { name: "registered_address", label: "Registered address", kind: "text" },
    ],
    parse(raw) {
      const keys = ["legal_name", "sec_registration_no", "date_registered", "corporation_type", "registered_with", "registered_address"];
      const value: Record<string, string> = {};
      for (const k of keys) {
        const v = (raw[k] ?? "").trim();
        if (v.length > 200) return fail(k, "Keep this under 200 characters.");
        value[k] = v;
      }
      if (!value.legal_name) return fail("legal_name", "The registered name is required.");
      return { ok: true, value };
    },
    format: (v) => Object.fromEntries(["legal_name", "sec_registration_no", "date_registered", "corporation_type", "registered_with", "registered_address"].map((k) => [k, str(obj(v)[k])])),
  },
  {
    key: "contact",
    title: "Contact details",
    description: "Shown on the Contact page.",
    isPublic: true,
    fields: [
      { name: "email", label: "Email", kind: "text" },
      { name: "phone", label: "Phone", kind: "text" },
      { name: "address", label: "Address", kind: "text" },
      { name: "map_embed_url", label: "Map embed URL (https://www.google.com/maps/embed?...)", kind: "text" },
      { name: "socials", label: "Social links (one per line: Label | https://...)", kind: "textarea", rows: 4 },
    ],
    parse(raw) {
      const email = (raw.email ?? "").trim();
      if (email && !z.email().safeParse(email).success) return fail("email", "Enter a valid email address.");
      const map = (raw.map_embed_url ?? "").trim();
      if (map && !/^https:\/\/(www\.)?google\.com\/maps\/embed/.test(map)) return fail("map_embed_url", "Use a Google Maps embed URL (it starts with https://www.google.com/maps/embed).");
      const { rows, badLine } = splitPairs(raw.socials);
      if (badLine) return fail("socials", `Line ${badLine} must look like: Facebook | https://facebook.com/yourpage`);
      for (const r of rows) if (!/^https:\/\//.test(r[1])) return fail("socials", `"${r[1]}" must start with https://`);
      return { ok: true, value: { email, phone: (raw.phone ?? "").trim(), address: (raw.address ?? "").trim(), map_embed_url: map, socials: rows.map((r) => ({ label: r[0], href: r[1] })) } };
    },
    format: (v) => {
      const o = obj(v);
      return { email: str(o.email), phone: str(o.phone), address: str(o.address), map_embed_url: str(o.map_embed_url), socials: arr(o.socials).map((s) => `${str(obj(s).label)} | ${str(obj(s).href)}`).join("\n") };
    },
  },
  {
    key: "payment_instructions",
    title: "Payment instructions",
    description: "Shown at checkout, on donations and on dues pages for manual payments.",
    isPublic: true,
    fields: [
      { name: "gcash_number", label: "GCash number", kind: "text" },
      { name: "gcash_name", label: "GCash account name", kind: "text" },
      { name: "bank_name", label: "Bank", kind: "text" },
      { name: "bank_account", label: "Bank account number", kind: "text" },
      { name: "bank_account_name", label: "Bank account name", kind: "text" },
      { name: "notes", label: "Notes for payers", kind: "textarea", rows: 3 },
    ],
    parse(raw) {
      const keys = ["gcash_number", "gcash_name", "bank_name", "bank_account", "bank_account_name", "notes"];
      const value: Record<string, string> = {};
      for (const k of keys) {
        const v = (raw[k] ?? "").trim();
        if (v.length > 500) return fail(k, "Keep this under 500 characters.");
        if (v) value[k] = v;
      }
      return { ok: true, value };
    },
    format: (v) => Object.fromEntries(["gcash_number", "gcash_name", "bank_name", "bank_account", "bank_account_name", "notes"].map((k) => [k, str(obj(v)[k])])),
  },
  pairsDef({
    key: "fund_usage",
    title: "How funds are used",
    description: "Transparency section on the Donations page. Percentages should add up to 100.",
    label: "One per line: What the money is used for | Percent",
    hint: "Charity ride beneficiaries | 60",
    wrap: true,
    validate: (r) => (/^\d{1,3}$/.test(r[1]) && Number(r[1]) <= 100 ? null : `"${r[1]}" is not a percentage from 0 to 100.`),
    map: (r) => ({ label: r[0], pct: Number(r[1]) }),
    unmap: (v) => `${str(obj(v).label)} | ${Number(obj(v).pct) || 0}`,
  }),
  {
    key: "official_receipts_enabled",
    title: "Official donation receipts",
    description: "Leave OFF unless the organization is confirmed to be authorized to issue official donation receipts. When off, donors receive an acknowledgement only.",
    isPublic: false,
    fields: [{ name: "enabled", label: "Issue official receipts", kind: "checkbox" }],
    parse: (raw) => ({ ok: true, value: raw.enabled === "on" }),
    format: (v) => ({ enabled: v === true ? "on" : "" }),
  },
];

export const settingDef = (key: string) => SETTING_DEFS.find((d) => d.key === key) ?? null;

/** Total of fund usage percentages, for an admin-side sanity hint. */
export const fundUsageTotal = (value: unknown) => arr(obj(value).items).reduce<number>((n, i) => n + (Number(obj(i).pct) || 0), 0);
