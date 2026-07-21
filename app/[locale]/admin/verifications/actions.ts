"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendVerificationDecision } from "@/lib/email";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import { companyAgePoints, setComponent } from "@/lib/verification/trust-score";

/**
 * Admin decisions on a verification case.
 *
 * Every action in this file is a HUMAN decision. There is no automatic
 * approval and no automatic rejection here, and none may ever be added: the
 * pipeline can route a case to review, it can never close one.
 */

type Admin = { id: string } | null;

async function requireAdmin(): Promise<Admin> {
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

type CaseRow = {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  subject_name: string;
  level_requested: number;
  status: string;
  registry: { incorporationDate?: string } | null;
};

async function loadCase(id: string): Promise<CaseRow | null> {
  const adminSb = createAdminClient();
  const { data } = await adminSb
    .from("verifications")
    .select(
      "id, user_id, guest_email, subject_name, level_requested, status, registry",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as CaseRow) ?? null;
}

/**
 * The address to write to. A member's address comes from auth, a guest gave
 * one at checkout. Returns null when neither can be resolved, which is worth
 * logging: a decision the member never hears about is not a decision.
 */
async function recipientFor(row: CaseRow): Promise<string | null> {
  if (row.user_id) {
    const adminSb = createAdminClient();
    const { data } = await adminSb.auth.admin.getUserById(row.user_id);
    if (data?.user?.email) return data.user.email;
  }
  return row.guest_email ?? null;
}

/**
 * Send the decision email and WAIT for it.
 *
 * Awaited deliberately. A promise left running after a server action returns
 * is cancelled with the serverless invocation, which is how sends get quietly
 * lost. A failure is logged, never swallowed silently, and never allowed to
 * roll back a decision that is already written.
 */
async function notify(
  row: CaseRow,
  decision: "verified" | "rejected" | "documents",
  note: string,
): Promise<void> {
  const to = await recipientFor(row);
  if (!to) {
    console.error(
      `[ponte] verification ${row.id} decided but no recipient address could be resolved`,
    );
    return;
  }
  try {
    await sendVerificationDecision(to, {
      decision,
      subjectName: row.subject_name,
      note: note || undefined,
      disclaimer: VERIFICATION_DISCLAIMER,
    });
  } catch (err) {
    console.error("[ponte] verification decision email failed:", err);
  }
}

/**
 * Grant the level a human just confirmed.
 *
 * Components are awarded here rather than in the pipeline because this is the
 * point at which a person accepted the evidence. The level on the profile only
 * ever goes up: a later, lower level check must not demote a member.
 */
async function grantLevel(row: CaseRow): Promise<void> {
  if (!row.user_id) return;
  const adminSb = createAdminClient();

  if (row.level_requested >= 3) {
    await setComponent(row.user_id, "activity_docs", 25);
  } else {
    await setComponent(row.user_id, "business", 25);
    await setComponent(row.user_id, "sanctions_clean", 20);
    const agePoints = companyAgePoints(row.registry?.incorporationDate);
    if (agePoints > 0) await setComponent(row.user_id, "company_age", agePoints);
  }

  const { data: profile } = await adminSb
    .from("profiles")
    .select("verification_level")
    .eq("id", row.user_id)
    .maybeSingle();
  const current = Number(profile?.verification_level ?? 0);
  const next = Math.max(current, row.level_requested);
  await adminSb
    .from("profiles")
    .update({ verification_level: next, verified_at: new Date().toISOString() })
    .eq("id", row.user_id);
}

/** Approve. Always a human decision. */
export async function approveVerificationAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 1500);
  if (!id) return;

  const row = await loadCase(id);
  if (!row) return;

  const adminSb = createAdminClient();
  const { error } = await adminSb
    .from("verifications")
    .update({
      status: "verified",
      reviewed_by: admin.id,
      decided_at: new Date().toISOString(),
      verdict_reason: note || "approved by the desk after review of the sources",
    })
    .eq("id", id);
  if (error) {
    console.error("[ponte] verification approve failed:", error.message);
    return;
  }

  await grantLevel(row);
  await notify(row, "verified", note);

  revalidatePath("/admin/verifications");
}

/** Reject. Always a human decision. */
export async function rejectVerificationAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 1500);
  if (!id) return;

  const row = await loadCase(id);
  if (!row) return;

  const adminSb = createAdminClient();
  const { error } = await adminSb
    .from("verifications")
    .update({
      status: "rejected",
      reviewed_by: admin.id,
      decided_at: new Date().toISOString(),
      verdict_reason: note || "not confirmed by the desk after review of the sources",
    })
    .eq("id", id);
  if (error) {
    console.error("[ponte] verification reject failed:", error.message);
    return;
  }

  // No trust components and no level. A rejection grants nothing.
  await notify(row, "rejected", note);

  revalidatePath("/admin/verifications");
}

/**
 * Ask the member for more documents.
 *
 * The case stays in `review`, because it is not decided: it is waiting on the
 * member. `decided_at` is written as null for the same reason, so the queue
 * keeps showing the case as open work.
 */
export async function requestDocumentsAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 1500);
  if (!id) return;

  const row = await loadCase(id);
  if (!row) return;

  const adminSb = createAdminClient();
  const { error } = await adminSb
    .from("verifications")
    .update({
      status: "review",
      reviewed_by: admin.id,
      decided_at: null,
      verdict_reason: note
        ? `documents requested: ${note}`
        : "documents requested by the desk",
    })
    .eq("id", id);
  if (error) {
    console.error("[ponte] verification document request failed:", error.message);
    return;
  }

  await notify(row, "documents", note);

  revalidatePath("/admin/verifications");
}
