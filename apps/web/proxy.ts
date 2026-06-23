import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VALID_LANGS = new Set(["en", "vi", "th", "es"]);

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * 1. Injects x-pathname + x-lang headers for root layout (html lang SSR, SEO).
 * 2. Optimistic auth check for /admin/* — redirects to login when no auth cookie.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);

  // Inject lang from query param for SSR html lang attribute
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";
  response.headers.set("x-lang", VALID_LANGS.has(lang) ? lang : "en");

  // Admin auth check
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (request.nextUrl.pathname === "/admin/login") return response;

    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icons|sw\\.js|manifest|api|robots|sitemap).*)"],
};
