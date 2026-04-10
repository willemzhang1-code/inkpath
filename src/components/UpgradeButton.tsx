"use client";

import { useState } from "react";

interface UpgradeButtonProps {
  tier: "plus" | "max";
  lang: string;
  label: string;
  variant?: "primary" | "secondary";
}

export default function UpgradeButton({
  tier,
  lang,
  label,
  variant = "primary",
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const className =
    variant === "primary"
      ? "mt-8 block w-full rounded-xl bg-accent py-3 text-center text-sm font-medium text-white shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/30 disabled:opacity-60"
      : "mt-8 block w-full rounded-xl border border-border py-3 text-center text-sm font-medium transition-all duration-300 hover:border-accent/30 hover:bg-surface-hover disabled:opacity-60";

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, lang }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        // Not signed in → send to login, then bounce back to landing
        if (res.status === 401) {
          window.location.href = `/${lang}/auth/login?next=/${lang}%23pricing`;
          return;
        }
        throw new Error(data.error ?? "Checkout failed.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "..." : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
