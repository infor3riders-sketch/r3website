import { expect, test } from "@playwright/test";
import { SITE } from "./helpers";

test.describe("public pages", () => {
  test("about shows vision, mission, values and SEC registration", async ({ page }) => {
    await page.goto(`${SITE}/about`);
    await expect(page.getByRole("heading", { name: "Vision" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Core Values" })).toBeVisible();
    for (const v of ["Compassion", "Integrity", "Solidarity"]) await expect(page.getByRole("heading", { name: v })).toBeVisible();
    await expect(page.getByText("2026100273107-46")).toBeVisible();
  });

  test("membership shows per-area stats and total", async ({ page }) => {
    await page.goto(`${SITE}/membership`);
    for (const area of ["Iloilo City", "Cabatuan", "Sta. Barbara"]) await expect(page.getByText(area, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("65", { exact: true })).toBeVisible();
  });

  test("primary navigation lists all seven items in order", async ({ page }) => {
    await page.goto(SITE);
    const links = await page.getByRole("navigation", { name: "Primary" }).getByRole("list").getByRole("link").allTextContents();
    expect(links).toEqual(["Home", "About Us", "Membership", "Services", "Shop", "Donations", "Contact Us"]);
  });

  test("contact form validates on the server and keeps typed values", async ({ page }) => {
    await page.goto(`${SITE}/contact`);
    await page.getByLabel("Name").fill("Test Rider");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Message is required")).toBeVisible();
    await expect(page.getByText("Please accept the privacy notice")).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Test Rider");
  });

  test("legal pages are flagged as draft", async ({ page }) => {
    await page.goto(`${SITE}/legal/privacy`);
    await expect(page.getByText(/Draft content/)).toBeVisible();
  });

  test("robots and sitemap are served", async ({ request }) => {
    const robots = await request.get(`${SITE}/robots.txt`);
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap:");
    expect((await request.get(`${SITE}/sitemap.xml`)).status()).toBe(200);
  });
});
