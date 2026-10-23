import { siteUrl } from "@/lib/env";

// robots.ts is only supported at the app root, which would collide between the two products,
// so the public site serves robots.txt from a route handler (the proxy rewrites /robots.txt here).
export const dynamic = "force-static";

export function GET() {
  const body = ["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /orders/", "", `Sitemap: ${siteUrl("/sitemap.xml")}`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
