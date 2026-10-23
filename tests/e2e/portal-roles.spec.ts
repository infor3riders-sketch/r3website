import { expect, test } from "@playwright/test";
import { HAS_SUPABASE, PORTAL, loginAs } from "./helpers";

test.describe("role guards (needs local Supabase + seed)", () => {
  test.skip(!HAS_SUPABASE, "set E2E_SUPABASE=1 with the local stack running");

  test("member can sign in but is blocked from admin and officer routes", async ({ page }) => {
    await loginAs(page, "member");
    await expect(page.getByTestId("user-name")).toBeVisible();
    for (const p of ["/admin", "/applications", "/manage/shop"]) {
      const res = await page.goto(`${PORTAL}${p}`);
      expect(res?.status(), p).toBe(404);
    }
  });

  test("admin can open the admin area", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto(`${PORTAL}/admin`);
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  });

  test("wrong password shows a generic error", async ({ page }) => {
    await page.goto(`${PORTAL}/login`);
    await page.getByLabel("Email").fill("member@dev.r3riders.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });
});
