import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return;
  }

  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon|.*\\..*).*)"],
};
