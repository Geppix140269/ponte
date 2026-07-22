// Level 2 business verification: the orchestration.
//
// Order matters and is deliberate:
//   1. spend credits, so the work is paid for before it is done
//   2. pull the registry
//   3. VAT and LEI where the member gave us one
//   4. screen the company AND every officer against the sanctions lists
//   5. AI reconciles it all into a sourced summary and SUGGESTS a verdict
//   6. code applies the rules and writes the verdict
//
// Two rules that are enforced here rather than in a prompt, because a prompt
// is a request and these are rules:
//   - Only a fully clean case can be auto verified.
//   - Nothing is ever auto rejected. A rejection is always a human decision.
//
// THE PAYMENT BOUNDARY, read this before touching either function below.
//
// Step 1 lives in `runLevel2` and NOWHERE ELSE. Steps 2 to 6 live in
// `runLevel2Checks`, which never touches the ledger. The split exists because
// a name only search can pause a run at `needs_selection`, and the member then
// picks the right company and the checks run again on the same row. That
// resume is the finishing of work already bought, not a second purchase.
//
// So: `runLevel2` is called once per verification, `runLevel2Checks` may be
// called more than once, and it must stay free of spendCredits forever. The
// obvious refactor, having the resume path call `runLevel2` again, would
// charge the member twice for one verification.
//
// No customs or third party trade data is used anywhere. Registry, VAT, LEI
// and published sanctions lists only.

import { createAdminClient } from "@/lib/supabase/server";
import {
  COST_VERIFICATION_L2,
  InsufficientCredits,
  refundSpend,
  spendCredits,
} from "@/lib/credits";
import {
  lookupRegistry,
  officerNames,
  readCandidates,
  sameRegNumber,
} from "@/lib/registry";
import type { RegistryCandidate } from "@/lib/registry";
import { screenSubject } from "@/lib/sanctions/screen";
import { checkVat } from "@/lib/registry/vies";
import { lookupLei } from "@/lib/registry/gleif";
import { reconcile } from "@/lib/verification/reconcile";
import { companyAgePoints, setComponent } from "@/lib/verification/trust-score";

/** Must appear on every result, every certificate, and in the terms. */
export const VERIFICATION_DISCLAIMER =
  "Verification confirms checks against the named public sources on the stated date. " +
  "It is not a credit rating, a guarantee of performance or solvency, or legal due diligence.";

/** What is being checked. The same shape whether it is a first run or a resume. */
export type VerificationSubject = {
  name: string;
  country?: string | null;
  regNumber?: string | null;
  vat?: string | null;
  lei?: string | null;
};

export type VerificationRequest = VerificationSubject & {
  userId?: string | null;
  guestEmail?: string | null;
  /** Set when a guest paid for a single certificate instead of spending credits. */
  guestLedgerId?: string | null;
};

export type VerificationOutcome = {
  id: string;
  status: "auto_verified" | "review" | "failed" | "needs_selection";
  reason: string;
  /** Only on needs_selection: the companies the member has to choose between. */
  candidates?: RegistryCandidate[];
  /** Only on needs_selection: how many the register holds, which may exceed the list. */
  candidateTotal?: number;
};

function declaredMatchesRegistry(
  declared: VerificationSubject,
  registry: { companyName?: string; regNumber?: string; status?: string },
): boolean {
  const norm = (s?: string | null) =>
    (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

  // A registration number is the strong signal. When the member gave one it
  // has to match exactly, ignoring formatting.
  if (declared.regNumber && registry.regNumber) {
    if (norm(declared.regNumber) !== norm(registry.regNumber)) return false;
  }

  // The name is compared loosely, because registries hold the full legal name
  // and members type the trading name. A loose match still has to be a
  // containment, not merely similar.
  const a = norm(declared.name);
  const b = norm(registry.companyName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/**
 * A first Level 2 run: open the case, PAY FOR IT, then run the checks.
 *
 * This is the only function in the codebase that spends a verification credit.
 * Everything after the payment is in `runLevel2Checks`, which can be run again
 * on the same row without charging anything.
 */
export async function runLevel2(
  req: VerificationRequest,
): Promise<VerificationOutcome> {
  const sb = createAdminClient();

  // 1. Create the record first, so an abandoned run is still visible.
  const { data: created, error: createErr } = await sb
    .from("verifications")
    .insert({
      user_id: req.userId ?? null,
      guest_email: req.guestEmail ?? null,
      subject_name: req.name,
      subject_country: req.country ?? null,
      subject_reg_number: req.regNumber ?? null,
      subject_vat: req.vat ?? null,
      subject_lei: req.lei ?? null,
      level_requested: 2,
      status: "pending",
    })
    .select("id")
    .single();

  if (createErr || !created) {
    throw new Error(`could not open verification: ${createErr?.message}`);
  }
  const id: string = created.id;

  // 2. Pay for it. A guest already paid at checkout and carries a ledger id.
  let ledgerId = req.guestLedgerId ?? null;
  if (req.userId) {
    try {
      ledgerId = await spendCredits(
        req.userId,
        COST_VERIFICATION_L2,
        "spend_verification",
        id,
      );
    } catch (err) {
      if (err instanceof InsufficientCredits) {
        await sb
          .from("verifications")
          .update({
            status: "failed",
            verdict_reason: "insufficient credits",
            decided_at: new Date().toISOString(),
          })
          .eq("id", id);
        return { id, status: "failed", reason: "insufficient credits" };
      }
      throw err;
    }
  }
  await sb.from("verifications").update({ credit_ledger_id: ledgerId }).eq("id", id);

  // 3 onwards. The paid for work. Everything below this line can be re-run on
  // this row without charging again, which is what a resume does.
  return runLevel2Checks(id, req, { userId: req.userId ?? null });
}

/**
 * Steps 3 onwards of a Level 2 verification: registry, VAT, LEI, sanctions, AI
 * reconciliation, verdict, trust score.
 *
 * DELIBERATELY FREE OF THE LEDGER. It neither spends nor records a spend, and
 * it never reads or writes `credit_ledger_id`. It is called by `runLevel2`
 * after that function has paid, and by `resumeLevel2WithSelection` after the
 * member has chosen between several same-named companies. The second call is
 * the completion of work the first call already paid for, so adding a
 * spendCredits here would double charge every member who has to disambiguate a
 * common company name.
 *
 * A refund on failure stays here rather than moving up, because the failure it
 * pays back for happens here, and the state guard on the resume path means it
 * can fire at most once per verification.
 */
export async function runLevel2Checks(
  verificationId: string,
  req: VerificationSubject,
  opts: { userId?: string | null } = {},
): Promise<VerificationOutcome> {
  const sb = createAdminClient();
  const id = verificationId;
  const userId = opts.userId ?? null;

  try {
    // 3. Registry.
    const registry = await lookupRegistry({
      country: req.country ?? undefined,
      regNumber: req.regNumber ?? undefined,
      name: req.name,
    });

    // 3a. Several companies carry that name and no registration number was
    //     given, so the subject is not identified yet. The run PAUSES here.
    //
    //     Nothing further is worth doing: screening twenty candidates would
    //     burn twenty model calls to answer a question the member can settle
    //     in one click. The candidate list is stored on the row and the member
    //     is asked which one they meant. When they answer, this same function
    //     runs again on this same row, for free.
    //
    //     Only asked of a signed in member. A guest bought a certificate with
    //     no account behind it, so there is no session that could prove they
    //     own the case and no safe way to let them resume it. Their case keeps
    //     the old behaviour and goes to the desk, where a person can identify
    //     the company from the candidates stored on the row.
    const candidates = registry.candidates ?? [];
    if (userId && !registry.available && candidates.length > 1) {
      const reason =
        registry.reason ??
        `${candidates.length} companies match that name, so the subject is not identified yet`;

      /*
       * THE PAUSE ONLY EXISTS IF THE DATABASE ACCEPTED IT.
       *
       * This write is what makes the pause real: it stores the candidate list
       * and moves the row to 'needs_selection', and the resume route refuses
       * any case not sitting on that status. If it fails and we return the
       * picker anyway, the member gets a list of companies, picks one, and is
       * told the check is no longer waiting. Every time. The screen looks
       * perfect and the button cannot work, which is the worst shape a bug
       * can take, because it looks like the member did something wrong.
       *
       * That is not hypothetical. It shipped: migration 20260721i adds
       * 'needs_selection' to the status check constraint, the migration was
       * not applied to production, every one of these updates was rejected
       * with 23514, and the error went unread because nothing looked at it.
       *
       * So the error is read now, and a pause that cannot be recorded falls
       * back to the behaviour that existed before the picker: the case goes to
       * the desk with the candidates in its reason, where a person can finish
       * it. The member waits, which is honest, instead of clicking a button
       * that is guaranteed to refuse them.
       */
      const { error: pauseError } = await sb
        .from("verifications")
        .update({
          status: "needs_selection",
          registry,
          verdict_reason: reason,
          decided_at: null,
        })
        .eq("id", id);

      if (!pauseError) {
        return {
          id,
          status: "needs_selection",
          reason,
          candidates,
          candidateTotal: registry.candidateTotal ?? candidates.length,
        };
      }

      console.error(
        `[ponte] could not pause verification ${id} at needs_selection, ` +
          `falling back to review: ${pauseError.message}`,
      );

      const fallbackReason =
        `${reason}. The choice could not be offered, so this is with the desk.`;
      await sb
        .from("verifications")
        .update({
          status: "review",
          registry,
          verdict_reason: fallbackReason,
          decided_at: new Date().toISOString(),
        })
        .eq("id", id);

      return { id, status: "review", reason: fallbackReason };
    }

    // 4. VAT and LEI, only where the member supplied one.
    const vies = req.vat
      ? await checkVat(req.country ?? "", req.vat)
      : { available: false, reason: "no VAT number supplied" };
    const gleif = req.lei
      ? await lookupLei(req.lei)
      : { available: false, reason: "no LEI supplied" };

    // 5. Screen the company and every officer. An officer on a list matters
    //    as much as the company being on one.
    //
    //    officerNames already leads with the registry company name, so the
    //    declared name is only added when it differs. Screening the same name
    //    twice costs a model call and tells us nothing new.
    const seen = new Set<string>();
    const subjects = [req.name, ...officerNames(registry)].filter((n) => {
      const key = n.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const screenings = [];
    for (const subject of subjects) {
      screenings.push(
        await screenSubject(
          { name: subject, country: req.country ?? undefined },
          { ref: id, userId },
        ),
      );
    }
    const sanctions = {
      screened: subjects,
      results: screenings,
      clean: screenings.every((s) => s.clean),
      strongCount: screenings.reduce((n, s) => n + (s.strongCount ?? 0), 0),
    };

    // 6. AI reconciliation. Suggestion only.
    const { data: ai } = await reconcile({
      subject: {
        name: req.name,
        country: req.country,
        regNumber: req.regNumber,
        vat: req.vat,
        lei: req.lei,
      },
      registry,
      vies,
      gleif,
      sanctions,
      verificationId: id,
      userId,
    });

    // 7. The rules. Code decides, not the model.
    const registryActive =
      registry.available === true && /active|registered/i.test(registry.status ?? "");
    const detailsMatch = registry.available === true && declaredMatchesRegistry(req, registry);
    const sanctionsClean = sanctions.clean && sanctions.strongCount === 0;

    let status: "auto_verified" | "review";
    let reason: string;

    if (!registry.available) {
      status = "review";
      reason = registry.reason
        ? `registry not checked: ${registry.reason}`
        : "registry not checked";
    } else if (!sanctionsClean) {
      status = "review";
      reason = `sanctions candidates found on ${sanctions.screened.length} screened name(s)`;
    } else if (!registryActive) {
      status = "review";
      reason = `registry status is ${registry.status ?? "unknown"}`;
    } else if (!detailsMatch) {
      status = "review";
      reason = "declared details do not match the registry record";
    } else if (ai.verdict_suggestion !== "auto_verified") {
      // The model can push a clean case to review, never the other way.
      status = "review";
      reason = `analyst review suggested: ${ai.flags?.join(", ") || "flagged by reconciliation"}`;
    } else {
      status = "auto_verified";
      reason = "registry active, declared details match, no sanctions candidates";
    }

    await sb
      .from("verifications")
      .update({
        status,
        registry,
        vies,
        gleif,
        sanctions_hits: sanctions,
        ai_summary: ai,
        verdict_reason: reason,
        decided_at: status === "auto_verified" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    // 8. Trust score, only on a clean automatic pass. A case in review scores
    //    nothing until a human decides.
    if (status === "auto_verified" && userId) {
      await setComponent(userId, "business", 25);
      await setComponent(userId, "sanctions_clean", 20);
      const agePoints = companyAgePoints(registry.incorporationDate);
      if (agePoints > 0) await setComponent(userId, "company_age", agePoints);
      await sb
        .from("profiles")
        .update({ verification_level: 2, verified_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return { id, status, reason };
  } catch (err) {
    // The member should never pay for a run that broke on our side.
    //
    // One refund per verification, not one per attempt: the case is written to
    // 'failed' here, and a resume is only ever accepted on a case still sitting
    // at 'needs_selection', so a failed run cannot be resumed into a second
    // refund.
    const message = (err as Error).message;
    await sb
      .from("verifications")
      .update({
        status: "failed",
        verdict_reason: `pipeline error: ${message}`,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (userId) {
      await refundSpend(userId, COST_VERIFICATION_L2, id).catch(() => {});
    }
    return { id, status: "failed", reason: message };
  }
}

// ---------------------------------------------------------------------------
// Resuming a paused case
// ---------------------------------------------------------------------------

export type ResumeRejection =
  /** No such case, or it is not this member's. The two are not distinguished. */
  | "not_found"
  /** The case exists but is not waiting for a company to be chosen. */
  | "not_selectable"
  /** The number sent was not one of the candidates this case offered. */
  | "unknown_candidate";

export type ResumeResult =
  | { ok: true; outcome: VerificationOutcome }
  | { ok: false; rejection: ResumeRejection };

/**
 * The member has picked one of the companies that matched their name search.
 * Finish THAT verification on the registration number they chose.
 *
 * NO CREDITS ARE SPENT HERE, AND NONE MAY EVER BE. The member paid
 * COST_VERIFICATION_L2 when the case was opened, `credit_ledger_id` on the row
 * already points at that spend, and this function does not read it, change it
 * or add to it. Picking a company is the member answering a question the check
 * asked them, not buying a second check. This is why the work below calls
 * `runLevel2Checks` and not `runLevel2`.
 *
 * OWNERSHIP IS ENFORCED HERE, IN THE DATABASE QUERY, not in the caller and not
 * in the UI. The row is fetched by id AND user_id together, so another member's
 * case is simply not found. A `needs_selection` case belonging to a guest, with
 * no user_id, can never be matched by this query either, which is correct: a
 * guest has no session to prove they are the buyer.
 */
export async function resumeLevel2WithSelection(input: {
  verificationId: string;
  userId: string;
  regNumber: string;
}): Promise<ResumeResult> {
  const sb = createAdminClient();

  const { data: row } = await sb
    .from("verifications")
    .select(
      "id, user_id, status, subject_name, subject_country, subject_vat, subject_lei, registry",
    )
    .eq("id", input.verificationId)
    // The ownership guard. Server side, on the read itself.
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row) return { ok: false, rejection: "not_found" };

  // Only a paused case can be resumed. This is also what stops a second click,
  // a replayed request or a decided case from re-running the checks, and what
  // keeps the failure refund inside `runLevel2Checks` to one per verification.
  if (row.status !== "needs_selection") {
    return { ok: false, rejection: "not_selectable" };
  }

  // The chosen number has to be one this case actually offered. Without this a
  // member could post any registration number at all and have Ponte run, and
  // record against their account, a check on a company that was never a match.
  const candidates = readCandidates(row.registry);
  const chosen = candidates.find((c) => sameRegNumber(c.regNumber, input.regNumber));
  if (!chosen?.regNumber) return { ok: false, rejection: "unknown_candidate" };

  // Record what was picked, so the case shows the number the rest of the run
  // was made on. The status is deliberately left at 'needs_selection' until the
  // checks write their own verdict: if this request dies mid flight, the member
  // can pick again rather than being stranded on a case they have paid for.
  await sb
    .from("verifications")
    .update({ subject_reg_number: chosen.regNumber })
    .eq("id", row.id);

  const outcome = await runLevel2Checks(
    row.id,
    {
      name: row.subject_name,
      country: row.subject_country,
      regNumber: chosen.regNumber,
      vat: row.subject_vat,
      lei: row.subject_lei,
    },
    { userId: input.userId },
  );

  return { ok: true, outcome };
}
