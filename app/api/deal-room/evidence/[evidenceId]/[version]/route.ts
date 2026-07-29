import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dealRoomGate } from "@/lib/deal-room/queries";

export const dynamic = "force-dynamic";

/**
 * Serving one evidence file.
 *
 * ## Belt and braces, and both are load-bearing
 *
 * **The database policy.** `storage.objects` has a SELECT policy for this
 * bucket that joins the object name to `deal_room_evidence_versions.storage_path`
 * and asks `deal_room_can_read_evidence()`. Anyone who reached the bucket
 * directly would be refused there.
 *
 * **This route.** It re-reads the version row through the CALLER'S OWN session
 * client, so RLS answers the permission question a second time and
 * independently. Only if that read returns a row does it sign a URL - and the
 * signing itself needs the service role, because a signed URL is a bearer
 * credential the caller could not mint for themselves.
 *
 * The order matters and is the whole design: the privileged client is used only
 * AFTER the unprivileged one has already proved the caller may see this file.
 * Reversing that would be a route that signs anything it is asked to.
 *
 * The URL is short-lived and single-purpose. Bytes are never proxied through a
 * public bucket and never embedded in an email.
 */
export async function GET(
  _request: Request,
  { params }: { params: { evidenceId: string; version: string } },
) {
  const gate = await dealRoomGate();
  if (!gate) {
    // Same answer as a file that does not exist. A different one would confirm
    // that this evidence id is real.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const version = Number.parseInt(params.version, 10);
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The permission check: the caller's own session, so RLS decides.
  const supabase = createClient();
  const { data: row } = await supabase
    .from("deal_room_evidence_versions")
    .select("storage_path, file_name")
    .eq("evidence_id", params.evidenceId)
    .eq("version", version)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only now, and only to mint the credential.
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("deal-room-evidence")
    .createSignedUrl(row.storage_path as string, 60, { download: row.file_name as string });

  if (error || !signed) {
    return NextResponse.json({ error: "The file could not be opened. Nothing has changed." }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: {
      // A signed URL is a credential; it must not be cached by anything.
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
