import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VALID_LANGS = new Set(["vi", "th", "es"]);
const LANG_PREFIX_RE = /^\/(vi|th|es)(\/|$)/;

/**
 * Next.js 16 Proxy — path-based i18n routing.
 *
 * - /vi/..., /th/..., /es/... -> pass through, set x-lang header
 * - Unprefixed paths -> rewrite to /en/... internally (URL stays the same for user)
 * - ?lang=vi on any path -> 301 redirect to /vi/path (migration from old query-param scheme)
 * - ?lang=en on any path -> 301 redirect to strip the param
 * - Admin/API routes pass through unchanged
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Legacy ?lang= migration: 301 redirect to path-based URL ──
  const qLang = searchParams.get("lang");
  if (qLang) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    if (VALID_LANGS.has(qLang) && !LANG_PREFIX_RE.test(pathname)) {
      url.pathname = `/${qLang}${pathname}`;
    }
    return NextResponse.redirect(url, 301);
  }

  // ── Admin auth check (before lang rewrite) ──
  if (pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    response.headers.set("x-lang", "en");
    if (pathname === "/admin/login") return response;

    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  // ── Detect lang from path prefix ──
  const langMatch = pathname.match(LANG_PREFIX_RE);
  if (langMatch) {
    // /vi/... /th/... /es/... — pass through with x-lang header
    const lang = langMatch[1];
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    response.headers.set("x-lang", lang);
    return response;
  }

  // ── Unprefixed paths: rewrite internally to /en/... ──
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-pathname", pathname);
  response.headers.set("x-lang", "en");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons|sw\\.js|manifest\\.webmanifest|manifest|api|robots\\.txt|sitemap\\.xml|news-sitemap\\.xml|4c6e15b396a148b29b0e69e5abaf2835\\.txt).*)",
  ],
};
