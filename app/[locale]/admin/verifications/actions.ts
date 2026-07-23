"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendVerificationDecision } from "@/lib/email";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import { companyAgePoints, setComponent } from "@/lib/verification/trust-score";
import { grantsMemberStatus } from "@/lib/verification/purpose";

/**
 * Admin decisions on a verification case.
 *
 * Every action in this file is a HUMAN decision. There is no automatic
 * approval and no automatic rejection here, and none may ever be added: the
 * pipeline can route a case to review, it can never close one.
 *
 * EVERY PATH OUT OF THIS FILE SAYS WHAT HAPPENED.
 *
 * These actions used to end every failure with a bare `return`. A click that
 * was refused looked exactly like a click that worked: the page came back
 * unchanged and the reviewer had to go and read the row to find out which. That
 * is not a small thing on a screen whose only job is deciding cases, so each
 * action now finishes at `finish()`, which puts the outcome in the URL and the
 * page renders it. A refusal is now something you can see and quote.
 */

/** Where the desk lands after a decision, with the outcome in the query. */
const QUEUE = "/admin/verifications";

/**
 * End the action by sending the reviewer back to the queue with a result.
 *
 * `redirect` throws by design, so nothing after a call to this runs. It is
 * always the last statement on its path.
 *
 * The path is deliberately unprefixed: the admin area is written in English
 * only, and the locale middleware sends a bare /admin to the reader's own
 * prefix anyway.
 */
function finish(result: string, detail?: string): never {
  const params = new URLSearchParams({ r: result });
  if (detail) params.set("m", detail.slice(0, 300));
  redirect(`${QUEUE}?${params.toString()}`);
}

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
  purpose: string | null;
};

async function loadCase(id: string): Promise<CaseRow | null> {
  const adminSb = createAdminClient();
  const { data } = await adminSb
    .from("verifications")
    .select(
      "id, user_id, guest_email, subject_name, level_requested, status, registry, purpose",
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
 *
 * Returns what to tell the reviewer. The decision stands either way, but a
 * reviewer who thinks the member was told and was not will wait for a reply
 * that is never coming.
 */
async function notify(
  row: CaseRow,
  decision: "verified" | "rejected" | "documents",
  note: string,
): Promise<"sent" | "no_address" | "send_failed"> {
  const to = await recipientFor(row);
  if (!to) {
    console.error(
      `[ponte] verification ${row.id} decided but no recipient address could be resolved`,
    );
    return "no_address";
  }
  try {
    await sendVerificationDecision(to, {
      decision,
      subjectName: row.subject_name,
      note: note || undefined,
      disclaimer: VERIFICATION_DISCLAIMER,
    });
    return "sent";
  } catch (err) {
    console.error("[ponte] verification decision email failed:", err);
    return "send_failed";
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
  // A human confirming a COUNTERPARTY check records that case result, but must
  // not move the requester's own account (brief §3.2). Only a member-business
  // verification grants the level, the trust components and the badge. A legacy
  // case with a null purpose is treated as a counterparty check and grants
  // nothing, which is the safe default.
  if (!grantsMemberStatus(row.purpose)) return;
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
    .update({
      verification_level: next,
      verified_at: new Date().toISOString(),
      // Bind the badge to the member-business verification it rests on (§3.3).
      business_verification_id: row.id,
    })
    .eq("id", row.user_id);
}

/**
 * The three actions share every step except the status they write, the trust
 * they grant and the email they send, so they share one body. Keeping them as
 * three exported actions matters for the form wiring; keeping one code path
 * matters so an approval and a rejection can never drift into behaving
 * differently under failure.
 */
type Decision = "verified" | "rejected" | "documents";

async function decide(formData: FormData, decision: Decision): Promise<never> {
  const admin = await requireAdmin();
  if (!admin) finish("not_admin");

  const id = String(formData.get("id") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 1500);
  if (!id) finish("no_id");

  const row = await loadCase(id);
  if (!row) finish("no_case");

  // Only an open case can be decided. Without this, a second click on a
  // stale page silently re-decides a closed case and re-sends its email.
  if (row.status !== "review") finish("not_open", row.status);

  const status = decision === "documents" ? "review" : decision;
  const fallbackReason: Record<Decision, string> = {
    verified: "approved by the desk after review of the sources",
    rejected: "not confirmed by the desk after review of the sources",
    documents: "documents requested by the desk",
  };

  const adminSb = createAdminClient();
  const { error } = await adminSb
    .from("verifications")
    .update({
      status,
      reviewed_by: admin.id,
      // A document request is not a decision. It is waiting on the member, so
      // the queue must keep showing it as open work.
      decided_at: decision === "documents" ? null : new Date().toISOString(),
      verdict_reason:
        decision === "documents" && note
          ? `documents requested: ${note}`
          : note || fallbackReason[decision],
    })
    .eq("id", id);

  if (error) {
    console.error(`[ponte] verification ${decision} failed:`, error.message);
    finish("db_error", error.message);
  }

  // Trust and level only on an approval. A rejection grants nothing, and a
  // document request has decided nothing yet.
  if (decision === "verified") await grantLevel(row);

  const mail = await notify(row, decision, note);

  revalidatePath(QUEUE);
  finish(decision, mail === "sent" ? undefined : mail);
}

/** Approve. Always a human decision. */
export async function approveVerificationAction(formData: FormData): Promise<void> {
  await decide(formData, "verified");
}

/** Reject. Always a human decision. */
export async function rejectVerificationAction(formData: FormData): Promise<void> {
  await decide(formData, "rejected");
}

/** Ask the member for more documents. The case stays open. */
export async function requestDocumentsAction(formData: FormData): Promise<void> {
  await decide(formData, "documents");
}
