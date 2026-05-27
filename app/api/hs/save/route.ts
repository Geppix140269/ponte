import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hs_saved_codes")
    .select("*, hs_codes(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hs_code_id, label, notes } = await req.json();
  if (!hs_code_id || typeof hs_code_id !== "number") {
    return NextResponse.json({ error: "hs_code_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hs_saved_codes")
    .upsert(
      { user_id: user.id, hs_code_id, label: label ?? null, notes: notes ?? null },
      { onConflict: "user_id,hs_code_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hs_code_id } = await req.json();
  if (!hs_code_id) {
    return NextResponse.json({ error: "hs_code_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("hs_saved_codes")
    .delete()
    .eq("user_id", user.id)
    .eq("hs_code_id", hs_code_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
