import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const locales = ["en", "zh-CN", "ja", "ko"];
const defaultLocale = "en";

function getLocale(request: NextRequest): string {
  // 1. Honor an explicit language cookie first (user's manual selection)
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Parse Accept-Language with q-values, highest-first
  const acceptLanguage = request.headers.get("accept-language") || "";
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const qMatch = rest.find((r) => r.startsWith("q="));
      const q = qMatch ? parseFloat(qMatch.slice(2)) : 1.0;
      return { tag: tag.toLowerCase(), q: Number.isNaN(q) ? 1.0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferred) {
    // Exact match (e.g. "zh-CN")
    const exact = locales.find((l) => l.toLowerCase() === tag);
    if (exact) return exact;

    const base = tag.split("-")[0];

    // Chinese: always map to zh-CN (our only Chinese variant)
    if (base === "zh") return "zh-CN";

    // Prefix match (e.g. "ja-JP" → "ja")
    const prefix = locales.find((l) => l.toLowerCase().startsWith(base));
    if (prefix) return prefix;
  }

  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return;
  }

  // Locale redirect (must happen before session refresh, since redirects don't carry cookies)
  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    const response = NextResponse.redirect(request.nextUrl);
    // Persist the detected/chosen locale so we don't re-detect on every visit
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
    return response;
  }

  // Refresh Supabase auth session (no-op if env vars missing)
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon|.*\\..*).*)"],
};
