// Generates public/brand/grain.png: a small tileable white-noise texture (gray+alpha, 4 alpha levels).
// Replaces an SVG feTurbulence filter that had to be rasterised on every load.
import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 96;
let seed = 1337;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const levels = [0, 5, 11, 18];

const raw = Buffer.alloc((SIZE * 2 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 2 + 1)] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const o = y * (SIZE * 2 + 1) + 1 + x * 2;
    raw[o] = 255; // white
    raw[o + 1] = levels[Math.floor(rand() * levels.length)];
  }
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 4; // gray + alpha
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
writeFileSync("public/brand/grain.png", png);
console.log(`public/brand/grain.png ${png.length} bytes`);
