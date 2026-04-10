import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, getPriceIdForTier } from "@/lib/stripe";

interface CheckoutBody {
  tier: "plus" | "max";
  lang?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
    }

    const body = (await request.json()) as CheckoutBody;
    const { tier, lang = "en" } = body;

    if (tier !== "plus" && tier !== "max") {
      return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
    }

    const priceId = getPriceIdForTier(tier);
    if (!priceId) {
      return NextResponse.json({ error: `No Stripe price for tier "${tier}".` }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // Look up an existing Stripe customer for this user
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Persist for future checkouts / portal sessions
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/${lang}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/${lang}?checkout=cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id, tier },
      },
      metadata: { supabase_user_id: user.id, tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
