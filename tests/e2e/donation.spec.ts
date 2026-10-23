import { expect, test } from "@playwright/test";
import { HAS_SUPABASE, SITE } from "./helpers";

test.describe("donations", () => {
  test("form validates amount and consent on the server and keeps typed values", async ({ page }) => {
    await page.goto(`${SITE}/donations`);
    const form = page.getByRole("form", { name: "Donate" });
    await form.getByText("Other").click();
    await form.getByLabel("Amount (PHP)").fill("5");
    await form.locator("#donor_name").fill("Test Donor");
    await form.getByLabel("Email").fill("donor@example.test");
    await form.getByRole("button", { name: "Donate now" }).click();
    await expect(form.getByText(/Enter an amount between/)).toBeVisible();
    await expect(form.getByText("Please accept the privacy notice")).toBeVisible();
    await expect(form.locator("#donor_name")).toHaveValue("Test Donor");
  });

  test("shows preset amounts", async ({ page }) => {
    await page.goto(`${SITE}/donations`);
    for (const label of ["₱100", "₱250", "₱500", "₱1,000", "₱2,500"]) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  });

  test("submits a pending donation and shows the thank-you page (needs local Supabase + seed)", async ({ page }) => {
    test.skip(!HAS_SUPABASE, "set E2E_SUPABASE=1 with the local stack running");
    await page.goto(`${SITE}/donations`);
    const form = page.getByRole("form", { name: "Donate" });
    await form.getByText("₱500", { exact: true }).click();
    await form.locator("#donor_name").fill("E2E Donor");
    await form.getByLabel("Email").fill(`donor+${Date.now()}@example.test`);
    await form.getByLabel(/I agree to the collection/).check();
    await form.getByRole("button", { name: "Donate now" }).click();
    await expect(page).toHaveURL(/\/donations\/thanks\?ref=[A-Z0-9]{8}/);
    await expect(page.getByRole("heading", { name: /thank you/i })).toBeVisible();
  });
});
