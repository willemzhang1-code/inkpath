import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const locales = ["en", "zh-CN", "ja", "ko", "vi", "th"];
const defaultLocale = "en";

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") || "";
  const preferred = acceptLanguage.split(",").map((l) => l.split(";")[0].trim());

  for (const lang of preferred) {
    if (locales.includes(lang)) return lang;
    const base = lang.split("-")[0];
    if (base === "zh") return "zh-CN";
    const match = locales.find((l) => l.startsWith(base));
    if (match) return match;
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
    return NextResponse.redirect(request.nextUrl);
  }

  // Refresh Supabase auth session (no-op if env vars missing)
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon|.*\\..*).*)"],
};
