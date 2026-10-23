import { z } from "zod";

export const DOC_CATEGORIES = ["general", "bylaws", "forms", "minutes", "finance"] as const;
export const DOC_MAX_BYTES = 20 * 1024 * 1024;

export const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
  category: z.enum(DOC_CATEGORIES, { error: "Choose a category" }),
  min_role: z.enum(["member", "officer", "admin"]),
});

/** Allowed document types by magic bytes (the bucket also restricts MIME types). */
export function sniffDocument(bytes: Uint8Array, filename: string): { type: string; ext: string } | null {
  const head = (n: number) => String.fromCharCode(...bytes.slice(0, n));
  if (head(5) === "%PDF-") return { type: "application/pdf", ext: "pdf" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return { type: "image/png", ext: "png" };
  // .docx is a zip container: PK\x03\x04 plus the extension
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4 && /\.docx$/i.test(filename)) {
    return { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
  }
  return null;
}

/** Storage-safe file name: lowercase letters, digits, dot, dash. */
export const safeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(-80) || "file";
