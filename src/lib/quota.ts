import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserTier } from "@/lib/supabase/types";

// ============================================================
// Monthly quota per tier
// ============================================================

export const TIER_MONTHLY_QUOTA: Record<UserTier, number> = {
  free: 7,
  plus: 60,
  max: 300,
};

export interface QuotaStatus {
  tier: UserTier;
  limit: number;
  used: number;
  remaining: number;
  exceeded: boolean;
}

/**
 * Look up how many feedback requests the user has used this calendar month
 * and compare against their tier's quota. Uses the `monthly_usage` view.
 */
export async function getQuotaStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<QuotaStatus> {
  // Fetch tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single();

  const tier: UserTier = (profile?.tier as UserTier) ?? "free";
  const limit = TIER_MONTHLY_QUOTA[tier];

  // Fetch used count
  const { data: usage } = await supabase
    .from("monthly_usage")
    .select("entries_this_month")
    .eq("user_id", userId)
    .maybeSingle();

  const used = (usage?.entries_this_month as number | undefined) ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    tier,
    limit,
    used,
    remaining,
    exceeded: used >= limit,
  };
}
