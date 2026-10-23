import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PORTAL, SITE } from "./helpers";

/**
 * Automated WCAG 2 A/AA checks (axe) on the main public pages and the portal sign-in.
 * Automated checks catch roughly a third of issues; manual keyboard and screen-reader passes are still needed.
 */
const PAGES: [string, string][] = [
  ["home", `${SITE}/`],
  ["about", `${SITE}/about`],
  ["membership", `${SITE}/membership`],
  ["services", `${SITE}/services`],
  ["events", `${SITE}/services/events`],
  ["shop", `${SITE}/shop`],
  ["cart", `${SITE}/shop/cart`],
  ["donations", `${SITE}/donations`],
  ["contact", `${SITE}/contact`],
  ["legal", `${SITE}/legal/privacy`],
  ["portal login", `${PORTAL}/login`],
  ["portal forgot password", `${PORTAL}/forgot-password`],
];

for (const [name, url] of PAGES) {
  test(`a11y: ${name}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) e.g. ${v.nodes[0]?.target.join(" ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
