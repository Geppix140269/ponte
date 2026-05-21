import { NextResponse } from "next/server";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { itemId: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/account", request.url));
  }

  // RLS ensures the user can only read their own order items.
  const supabase = createClient();
  const { data: item } = await supabase
    .from("order_items")
    .select("id, report_path, delivery_status, download_count, max_downloads")
    .eq("id", params.itemId)
    .maybeSingle();

  if (!item || !item.report_path || item.delivery_status !== "delivered") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  if ((item.download_count ?? 0) >= (item.max_downloads ?? 5)) {
    return NextResponse.json(
      { error: "download_limit_reached" },
      { status: 403 },
    );
  }

  const signed = await createSignedUrl(item.report_path, 300);
  if (!signed) {
    return NextResponse.json({ error: "signing_failed" }, { status: 500 });
  }

  // Increment the counter with the privileged client (RLS would block updates).
  const admin = createAdminClient();
  await admin
    .from("order_items")
    .update({ download_count: (item.download_count ?? 0) + 1 })
    .eq("id", item.id);

  return NextResponse.redirect(signed);
}
