import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens the Stripe billing portal so the user can manage / cancel their plan.
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sb = createAdminClient();
  const { data } = await sb.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  const customerId = data?.stripe_customer_id;
  if (!customerId) return NextResponse.json({ error: "no_customer" }, { status: 404 });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe billing portal error:", err);
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
