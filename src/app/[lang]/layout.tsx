import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { getDictionary, type Locale, locales } from "@/lib/dictionaries";
import { Navigation } from "@/components/Navigation";

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

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navigation lang={lang as Locale} dict={dict} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
