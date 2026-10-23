import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Brand assets are optional files under public/brand/. When a file is missing the
 * UI falls back to a placeholder (see docs/ASSUMPTIONS.md).
 *   public/brand/logo.png|svg        winged emblem
 *   public/brand/hero.jpg            hero photograph
 *   public/brand/icons/<name>.svg    custom card artwork (membership, services, merch, donate)
 */
export function brandAsset(...candidates: string[]): string | null {
  for (const rel of candidates) {
    if (existsSync(path.join(process.cwd(), "public", "brand", rel))) return `/brand/${rel}`;
  }
  return null;
}
