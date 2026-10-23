import { expect, test } from "@playwright/test";
import { HAS_SUPABASE, PORTAL, loginAs } from "./helpers";

test.describe("member login and RSVP (needs local Supabase + seed)", () => {
  test.skip(!HAS_SUPABASE, "set E2E_SUPABASE=1 with the local stack running");

  test("member signs in, RSVPs to the seeded ride and sees it on the dashboard", async ({ page }) => {
    await loginAs(page, "member");
    await page.goto(`${PORTAL}/events`);
    await page.getByRole("link", { name: /sample charity ride/i }).first().click();
    await page.getByLabel("Going").check();
    await page.getByLabel("Riders").fill("1");
    await page.getByLabel("Passengers").fill("1");
    await page.getByRole("button", { name: /RSVP/ }).click();
    await expect(page.getByText(/You're in/)).toBeVisible();

    await page.goto(`${PORTAL}/`);
    await expect(page.getByRole("heading", { name: "My RSVPs" })).toBeVisible();
    await expect(page.getByRole("link", { name: /sample charity ride/i }).first()).toBeVisible();
  });
});
