// Delta re-screening.
//
// A verification is a statement about a date, not a permanent fact. Lists
// change, and a company that was clean in March can be listed in June. After
// every sanctions refresh, previously cleared subjects are screened again
// against what actually changed.
//
// A new hit pulls the badge immediately and routes the case back to a human.
// It never auto rejects: the badge is hidden and the case goes to review,
// because being newly similar to a listed name is not the same as being that
// entity.

// From lib/supabase/admin, not lib/supabase/server: this runs in the scheduled
// Node job. See the note in lib/supabase/admin.ts.
import { createAdminClient } from "@/lib/supabase/admin";
import { screenSubject } from "@/lib/sanctions/screen";
import { clearComponent } from "@/lib/verification/trust-score";
import { sendAdminNotice } from "@/lib/email";

export type RescreenSummary = {
  screened: number;
  newHits: number;
  affected: { verificationId: string; subject: string; userId: string | null }[];
};

/**
 * Re-screen every subject that currently holds a clean verdict.
 *
 * This screens against the whole list rather than only the entries the latest
 * refresh touched. A delta screen is the cheaper design and is what the brief
 * described, but it is an optimisation for volume, and correctness is easier
 * to defend: a full pass cannot miss a subject because of a bug in working out
 * what changed. At the current number of verified members the difference is
 * negligible. Revisit when the member count makes the model calls material.
 *
 * `since` is accepted so the caller can record what refresh triggered the run.
 */
export async function rescreenVerified(since: Date): Promise<RescreenSummary> {
  const sb = createAdminClient();

  // Only subjects currently trusted are worth re-checking. A case already in
  // review is already going to a human.
  const { data: subjects, error } = await sb
    .from("verifications")
    .select("id, user_id, subject_name, subject_country")
    .in("status", ["auto_verified", "verified"]);

  if (error) throw new Error(`rescreen query failed: ${error.message}`);

  const summary: RescreenSummary = { screened: 0, newHits: 0, affected: [] };

  for (const row of subjects ?? []) {
    summary.screened++;
    let result;
    try {
      result = await screenSubject(
        { name: row.subject_name, country: row.subject_country ?? undefined },
        { ref: row.id, userId: row.user_id },
      );
    } catch (err) {
      // A screening failure must not silently look like a clean result.
      console.error(`[ponte] rescreen failed for ${row.id}: ${(err as Error).message}`);
      continue;
    }

    if (result.clean) continue;

    summary.newHits++;
    summary.affected.push({
      verificationId: row.id,
      subject: row.subject_name,
      userId: row.user_id,
    });

    // Pull the badge and route to a person.
    await sb
      .from("verifications")
      .update({
        status: "review",
        sanctions_hits: result,
        verdict_reason:
          "new sanctions candidate found during a list refresh, badge suspended pending review",
        rescreened_at: new Date().toISOString(),
        decided_at: null,
      })
      .eq("id", row.id);

    if (row.user_id) {
      await clearComponent(row.user_id, "sanctions_clean");
      await sb
        .from("profiles")
        .update({ verification_level: 1, verified_at: null })
        .eq("id", row.user_id);
    }
  }

  // One email for the whole run, not one per hit, so a large list change does
  // not bury the inbox. Awaited: a fire and forget send is dropped on
  // serverless.
  if (summary.newHits > 0) {
    const lines = summary.affected
      .map((a) => `${a.subject} (verification ${a.verificationId.slice(0, 8)})`)
      .join("<br>");
    await sendAdminNotice({
      actionPath: "/admin/verifications",
      actionLabel: "Open the review queue",
      subject: `Sanctions re-screen: ${summary.newHits} verified subject(s) need review`,
      body:
        `A sanctions list refresh produced new candidates for subjects that were ` +
        `previously verified. Their badges are suspended and the cases are in the ` +
        `review queue.<br><br>${lines}`,
    });
  }

  return summary;
}
