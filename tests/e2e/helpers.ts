import type { APIRequestContext, Page } from "@playwright/test";

export const SITE = "http://localhost:3000";
export const PORTAL = "http://portal.localhost:3000";
export const HAS_SUPABASE = process.env.E2E_SUPABASE === "1";

/** Dev seed users (supabase/seed.sql). */
export const USERS = {
  admin: { email: "admin@dev.r3riders.test", password: "DevPassw0rd!" },
  officer: { email: "officer@dev.r3riders.test", password: "DevPassw0rd!" },
  member: { email: "member@dev.r3riders.test", password: "DevPassw0rd!" },
};

export async function loginAs(page: Page, who: keyof typeof USERS) {
  await page.goto(`${PORTAL}/login`);
  await page.getByLabel("Email").fill(USERS[who].email);
  await page.getByLabel("Password").fill(USERS[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${PORTAL}/`);
}

/** Node DNS does not resolve *.localhost (Chromium does), so API-level portal requests set the Host header. */
export function portalGet(request: APIRequestContext, path: string) {
  return request.get(`http://127.0.0.1:3000${path}`, { headers: { host: "portal.localhost:3000" }, maxRedirects: 0 });
}
