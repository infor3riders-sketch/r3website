import { describe, expect, it } from "vitest";
import { cashDuesSchema, duesState, periodSchema } from "@/lib/validators/dues";
import { documentSchema, safeFileName, sniffDocument } from "@/lib/validators/documents";

describe("periodSchema", () => {
  it("accepts a normal period and coerces the amount", () => {
    const r = periodSchema.parse({ label: "2027 Dues", starts_on: "2027-01-01", due_on: "2027-03-31", amount: "1500" });
    expect(r.amount).toBe(1500);
  });
  it("rejects a due date before the start and bad dates", () => {
    expect(periodSchema.safeParse({ label: "X", starts_on: "2027-03-01", due_on: "2027-01-01", amount: "1" }).success).toBe(false);
    expect(periodSchema.safeParse({ label: "X", starts_on: "soon", due_on: "2027-01-01", amount: "1" }).success).toBe(false);
    expect(periodSchema.safeParse({ label: "X", starts_on: "2027-01-01", due_on: "2027-02-01", amount: "-5" }).success).toBe(false);
  });
});

describe("duesState", () => {
  const period = { starts_on: "2027-01-01", due_on: "2027-03-31" };
  it("derives the member-facing state", () => {
    expect(duesState(period, { status: "paid" }, "2027-06-01")).toBe("paid");
    expect(duesState(period, { status: "pending" }, "2027-06-01")).toBe("pending");
    expect(duesState(period, { status: "rejected" }, "2027-02-01")).toBe("rejected");
    expect(duesState(period, null, "2027-04-01")).toBe("overdue");
    expect(duesState(period, null, "2027-02-01")).toBe("due");
    expect(duesState(period, undefined, "2026-12-01")).toBe("upcoming");
  });
  it("requires uuids for cash payments", () => {
    expect(cashDuesSchema.safeParse({ period_id: "x", profile_id: "y" }).success).toBe(false);
  });
});

describe("documents", () => {
  it("validates metadata", () => {
    expect(documentSchema.safeParse({ title: "Bylaws", category: "bylaws", min_role: "member" }).success).toBe(true);
    expect(documentSchema.safeParse({ title: "x", category: "secrets", min_role: "member" }).success).toBe(false);
    expect(documentSchema.safeParse({ title: "x", category: "forms", min_role: "root" }).success).toBe(false);
  });
  it("sniffs allowed types and rejects the rest", () => {
    expect(sniffDocument(new TextEncoder().encode("%PDF-1.7"), "a.pdf")?.ext).toBe("pdf");
    expect(sniffDocument(new Uint8Array([0x50, 0x4b, 3, 4, 0]), "minutes.docx")?.ext).toBe("docx");
    expect(sniffDocument(new Uint8Array([0x50, 0x4b, 3, 4, 0]), "evil.zip")).toBeNull();
    expect(sniffDocument(new TextEncoder().encode("<script>"), "a.pdf")).toBeNull();
  });
  it("makes storage-safe names", () => {
    expect(safeFileName("My Minutes (Oct 2026).PDF")).toBe("my-minutes-oct-2026.pdf");
    expect(safeFileName("../../etc/passwd")).not.toContain("..");
    expect(safeFileName("???")).toBe("file");
  });
});
