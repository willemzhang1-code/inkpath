import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, PRICE_TO_TIER } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhooks must read the raw body to verify the signature.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature error:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

        if (userId && customerId) {
          await admin
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? PRICE_TO_TIER[priceId] : undefined;

        if (!userId) break;

        const periodEnd = sub.items.data[0]?.current_period_end;

        await admin
          .from("profiles")
          .update({
            tier: tier ?? "free",
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            subscription_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await admin
          .from("profiles")
          .update({
            tier: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("id", userId);
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler failure" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
