// AI vetting co-pilot for marketplace listings.
//
// Calls the Anthropic API and returns a structured review the desk uses
// to vet faster. The AI RECOMMENDS, the desk DECIDES: nothing here
// approves or rejects a listing on its own.
//
// Env:
//   ANTHROPIC_API_KEY  required (set in Netlify)
//   AI_VET_MODEL       optional model override

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export type AiReview = {
  score: number; // 0-100 credibility/completeness
  verdict: "looks_solid" | "needs_info" | "caution";
  summary: string;
  missing_info: string[];
  red_flags: string[];
  compliance_notes: string[];
  questions_email_draft: string;
  decision_note_draft: string;
};

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You are the vetting analyst of Ponte (ponte.trade), a brokerage
marketplace for physical goods and trade services operated by 1402 Celsius Ltd.
Members submit offers (sellers), requirements (buyers) and services. Every
listing is reviewed by a human desk before anything is circulated, anonymized,
and introductions happen only under signed NCNDA and fee terms.

Assess the listing a trader submitted and return STRICT JSON only, no prose
around it, with exactly these keys:
{
  "score": <0-100 integer: completeness + commercial credibility>,
  "verdict": "looks_solid" | "needs_info" | "caution",
  "summary": "<2-3 sentences for the desk>",
  "missing_info": ["<info a serious counterparty needs that is absent>", ...],
  "red_flags": ["<inconsistencies: price vs product norms, quantity/unit
    oddities, vague or copied text, unrealistic claims>", ...],
  "compliance_notes": ["<sensitivities: sanctioned or embargoed origins and
    destinations, dual-use goods, protected species, pharmaceuticals or other
    licence-heavy categories. Empty array if none.>", ...],
  "questions_email_draft": "<short friendly email body, no greeting name
    needed, asking the member for the missing items. Plain text.>",
  "decision_note_draft": "<one short paragraph the desk could send with an
    approval or rejection>"
}

Rules: judge only what is written, do not invent facts. Prices you doubt are a
flag, not a verdict. "caution" is for compliance sensitivities or signs of
unseriousness, not for mere incompleteness. Use plain trade language, never
em dashes. Arrays empty when nothing applies.

Chain position matters. submitter_role and chain_depth say who is submitting
and how many hands sit between them and the goods (sellers) or the money
(buyers). A producer or end buyer direct is strongest. A broker with a mandate
is fine if the mandate is uploaded; if not, put the mandate in missing_info.
An intermediary two or more steps out, or unsure of their chain, is a classic
daisy chain: flag it and have the questions email ask for proof of proximity
(mandate, title, or a direct line to the principal). Role missing on a goods
listing goes in missing_info.`;

export async function vetListing(listing: {
  ref: string;
  type: string;
  product: string;
  details: string;
  origin: string | null;
  destination: string | null;
  volume: string | null;
  incoterm: string | null;
  indicative_value_usd: number | null;
  submitter_role?: string | null;
  chain_depth?: string | null;
  media_count?: number;
  doc_count?: number;
}): Promise<AiReview | null> {
  if (!isAiConfigured()) return null;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_VET_MODEL || DEFAULT_MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Vet this listing:\n${JSON.stringify(listing, null, 2)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[ponte] AI vet API error:", res.status, body.slice(0, 300));
    return null;
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const jsonText = text.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as AiReview;
    if (typeof parsed.score !== "number" || !parsed.verdict) return null;
    return parsed;
  } catch {
    console.error("[ponte] AI vet: unparseable output:", text.slice(0, 200));
    return null;
  }
}
