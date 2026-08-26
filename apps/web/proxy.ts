import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LANG_PREFIX_RE = /^\/(en|vi|th|es)(\/|$)/;

/**
 * Next.js 16 Proxy — path-based i18n routing.
 *
 * Site chỉ còn tiếng Việt (Peter chốt 25/8, nối tiếp đợt gỡ 23/8): /en /th /es đã
 * 301 về bản VI ngay trong next.config, nên tới đây pathname thực tế chỉ còn /vi
 * hoặc không tiền tố.
 *
 * - /vi/... -> 301 strip the prefix (Vietnamese is the prefix-less canonical)
 * - Unprefixed paths -> rewrite to /vi/... internally (URL stays the same for user)
 * - ?lang=... on any path -> 301 strip the param (back to the bare canonical)
 * - Admin/API routes pass through unchanged
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Legacy ?lang= migration: 301 về đúng URL canonical, MỘT nhịp ──
  // Trước đây ?lang=th đẩy sang /th/<path>, rồi luật 301 trong next.config lại đẩy
  // tiếp về /<path> — hai nhịp cho một lần chuyển (đo prod 26/8: /keo?lang=th ->
  // /th/keo -> /keo). Site chỉ còn tiếng Việt nên bỏ thẳng tham số là xong.
  if (searchParams.has("lang")) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
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
