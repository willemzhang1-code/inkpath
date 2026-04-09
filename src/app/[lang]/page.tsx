import { getDictionary, type Locale, locales, localeNames } from "@/lib/dictionaries";
import Link from "next/link";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const t = dict.landing;

  return (
    <div className="relative overflow-hidden">
      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="relative min-h-[92vh] flex items-center gradient-mesh">
        {/* Floating decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-[12%] left-[8%] h-72 w-72 rounded-full bg-accent/[0.06] blur-3xl" />
          <div className="absolute bottom-[18%] right-[10%] h-96 w-96 rounded-full bg-info/[0.05] blur-3xl" />
          <div className="absolute top-[45%] left-[55%] h-48 w-48 rounded-full bg-warning/[0.04] blur-3xl" />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />

          {/* Floating ink dots */}
          <div className="absolute top-[20%] right-[20%] h-2 w-2 rounded-full bg-accent/30 animate-pulse-soft" />
          <div className="absolute top-[60%] left-[15%] h-1.5 w-1.5 rounded-full bg-accent/20 animate-pulse-soft" style={{ animationDelay: "0.7s" }} />
          <div className="absolute bottom-[30%] right-[35%] h-1 w-1 rounded-full bg-accent/25 animate-pulse-soft" style={{ animationDelay: "1.4s" }} />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40 text-center">
          {/* Badge */}
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {t.badge}
          </div>

          {/* Headline */}
          <h1 className="animate-slide-up font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {t.headline}{" "}
            <span className="band-score">{t.headlineHighlight}</span>
          </h1>

          {/* Subheadline */}
          <p
            className="animate-slide-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
            style={{ animationDelay: "0.15s" }}
          >
            {t.subheadline}
          </p>

          {/* CTA Buttons */}
          <div
            className="animate-slide-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href={`/${lang}/write`}
              className="group inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-accent/20 transition-all duration-300 hover:bg-accent-dark hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
            >
              {t.cta}
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-8 py-3.5 text-base font-medium text-foreground transition-all duration-300 hover:bg-surface-hover hover:border-accent/30 hover:-translate-y-0.5"
            >
              {t.ctaSecondary}
            </a>
          </div>

          {/* Trust line */}
          <p
            className="animate-fade-in mt-14 text-sm text-muted"
            style={{ animationDelay: "0.5s" }}
          >
            {t.trusted}{" "}
            <span className="font-medium text-foreground">{t.countries}</span>
          </p>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ============================================================
          FEATURES GRID
          ============================================================ */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Feature 1 — Professional Feedback */}
            <div className="group rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/[0.04] hover:-translate-y-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-accent">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{t.feature1Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.feature1Desc}</p>
            </div>

            {/* Feature 2 — Personal Growth */}
            <div className="group rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/[0.04] hover:-translate-y-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-accent">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{t.feature2Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.feature2Desc}</p>
            </div>

            {/* Feature 3 — Smart Vocabulary */}
            <div className="group rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/[0.04] hover:-translate-y-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-accent">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{t.feature3Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.feature3Desc}</p>
            </div>

            {/* Feature 4 — Privacy First */}
            <div className="group rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/[0.04] hover:-translate-y-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-accent">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{t.feature4Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.feature4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section id="how-it-works" className="relative py-24 sm:py-32 gradient-mesh">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.howItWorks}
          </h2>

          <div className="relative mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {/* Connecting line (desktop) */}
            <div className="pointer-events-none absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] hidden h-px bg-gradient-to-r from-accent/40 via-accent/20 to-accent/40 sm:block" aria-hidden="true" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent bg-surface text-xl font-bold text-accent shadow-sm">
                1
              </div>
              <h3 className="text-lg font-semibold">{t.step1Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.step1Desc}</p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent bg-surface text-xl font-bold text-accent shadow-sm">
                2
              </div>
              <h3 className="text-lg font-semibold">{t.step2Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.step2Desc}</p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent bg-surface text-xl font-bold text-accent shadow-sm">
                3
              </div>
              <h3 className="text-lg font-semibold">{t.step3Title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRIVACY SECTION
          ============================================================ */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Text side */}
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.privacyTitle}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {t.privacyDesc}
              </p>

              <ul className="mt-8 space-y-4">
                {[t.privacyBullet1, t.privacyBullet2, t.privacyBullet3, t.privacyBullet4].map(
                  (bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                      <span className="text-base leading-relaxed">{bullet}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Visual side — shield illustration */}
            <div className="flex items-center justify-center" aria-hidden="true">
              <div className="relative">
                {/* Outer glow */}
                <div className="absolute -inset-8 rounded-full bg-accent/[0.06] blur-2xl" />

                {/* Shield container */}
                <div className="glass relative flex h-64 w-64 items-center justify-center rounded-3xl border border-border shadow-xl sm:h-80 sm:w-80">
                  {/* Concentric rings */}
                  <div className="absolute h-48 w-48 rounded-full border border-accent/10 sm:h-60 sm:w-60" />
                  <div className="absolute h-32 w-32 rounded-full border border-accent/15 sm:h-40 sm:w-40" />

                  {/* Shield icon */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 sm:h-24 sm:w-24">
                    <svg className="h-10 w-10 text-accent sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>

                  {/* Floating dots */}
                  <div className="absolute top-6 right-8 h-2 w-2 rounded-full bg-accent/30 animate-pulse-soft" />
                  <div className="absolute bottom-8 left-6 h-1.5 w-1.5 rounded-full bg-accent/25 animate-pulse-soft" style={{ animationDelay: "1s" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING SECTION
          ============================================================ */}
      <section className="relative py-24 sm:py-32 gradient-mesh">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.pricingTitle}
          </h2>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {/* Free Tier */}
            <div className="rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-lg font-semibold">{t.free}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{t.freePrice}</span>
                <span className="text-muted">/{t.freePeriod}</span>
              </div>

              <ul className="mt-8 space-y-3.5">
                {[t.freeFeature1, t.freeFeature2, t.freeFeature3].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={`/${lang}/write`}
                className="mt-8 block w-full rounded-xl border border-border py-3 text-center text-sm font-medium transition-all duration-300 hover:border-accent/30 hover:bg-surface-hover"
              >
                {t.cta}
              </Link>
            </div>

            {/* Plus Tier — Most Popular */}
            <div className="relative rounded-2xl border-2 border-accent bg-surface p-8 shadow-xl shadow-accent/[0.08] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/[0.12]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                {t.mostPopular}
              </div>

              <h3 className="text-lg font-semibold">{t.plus}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight band-score">{t.plusPrice}</span>
                <span className="text-muted">{t.plusPeriod}</span>
              </div>

              <ul className="mt-8 space-y-3.5">
                {[t.plusFeature1, t.plusFeature2, t.plusFeature3, t.plusFeature4, t.plusFeature5].map(
                  (f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  )
                )}
              </ul>

              <Link
                href={`/${lang}/write`}
                className="mt-8 block w-full rounded-xl bg-accent py-3 text-center text-sm font-medium text-white shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/30"
              >
                {t.cta}
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-lg font-semibold">{t.pro}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{t.proPrice}</span>
                <span className="text-muted">{t.proPeriod}</span>
              </div>

              <ul className="mt-8 space-y-3.5">
                {[t.proFeature1, t.proFeature2, t.proFeature3, t.proFeature4, t.proFeature5, t.proFeature6].map(
                  (f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  )
                )}
              </ul>

              <Link
                href={`/${lang}/write`}
                className="mt-8 block w-full rounded-xl border border-border py-3 text-center text-sm font-medium transition-all duration-300 hover:border-accent/30 hover:bg-surface-hover"
              >
                {t.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            {/* Logo & copyright */}
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight">
                Ink<span className="text-accent">Path</span>
              </span>
              <span className="text-sm text-muted">&copy; {new Date().getFullYear()}</span>
            </div>

            {/* Language links */}
            <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="Language selection">
              {locales.map((locale) => (
                <Link
                  key={locale}
                  href={`/${locale}`}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                    locale === lang
                      ? "bg-accent-light font-medium text-accent"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {localeNames[locale]}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
