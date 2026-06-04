// Pure listing moderation rules engine. The banned-phrase list is from the spec.
// Each rule either FLAGS a listing for admin review or REJECTS it outright.
// No I/O — fully unit-testable.

export type ModerationAction = "flag" | "reject";

interface Rule { phrase: string; action: ModerationAction; reason: string; }

// Spec banned phrases. The two clearest advance-fee scam patterns auto-reject;
// the rest flag for human review (they have occasional legitimate uses).
const RULES: Rule[] = [
  { phrase: "proof of funds first", action: "reject", reason: "Upfront proof-of-funds demand (advance-fee scam pattern)" },
  { phrase: "direct seller mandate", action: "reject", reason: "Unverifiable mandate-chain language (scam pattern)" },
  { phrase: "serious buyers only", action: "flag", reason: "Vague gatekeeping phrase common in scam listings" },
  { phrase: "allocation available", action: "flag", reason: "Allocation-scam language" },
  { phrase: "gold available", action: "flag", reason: "Generic commodity-scam phrasing" },
  { phrase: "oil available", action: "flag", reason: "Generic commodity-scam phrasing" },
  { phrase: "contact me on whatsapp", action: "flag", reason: "Off-platform contact solicitation" },
  { phrase: "telegram", action: "flag", reason: "Off-platform contact solicitation" },
];

export type ModerationStatus = "approved" | "flagged" | "rejected";

export interface ModerationResult {
  status: ModerationStatus;
  reasons: string[];
  matched: string[];
}

export function moderateText(text: string): ModerationResult {
  const hay = (text || "").toLowerCase();
  const reasons: string[] = [];
  const matched: string[] = [];
  let reject = false;
  let flag = false;
  for (const r of RULES) {
    if (hay.includes(r.phrase)) {
      matched.push(r.phrase);
      reasons.push(r.reason);
      if (r.action === "reject") reject = true;
      else flag = true;
    }
  }
  const status: ModerationStatus = reject ? "rejected" : flag ? "flagged" : "approved";
  return { status, reasons, matched };
}

// Moderate the user-controlled text fields of a listing together.
export function moderateListing(fields: { commodity?: string | null; specifications?: string | null }): ModerationResult {
  return moderateText([fields.commodity, fields.specifications].filter(Boolean).join("\n"));
}
