import Stripe from "stripe";

// ============================================================
// Stripe server client
// ============================================================

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
      appInfo: { name: "InkPath", version: "0.1.0" },
    })
  : null;

export const STRIPE_ENABLED = stripe !== null;

// Map our internal tier to Stripe Price IDs (set in .env.local)
export const PRICE_TO_TIER: Record<string, "plus" | "max"> = {
  ...(process.env.STRIPE_PRICE_PLUS
    ? { [process.env.STRIPE_PRICE_PLUS]: "plus" as const }
    : {}),
  ...(process.env.STRIPE_PRICE_MAX
    ? { [process.env.STRIPE_PRICE_MAX]: "max" as const }
    : {}),
};

export function getPriceIdForTier(tier: "plus" | "max"): string | null {
  if (tier === "plus") return process.env.STRIPE_PRICE_PLUS ?? null;
  if (tier === "max") return process.env.STRIPE_PRICE_MAX ?? null;
  return null;
}
