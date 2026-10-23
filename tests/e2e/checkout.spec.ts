import { expect, test } from "@playwright/test";
import { HAS_SUPABASE, SITE } from "./helpers";

test.describe("shop checkout with manual payment (needs local Supabase + seed)", () => {
  test.skip(!HAS_SUPABASE, "set E2E_SUPABASE=1 with the local stack running");

  test("guest adds a tee, checks out with a discount code and lands on a pending order", async ({ page }) => {
    await page.goto(`${SITE}/shop`);
    await page.getByRole("link", { name: /R3 Riders Tee/i }).first().click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.goto(`${SITE}/shop/checkout`);

    await page.getByLabel("Full name").fill("E2E Buyer");
    await page.getByLabel("Email").fill(`buyer+${Date.now()}@example.test`);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page.getByLabel("Street address, barangay").fill("123 Test St");
    await page.getByLabel("City / municipality").fill("Iloilo City");
    await page.getByLabel("Province").fill("Iloilo");
    await page.getByLabel("Discount code").fill("DEVTEN");
    await page.getByLabel(/I agree to the collection/).check();
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/orders\/R3-\d{4}-\d{5}\?t=/);
    await expect(page.getByText("Awaiting payment")).toBeVisible();
    await expect(page.getByText(/Discount/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Already paid?" })).toBeVisible();
  });

  test("order page is not reachable without the emailed token", async ({ request }) => {
    const res = await request.get(`${SITE}/orders/R3-2610-00001?t=not-a-real-token-at-all-0000`);
    expect(res.status()).toBe(404);
  });
});
