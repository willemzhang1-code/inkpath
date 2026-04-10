import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaStatus, TIER_MONTHLY_QUOTA } from "@/lib/quota";

// Returns the current user's monthly quota status.
// Used by the Write page to show "X of Y feedback remaining this month".
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({
        tier: "free",
        limit: TIER_MONTHLY_QUOTA.free,
        used: 0,
        remaining: TIER_MONTHLY_QUOTA.free,
        exceeded: false,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const status = await getQuotaStatus(supabase, user.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("Quota API error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
