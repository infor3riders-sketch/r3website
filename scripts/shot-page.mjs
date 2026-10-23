// Usage: node scripts/shot-page.mjs <path> <out.png> [width] [baseUrl]
import { chromium } from "@playwright/test";
const [path = "/", out = "docs/design/screens/page.png", width = "1440", base = "http://localhost:3000"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
await page.goto(base + path, { waitUntil: "networkidle" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
