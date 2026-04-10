import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const dict = await getDictionary(lang as Locale);

  const isZh = lang === "zh-CN";
  const isJa = lang === "ja";

  const t = {
    title: isZh ? "登录" : isJa ? "ログイン" : "Welcome back",
    subtitle: isZh ? "继续你的写作旅程" : isJa ? "ライティングの旅を続けよう" : "Continue your writing journey",
    email: isZh ? "邮箱" : isJa ? "メールアドレス" : "Email",
    password: isZh ? "密码" : isJa ? "パスワード" : "Password",
    submit: isZh ? "登录" : isJa ? "ログイン" : "Sign in",
    or: isZh ? "或" : isJa ? "または" : "or",
    google: isZh ? "用 Google 登录" : isJa ? "Googleでログイン" : "Continue with Google",
    noAccount: isZh ? "还没有账号？" : isJa ? "アカウントをお持ちでない方は" : "Don't have an account?",
    signUp: isZh ? "注册" : isJa ? "新規登録" : "Sign up",
    backHome: isZh ? "返回首页" : isJa ? "ホームに戻る" : "Back home",
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 gradient-mesh">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href={`/${lang}`} className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight group-hover:text-accent transition-colors">
            InkPath
          </span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-center">{t.title}</h1>
          <p className="text-sm text-muted text-center mt-2">{t.subtitle}</p>

          {sp.error && (
            <div className="mt-6 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {sp.error === "auth_error" ? "Authentication failed. Please try again." : sp.error}
            </div>
          )}

          <form action={signIn} className="mt-8 space-y-4">
            <input type="hidden" name="lang" value={lang} />

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted mb-1.5">
                {t.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted mb-1.5">
                {t.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 px-4 py-3 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-all shadow-sm"
            >
              {t.submit}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t.noAccount}{" "}
            <Link href={`/${lang}/auth/signup`} className="text-accent font-medium hover:underline">
              {t.signUp}
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href={`/${lang}`} className="text-xs text-muted hover:text-foreground transition-colors">
            ← {t.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
