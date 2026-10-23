import { expect, test } from "@playwright/test";
import { PORTAL, SITE, portalGet } from "./helpers";

test.describe("host isolation", () => {
  test("public host serves the website", async ({ page }) => {
    await page.goto(SITE);
    await expect(page.getByRole("heading", { level: 1, name: /ride\. connect\. support\./i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop Merchandise" })).toBeVisible();
  });

  test("public host cannot reach portal routes (404)", async ({ request }) => {
    for (const p of ["/login", "/admin", "/applications", "/portal", "/portal/login", "/site"]) {
      const res = await request.get(`${SITE}${p}`, { maxRedirects: 0 });
      expect(res.status(), p).toBe(404);
    }
  });

  test("portal host cannot reach public pages", async ({ request }) => {
    // Signed-out visitors are bounced to login; /site and /portal prefixes are never addressable.
    for (const p of ["/site", "/site/about", "/portal/login"]) {
      const res = await portalGet(request, p);
      expect(res.status(), p).toBe(404);
    }
    const shop = await portalGet(request, "/shop");
    expect(shop.status()).toBe(307);
    expect(shop.headers().location).toContain("/login");
  });

  test("portal requires login", async ({ page }) => {
    await page.goto(`${PORTAL}/admin`);
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("unknown public page renders the branded 404", async ({ page }) => {
    const res = await page.goto(`${SITE}/definitely-not-a-page`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  });
});
