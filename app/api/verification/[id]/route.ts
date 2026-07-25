import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReceipt } from "@/lib/check/receipt";
import type { VerificationCase } from "@/lib/verification/decision-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The K07 evidence receipt for one verification the member owns.
 *
 * The POST outcome carries only { id, status, reason }, which is not enough for
 * a dated, source-named receipt. This loads the case detail and shapes it
 * through lib/check/receipt (no score, no badge).
 *
 * Authorisation mirrors the resume route: the row is loaded by id AND by the
 * member's user_id, so a case belonging to somebody else returns the same 404
 * as a missing one.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const id = (params.id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("verifications")
    .select(
      "subject_name, subject_country, subject_reg_number, subject_vat, subject_lei, registry, vies, gleif, sanctions_hits, verdict_reason, status",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const receipt = buildReceipt(data as unknown as VerificationCase);
  return NextResponse.json({ ok: true, status: data.status, receipt });
}
