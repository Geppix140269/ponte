import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codeClean = decodeURIComponent(params.code)
    .trim()
    .replace(/[^0-9]/g, "");
  const schedule = req.nextUrl.searchParams.get("schedule") || null;

  if (!codeClean || codeClean.length < 2) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("hs_codes")
    .select("*")
    .eq("code_clean", codeClean)
    .eq("is_active", true);

  if (schedule) query = query.eq("schedule", schedule);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  const heading = codeClean.slice(0, 4);
  const { data: siblings } = await supabase
    .from("hs_codes")
    .select("id,code,description,schedule,level")
    .eq("heading", heading)
    .eq("is_active", true)
    .neq("code_clean", codeClean)
    .limit(10);

  return NextResponse.json({
    code: data[0],
    all_schedules: data,
    siblings: siblings ?? [],
  });
}
