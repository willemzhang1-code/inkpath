import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { getDictionary, type Locale, locales } from "@/lib/dictionaries";
import { Navigation } from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InkPath — Write Your Way to Growth",
  description:
    "Master English writing while discovering yourself. Professional IELTS-grade feedback meets personal growth journaling.",
  keywords: [
    "IELTS writing",
    "English learning",
    "journaling",
    "personal growth",
    "writing feedback",
  ],
};

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  // Fetch user + tier (gracefully handles missing Supabase config)
  let userEmail: string | null = null;
  let userTier: "free" | "plus" | "max" = "free";
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email ?? null;
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", data.user.id)
          .single();
        const t = profile?.tier;
        if (t === "plus" || t === "max") userTier = t;
      }
    }
  } catch {
    // Auth not configured yet — render as logged-out
  }

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navigation
          lang={lang as Locale}
          dict={dict}
          userEmail={userEmail}
          userTier={userTier}
        />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
