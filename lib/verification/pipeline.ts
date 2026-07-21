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
// No customs or third party trade data is used anywhere. Registry, VAT, LEI
// and published sanctions lists only.

import { createAdminClient } from "@/lib/supabase/server";
import {
  COST_VERIFICATION_L2,
  InsufficientCredits,
  refundSpend,
  spendCredits,
} from "@/lib/credits";
import { lookupRegistry, officerNames } from "@/lib/registry";
import { screenSubject } from "@/lib/sanctions/screen";
import { checkVat } from "@/lib/registry/vies";
import { lookupLei } from "@/lib/registry/gleif";
import { reconcile } from "@/lib/verification/reconcile";
import { companyAgePoints, setComponent } from "@/lib/verification/trust-score";

/** Must appear on every result, every certificate, and in the terms. */
export const VERIFICATION_DISCLAIMER =
  "Verification confirms checks against the named public sources on the stated date. " +
  "It is not a credit rating, a guarantee of performance or solvency, or legal due diligence.";

export type VerificationRequest = {
  userId?: string | null;
  guestEmail?: string | null;
  /** Set when a guest paid for a single certificate instead of spending credits. */
  guestLedgerId?: string | null;
  name: string;
  country?: string | null;
  regNumber?: string | null;
  vat?: string | null;
  lei?: string | null;
};

export type VerificationOutcome = {
  id: string;
  status: "auto_verified" | "review" | "failed";
  reason: string;
};

function declaredMatchesRegistry(
  declared: VerificationRequest,
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

  try {
    // 3. Registry.
    const registry = await lookupRegistry({
      country: req.country ?? undefined,
      regNumber: req.regNumber ?? undefined,
      name: req.name,
    });

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
          { ref: id, userId: req.userId ?? null },
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
      userId: req.userId ?? null,
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
    if (status === "auto_verified" && req.userId) {
      await setComponent(req.userId, "business", 25);
      await setComponent(req.userId, "sanctions_clean", 20);
      const agePoints = companyAgePoints(registry.incorporationDate);
      if (agePoints > 0) await setComponent(req.userId, "company_age", agePoints);
      await sb
        .from("profiles")
        .update({ verification_level: 2, verified_at: new Date().toISOString() })
        .eq("id", req.userId);
    }

    return { id, status, reason };
  } catch (err) {
    // The member should never pay for a run that broke on our side.
    const message = (err as Error).message;
    await sb
      .from("verifications")
      .update({
        status: "failed",
        verdict_reason: `pipeline error: ${message}`,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (req.userId) {
      await refundSpend(req.userId, COST_VERIFICATION_L2, id).catch(() => {});
    }
    return { id, status: "failed", reason: message };
  }
}
