/** Brand-styled transactional email layout (inline styles only; email clients ignore stylesheets). */

export const escapeHtml = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface LayoutInput {
  subject: string;
  heading: string;
  /** Already-safe HTML paragraphs. Build with `p()` / `table()` so user input is escaped. */
  body: string;
  /** Plain-text equivalent. */
  text: string;
  cta?: { label: string; href: string };
  preheader?: string;
}

export const p = (text: string) => `<p style="margin:0 0 14px;">${escapeHtml(text)}</p>`;

/** Key/value rows (values are escaped). */
export function details(rows: [string, string][]): string {
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#8a8a8a;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 0;color:#ffffff;font-size:14px;">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">${tr}</table>`;
}

export function renderEmail(i: LayoutInput): RenderedEmail {
  const cta = i.cta
    ? `<tr><td align="center" style="padding:8px 32px 28px;"><a href="${escapeHtml(i.cta.href)}" style="display:inline-block;background:#f2a81d;color:#000000;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:14px 28px;border-radius:6px;">${escapeHtml(i.cta.label)}</a></td></tr>`
    : "";
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#0b0b0c;font-family:Arial,Helvetica,sans-serif;color:#d6d6d6;">
${i.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(i.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0c;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#151515;border:1px solid #6b4a0a;border-radius:8px;">
<tr><td style="padding:28px 32px 8px;text-align:center;">
<div style="font-size:13px;letter-spacing:4px;color:#f2a81d;text-transform:uppercase;">R3 Riders</div>
<h1 style="margin:12px 0 0;font-size:24px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(i.heading)}</h1>
</td></tr>
<tr><td style="padding:16px 32px 8px;font-size:15px;line-height:1.6;color:#d6d6d6;">${i.body}</td></tr>
${cta}
<tr><td style="padding:0 32px 28px;font-size:12px;color:#8a8a8a;text-align:center;">Ride. Connect. Support.<br/>R3 Riders Organization Incorporated</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${i.heading}\n\n${i.text}${i.cta ? `\n\n${i.cta.label}: ${i.cta.href}` : ""}\n\nR3 Riders Organization Incorporated`;
  return { subject: i.subject, html, text };
}
