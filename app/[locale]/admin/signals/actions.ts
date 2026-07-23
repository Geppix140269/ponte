"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Admin decisions on a Market Signal (Definitive 1 August brief, Block A).
 *
 * Approval is the gate: a signal is public only after an individual admin
 * approves it here, which records who approved it and sets the 90-day public
 * expiry. Every path out says what happened, like the listings and
 * verifications queues, so a refused click and a successful one never look
 * the same on a review screen.
 */

const QUEUE = "/admin/signals";

/** Days a signal stays on the public board after its original signal date. */
const PUBLIC_DAYS = 90;

function finish(result: string, detail?: string): never {
  const params = new URLSearchParams({ r: result });
  if (detail) params.set("m", detail.slice(0, 300));
  redirect(`${QUEUE}?${params.toString()}`);
}

async function requireAdmin(): Promise<{ id: string } | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" ? { id: user.id } : null;
}

/**
 * Approve a signal for public display. Sets status, the approving admin, and
 * the public expiry at spotted_at + 90 days. Idempotent: approving an
 * already-approved signal simply refreshes the same fields.
 */
export async function approveSignalAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) finish("not_admin");

  const id = String(formData.get("id") || "");
  if (!id) finish("no_id");

  const adminSb = createAdminClient();
  const { data: signal } = await adminSb
    .from("desk_radar")
    .select("id, spotted_at, status")
    .eq("id", id)
    .maybeSingle();
  if (!signal) finish("no_signal");

  const spottedMs = Date.parse(signal.spotted_at);
  const now = new Date();
  const expiry = Number.isFinite(spottedMs)
    ? new Date(spottedMs + PUBLIC_DAYS * 86400000)
    : new Date(now.getTime() + PUBLIC_DAYS * 86400000);

  const { error } = await adminSb
    .from("desk_radar")
    .update({
      status: "approved_signal",
      approved_by: admin.id,
      approved_at: now.toISOString(),
      published_at: now.toISOString(),
      public_expires_at: expiry.toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[ponte] signal approval failed:", error);
    finish("db_error", error.message);
  }

  revalidatePath(QUEUE);
  revalidatePath("/market-signals");
  // A signal approved from stale can be born past its public expiry. Say so, so
  // the reviewer is not surprised it never appears on the board.
  const expired = expiry.getTime() <= now.getTime();
  finish("approved", expired ? "past_expiry" : undefined);
}

/**
 * Move a signal to a non-public status: 'private' (unpublish), 'unavailable'
 * (learned it is not current), or 'withdrawn' (removed for source, legal or
 * quality reason). None of these is public, so the board drops it at once.
 */
export async function setSignalStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) finish("not_admin");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id) finish("no_id");
  if (!["private", "unavailable", "withdrawn"].includes(status)) {
    finish("no_status", status);
  }

  const adminSb = createAdminClient();
  const { data: signal } = await adminSb
    .from("desk_radar")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!signal) finish("no_signal");

  const { error } = await adminSb
    .from("desk_radar")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("[ponte] signal status change failed:", error);
    finish("db_error", error.message);
  }

  revalidatePath(QUEUE);
  revalidatePath("/market-signals");
  finish(status);
}
