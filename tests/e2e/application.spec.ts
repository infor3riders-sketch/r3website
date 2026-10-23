import { expect, test, type Page } from "@playwright/test";
import { HAS_SUPABASE, SITE } from "./helpers";

async function fillAllSteps(page: Page, email: string) {
  await page.goto(`${SITE}/membership`);
  const form = page.getByRole("form", { name: "Membership application" });
  await form.getByLabel("Full name").fill("E2E Test Rider");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Mobile number").fill("0917 123 4567");
  await form.getByLabel("Birthdate").fill("1990-05-01");
  await form.getByLabel("Home address").fill("Iloilo City");
  await form.getByRole("button", { name: "Continue" }).click();

  await form.getByLabel("Years of riding").fill("5");
  await form.getByLabel("Tell us about your riding experience").fill("Weekend rides and tours.");
  await form.getByLabel("Driver's license number").fill("N01-23-456789");
  await form.getByRole("button", { name: "Continue" }).click();

  await form.locator('[id="motorcycles.0.make"]').fill("Honda");
  await form.locator('[id="motorcycles.0.model"]').fill("CB500X");
  await form.locator('[id="motorcycles.0.year"]').fill("2021");
  await form.getByRole("button", { name: "Continue" }).click();

  for (const i of [0, 1]) {
    await form.locator(`[id="references.${i}.name"]`).fill(`Ref ${i + 1}`);
    await form.locator(`[id="references.${i}.phone"]`).fill("0917 000 000" + i);
    await form.locator(`[id="references.${i}.relationship"]`).fill("Friend");
  }
  await form.getByRole("button", { name: "Continue" }).click();
  return form;
}

test.describe("membership application", () => {
  test("each step validates before continuing", async ({ page }) => {
    await page.goto(`${SITE}/membership`);
    const form = page.getByRole("form", { name: "Membership application" });
    await form.getByRole("button", { name: "Continue" }).click();
    await expect(form.getByText("Full name is required")).toBeVisible();
    await expect(form.getByText("Enter your email address")).toBeVisible();
    await expect(form.getByRole("heading", { name: /Step 1 of 5/ })).toBeVisible();

    await form.getByLabel("Full name").fill("E2E Test Rider");
    await form.getByLabel("Email").fill("rider@example.test");
    await form.getByLabel("Mobile number").fill("0917 123 4567");
    await form.getByLabel("Birthdate").fill("2015-01-01");
    await form.getByLabel("Home address").fill("Iloilo City");
    await form.getByRole("button", { name: "Continue" }).click();
    await expect(form.getByText("You must be at least 18 years old")).toBeVisible();
  });

  test("final step requires rules agreement and privacy consent", async ({ page }) => {
    const form = await fillAllSteps(page, "rider@example.test");
    await expect(form.getByRole("heading", { name: /Step 5 of 5/ })).toBeVisible();
    await form.getByRole("button", { name: "Submit application" }).click();
    await expect(form.getByText("You must agree to the club rules")).toBeVisible();
    await expect(form.getByText("Please accept the privacy notice to continue")).toBeVisible();
  });

  test("submits a pending application (needs local Supabase + seed)", async ({ page }) => {
    test.skip(!HAS_SUPABASE, "set E2E_SUPABASE=1 with the local stack running");
    const form = await fillAllSteps(page, `e2e+${Date.now()}@example.test`);
    await form.getByLabel(/read and agree to follow/).check();
    await form.getByLabel(/I consent to the collection/).check();
    await form.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    await expect(page.getByText(/APP-[0-9A-F]{8}/)).toBeVisible();
  });
});
