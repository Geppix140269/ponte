import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The minimum the signed-in member's own surfaces need to resume a pending
 * action: their display name and business, read from their own profile under
 * RLS. Nothing sensitive; used by the Find introduction flow to fill
 * `interested_business` after the account gate, so the member is not asked to
 * retype what the gate already collected. Returns signedIn:false when anonymous.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ signedIn: false });

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    signedIn: true,
    name: profile?.full_name ?? "",
    business: profile?.company ?? "",
  });
}
