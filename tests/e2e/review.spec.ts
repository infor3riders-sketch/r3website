import { expect, test } from "@playwright/test";
import { HAS_SUPABASE, PORTAL, loginAs } from "./helpers";

test.describe("officer application review (needs local Supabase + seed)", () => {
  test.skip(!HAS_SUPABASE, "set E2E_SUPABASE=1 with the local stack running");

  test("officer sees the queue and can open an application", async ({ page }) => {
    await loginAs(page, "officer");
    await page.goto(`${PORTAL}/applications`);
    await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
    const first = page.getByRole("table").getByRole("link").first();
    if (await first.count()) {
      await first.click();
      await expect(page.getByRole("button", { name: "Approve and invite" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Reject application" })).toBeVisible();
    }
  });

  test("member cannot open the queue", async ({ page }) => {
    await loginAs(page, "member");
    const res = await page.goto(`${PORTAL}/applications`);
    expect(res?.status()).toBe(404);
  });
});
