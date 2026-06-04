"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// File a report against a user, listing, or deal. The report is recorded and a
// fraud_flag is raised for the admin queue. The trust penalty (user_report -10)
// is intentionally NOT auto-applied here; an admin applies it on review via the
// trust engine, which prevents coordinated report-bombing of a competitor.
export async function reportTarget(input: {
  targetType: "user" | "listing" | "deal";
  targetId: string;
  reason: string;
  details?: string;
}): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  if (!input.reason?.trim()) return { error: "reason_required" };

  const sb = createClient();
  const { error } = await sb.from("user_reports").insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
  }); // RLS: reporter_id must equal the caller
  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("fraud_flags").insert({
    subject_type: input.targetType, subject_id: input.targetId,
    flag_type: "user_report", severity: "low", detail: input.reason,
  });
  return { ok: true };
}
