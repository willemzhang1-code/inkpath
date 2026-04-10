import Link from "next/link";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const isZh = lang === "zh-CN";
  const isJa = lang === "ja";

  const t = {
    title: isZh ? "查收你的邮箱" : isJa ? "メールをご確認ください" : "Check your email",
    subtitle: isZh
      ? "我们已发送验证链接到你的邮箱。点击链接完成注册。"
      : isJa
      ? "確認リンクをメールで送信しました。リンクをクリックして登録を完了してください。"
      : "We've sent a verification link to your email. Click the link to complete signup.",
    backLogin: isZh ? "返回登录" : isJa ? "ログインに戻る" : "Back to login",
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 gradient-mesh">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-6">{t.title}</h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">{t.subtitle}</p>

          <Link
            href={`/${lang}/auth/login`}
            className="inline-block mt-8 text-sm text-accent font-medium hover:underline"
          >
            ← {t.backLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
