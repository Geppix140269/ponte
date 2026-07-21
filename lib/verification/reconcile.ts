// AI reconciliation.
//
// One metered call per verification. The model reconciles registry, VAT, LEI
// and sanctions results into a sourced summary and SUGGESTS a verdict. It does
// not decide one. The pipeline applies the rules, and a rejection is always a
// human decision.
//
// Every claim in the output has to name the source it came from and the date
// it was checked, because that summary is printed on a certificate a buyer may
// rely on.

import { callAiJson, MODEL_WORK } from "@/lib/ai";

export type ReconcileCheck = {
  check: string;
  result: "pass" | "fail" | "not_checked" | "attention";
  source: string;
  note: string;
};

export type Reconciliation = {
  verdict_suggestion: "auto_verified" | "review" | "insufficient_data";
  checks: ReconcileCheck[];
  flags: string[];
  summary_text: string;
};

const SYSTEM = `You are the verification analyst of Ponte, a vetted marketplace
for physical trade. You reconcile the results of public source checks on a
company into one sourced summary.

Absolute rules:
- Use ONLY the data supplied to you. You have no other knowledge of this
  company. Never infer, speculate, or fill a gap from memory.
- Every check you report must name the source it came from and the date it was
  checked. If something was not checked, say so plainly and mark it
  not_checked. "Not checked" is a valid and useful answer.
- You SUGGEST a verdict. You never decide one, and you never suggest a
  rejection. If anything is unclear, ambiguous, missing, or contradictory,
  suggest "review" so a person looks at it.
- Suggest "auto_verified" only when all of these hold: the registry record is
  active, the details the member declared match the registry, and there are
  zero sanctions candidates. Anything else is "review".
- If the registry could not be checked at all, suggest "insufficient_data".
- A sanctions candidate is never cleared by you. Any candidate at all means
  "review".

summary_text is written for a buyer deciding whether to trade with this
company. Plain, factual, no marketing, no reassurance you cannot evidence.
State what was checked, against what source, on what date, and what was found.
Two to four short sentences.

Never use an em dash. Use commas, colons or full stops.
Do not mention any data source that is not in the supplied data.`;

export async function reconcile(input: {
  subject: {
    name: string;
    country?: string | null;
    regNumber?: string | null;
    vat?: string | null;
    lei?: string | null;
  };
  registry: unknown;
  vies: unknown;
  gleif: unknown;
  sanctions: unknown;
  verificationId: string;
  userId?: string | null;
}): Promise<{ data: Reconciliation; inputTokens: number; outputTokens: number }> {
  const payload = {
    declared_by_member: input.subject,
    registry_result: input.registry,
    vat_check: input.vies,
    lei_lookup: input.gleif,
    sanctions_screening: input.sanctions,
    checked_on: new Date().toISOString().slice(0, 10),
  };

  const { data, usage } = await callAiJson<Reconciliation>({
    feature: "verification_reconcile",
    system: SYSTEM,
    user:
      `Reconcile these check results into a verdict suggestion and a sourced summary.\n\n` +
      JSON.stringify(payload, null, 2) +
      `\n\nReturn this exact shape:\n` +
      `{"verdict_suggestion":"auto_verified|review|insufficient_data",` +
      `"checks":[{"check":"","result":"pass|fail|not_checked|attention","source":"","note":""}],` +
      `"flags":[],"summary_text":""}`,
    model: MODEL_WORK,
    maxTokens: 1500,
    temperature: 0,
    userId: input.userId ?? null,
    ref: input.verificationId,
  });

  // The model is instructed never to suggest a rejection. Enforce it in code
  // too, because a prompt is a request and this is a rule.
  const allowed = ["auto_verified", "review", "insufficient_data"];
  if (!allowed.includes(data.verdict_suggestion)) {
    data.verdict_suggestion = "review";
  }

  return {
    data,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  };
}
