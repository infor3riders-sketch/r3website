// Usage: node scripts/screenshot.mjs [baseUrl]   (server must be running)
// Writes full-page captures to docs/design/screens/ for comparison with docs/design/home-reference.png
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["tablet", { width: 820, height: 1100 }], ["mobile", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: `docs/design/screens/home-${name}.png`, fullPage: true });
  await page.screenshot({ path: `docs/design/screens/home-${name}-fold.png` });
  await page.close();
}
await browser.close();
