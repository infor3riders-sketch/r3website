// Renders public/brand/favicon.svg to public/favicon.ico (PNG-in-ICO, 48x48) using Playwright's Chromium.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("public/brand/favicon.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 48, height: 48 } });
await page.setContent(`<body style="margin:0;background:transparent">${svg.replace("<svg ", '<svg width="48" height="48" ')}</body>`);
const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 48, height: 48 } });
await browser.close();

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image
const entry = Buffer.alloc(16);
entry[0] = 48; // width
entry[1] = 48; // height
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12); // offset
writeFileSync("public/favicon.ico", Buffer.concat([header, entry, png]));
console.log(`public/favicon.ico ${png.length + 22} bytes`);
