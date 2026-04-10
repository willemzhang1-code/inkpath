"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const lang = String(formData.get("lang") ?? "en");

  if (!email || !password) {
    redirect(`/${lang}/auth/login?error=${encodeURIComponent("Email and password are required")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/${lang}/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/${lang}/write`);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const lang = String(formData.get("lang") ?? "en");

  if (!email || !password) {
    redirect(`/${lang}/auth/signup?error=${encodeURIComponent("Email and password are required")}`);
  }
  if (password.length < 8) {
    redirect(`/${lang}/auth/signup?error=${encodeURIComponent("Password must be at least 8 characters")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/${lang}/write`,
    },
  });

  if (error) {
    redirect(`/${lang}/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${lang}/auth/verify`);
}

export async function signOut(lang: string = "en") {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(`/${lang}`);
}
