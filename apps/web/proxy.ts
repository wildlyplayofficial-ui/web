import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VALID_LANGS = new Set(["en", "vi", "th", "es"]);
const LANG_PREFIX_RE = /^\/(en|vi|th|es)(\/|$)/;

/**
 * Next.js 16 Proxy — path-based i18n routing.
 *
 * - /en/..., /th/..., /es/... -> pass through, set x-lang header
 * - /vi/... -> 301 strip the prefix (Vietnamese is the prefix-less canonical)
 * - Unprefixed paths -> rewrite to /vi/... internally (URL stays the same for user)
 * - ?lang=<non-vi> on any path -> 301 redirect to /<lang>/path (migration from old query-param scheme)
 * - ?lang=vi on any path -> 301 redirect to strip the param (back to the bare canonical)
 * - Admin/API routes pass through unchanged
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Legacy ?lang= migration: 301 redirect to path-based URL ──
  const qLang = searchParams.get("lang");
  if (qLang) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    if (qLang !== "vi" && VALID_LANGS.has(qLang) && !LANG_PREFIX_RE.test(pathname)) {
      url.pathname = `/${qLang}${pathname}`;
    }
    return NextResponse.redirect(url, 301);
  }

  // ── /vi prefix is redundant (Vietnamese is now the prefix-less canonical) ──
  // Rewrite maps bare paths to /vi internally, but /vi/... stays directly
  // reachable and duplicates the canonical URL. 301 strip it so Google sees one.
  // (/en/... is NOT stripped — it's the explicit home of the English version.)
  if (pathname === "/vi" || pathname.startsWith("/vi/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 301);
  }

  // ── /play/ picks are the EN/ES product (odds language). After the VI-default
  // flip the bare URL is Vietnamese — serving English betting content there both
  // mislabels it as VI and puts odds language on the VN surface (VN law). 301 the
  // bare /play → /en/play so the lang label matches the content. (Nick 16/8)
  if (pathname === "/play" || pathname.startsWith("/play/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url, 301);
  }

  // ── TMA routes: pass through unchanged (no lang rewrite) ──
  if (pathname.startsWith("/tma")) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
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

  // ── Unprefixed paths: rewrite internally to /vi/... (VI is the default lang) ──
  const url = request.nextUrl.clone();
  url.pathname = `/vi${pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-pathname", pathname);
  response.headers.set("x-lang", "vi");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons|images|brand/|sw\\.js|manifest\\.webmanifest|manifest|api|robots\\.txt|sitemap\\.xml|news-sitemap\\.xml|og-home\\.png|f29229590981931e9c15bc0efdb0dff0\\.txt).*)",
  ],
};
