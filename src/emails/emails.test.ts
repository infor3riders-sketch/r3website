import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/emails/layout";
import {
  applicationApproved,
  applicationInfoRequested,
  applicationReceived,
  donationAcknowledgement,
  orderConfirmation,
} from "@/emails/templates";

describe("email templates", () => {
  it("escapes user-controlled values", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    const e = applicationReceived({ name: `<img src=x onerror=alert(1)>`, reference: "R3-1" });
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).toContain("&lt;img");
  });
  it("escapes officer messages and CTA links", () => {
    const e = applicationInfoRequested({ name: "A", message: `<b>hi</b>` });
    expect(e.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
    const o = orderConfirmation({ name: "A", orderNo: "R3-2610-00001", total: 900, items: [{ name: "Tee", quantity: 2, unitPrice: 450 }], lookupUrl: `https://x.test/o?t="><script>` });
    expect(o.html).not.toContain(`"><script>`);
    expect(o.text).toContain("₱900.00");
  });
  it("acknowledgement is not an official receipt unless enabled", () => {
    const ack = donationAcknowledgement({ name: "D", amount: 500, reference: "D-1" });
    expect(ack.html).toContain("not an official receipt");
    expect(ack.subject).not.toMatch(/receipt/i);
    const official = donationAcknowledgement({ name: "D", amount: 500, reference: "D-1", official: true });
    expect(official.subject).toMatch(/receipt/i);
  });
  it("renders subject, html and text for each template", () => {
    const e = applicationApproved({ name: "Rider" });
    expect(e.subject).toBeTruthy();
    expect(e.html).toContain("<!doctype html>");
    expect(e.text).toContain("Rider");
  });
});
