import { NextResponse, type NextRequest } from "next/server";
import { getHostConfig } from "@/lib/env";
import {
  isInternalPath,
  isPortalPublicPath,
  resolveSiteKind,
  toInternalPath,
} from "@/lib/hosts";
import { refreshSession } from "@/lib/supabase/middleware";

/**
 * Host-based routing (Next 16 renamed `middleware` to `proxy`).
 *  - public host  -> /site/*   (app/(site)/site)
 *  - portal host  -> /portal/* (app/(portal)/portal)
 * Direct requests to /site or /portal are refused so the two products are
 * unreachable from each other's host.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalPath(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const kind = resolveSiteKind(request.headers.get("host"), getHostConfig());
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = toInternalPath(kind, pathname);

  if (kind === "site") {
    return NextResponse.rewrite(rewriteUrl);
  }

  // Portal: refresh the session cookie and apply an optimistic auth gate.
  const response = NextResponse.rewrite(rewriteUrl);
  const { userId } = await refreshSession(request, response);

  if (!userId && !isPortalPublicPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (userId && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = {
  // Skip Next internals, API routes (they enforce their own auth/signatures) and static images.
  // sitemap.xml / robots.txt are metadata routes inside (site)/site, so they must be rewritten.
  matcher: ["/((?!api/|_next/|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
