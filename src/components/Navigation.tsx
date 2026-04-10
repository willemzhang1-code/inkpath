"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { type Locale, localeNames } from "@/lib/dictionaries";
import { signOut } from "@/app/auth/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface NavigationProps {
  lang: Locale;
  dict: { nav: Record<string, string>; [key: string]: any };
  userEmail?: string | null;
  userTier?: "free" | "plus" | "max";
}

export function Navigation({
  lang,
  dict,
  userEmail,
  userTier = "free",
}: NavigationProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { href: `/${lang}/write`, label: dict.nav.write, icon: "edit" },
    { href: `/${lang}/entries`, label: dict.nav.entries ?? "Entries", icon: "journal" },
    { href: `/${lang}/dashboard`, label: dict.nav.dashboard, icon: "growth" },
    { href: `/${lang}/vocabulary`, label: dict.nav.vocabulary, icon: "book" },
  ];

  const isActive = (href: string) => pathname === href;
  const isLanding = pathname === `/${lang}` || pathname === `/${lang}/`;

  const icons: Record<string, React.ReactNode> = {
    edit: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
    ),
    growth: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12 2 2" /><path d="M12 2v10h10" />
      </svg>
    ),
    book: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
      </svg>
    ),
    journal: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${isLanding ? "bg-transparent" : "glass border-b border-border"}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight group-hover:text-accent transition-colors">
              InkPath
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {icons[item.icon]}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="hidden sm:inline">{localeNames[lang]}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-border rounded-xl shadow-lg py-1 z-50 animate-fade-in">
                    {(Object.entries(localeNames) as [Locale, string][]).map(
                      ([code, name]) => (
                        <Link
                          key={code}
                          href={pathname.replace(`/${lang}`, `/${code}`)}
                          onClick={() => {
                            // Persist the user's manual choice for 1 year
                            document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
                            setLangOpen(false);
                          }}
                          className={`block px-4 py-2.5 text-sm transition-colors ${
                            code === lang
                              ? "text-accent font-medium bg-accent/5"
                              : "text-foreground hover:bg-surface-hover"
                          }`}
                        >
                          {name}
                        </Link>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu OR CTA */}
            {userEmail ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-hover transition-all"
                >
                  <TierAvatar tier={userTier} initial={userEmail.charAt(0).toUpperCase()} />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-60 bg-surface border border-border rounded-xl shadow-lg py-2 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted">Signed in as</p>
                          <TierPill tier={userTier} />
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">{userEmail}</p>
                      </div>
                      <form action={signOut.bind(null, lang)}>
                        <button
                          type="submit"
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors"
                        >
                          {lang === "zh-CN" ? "退出登录" : lang === "ja" ? "ログアウト" : "Sign out"}
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href={`/${lang}/auth/login`}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-all duration-200 shadow-sm"
              >
                {dict.nav.signIn}
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {mobileOpen ? (
                  <>
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </>
                ) : (
                  <>
                    <path d="M4 8h16" />
                    <path d="M4 16h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {icons[item.icon]}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Tier Avatar — shows a gradient border + crown for paid users (Option C)
// ---------------------------------------------------------------------------

function TierAvatar({
  tier,
  initial,
}: {
  tier: "free" | "plus" | "max";
  initial: string;
}) {
  if (tier === "free") {
    return (
      <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-medium">
        {initial}
      </div>
    );
  }

  const gradient =
    tier === "max"
      ? "from-amber-400 via-yellow-500 to-orange-500"
      : "from-violet-500 via-fuchsia-500 to-purple-600";
  const crownColor = tier === "max" ? "#f59e0b" : "#a855f7";

  return (
    <div className="relative">
      {/* Gradient ring */}
      <div
        className={`p-[2px] rounded-full bg-gradient-to-br ${gradient}`}
      >
        <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-medium border-2 border-surface">
          {initial}
        </div>
      </div>
      {/* Crown badge */}
      <div
        className="absolute -top-1.5 -right-1 rounded-full bg-surface p-[1px] shadow-sm"
        aria-label={`${tier} member`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={crownColor}
          stroke={crownColor}
          strokeWidth="1"
          strokeLinejoin="round"
        >
          <path d="M2 20h20l-2-11-5 4-3-6-3 6-5-4-2 11z" />
        </svg>
      </div>
    </div>
  );
}

function TierPill({ tier }: { tier: "free" | "plus" | "max" }) {
  if (tier === "free") {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-hover text-muted">
        Free
      </span>
    );
  }
  const label = tier === "max" ? "Max" : "Plus";
  const cls =
    tier === "max"
      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
      : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${cls}`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 20h20l-2-11-5 4-3-6-3 6-5-4-2 11z" />
      </svg>
      {label}
    </span>
  );
}
