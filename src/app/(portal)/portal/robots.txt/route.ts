export const dynamic = "force-static";

// The member portal is private: ask crawlers to stay out entirely.
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
