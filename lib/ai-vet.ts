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
  language?: string; // ISO 639-1 of the listing text
  english_product?: string; // translation for the desk when not English
  english_details?: string;
};

export type AiAssessment = {
  score: number; // 0-100 completeness/appeal
  headline: string;
  fix: string[]; // blocking gaps
  improve: string[]; // would raise the score
  passed: string[]; // already strong
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
    needed, asking the member for the missing items. Plain text. Write it in
    the language the listing was written in.>",
  "decision_note_draft": "<one short paragraph the desk could send with an
    approval or rejection>",
  "language": "<ISO 639-1 code of the language the listing text is written
    in, e.g. en, zh, es>",
  "english_product": "<English translation of the product line if the
    listing is not in English, else empty string>",
  "english_details": "<faithful English translation of the details if the
    listing is not in English, else empty string. Keep numbers, units and
    incoterms exactly as written.>"
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

// ---------------------------------------------------------------------------
// Instant listing assessment: the free "how good is my listing" check shown
// on the preview step BEFORE publishing. Reciprocity: the member gets value
// the moment they finish typing, signed in or not.

const ASSESS_SYSTEM = `You are the listing coach of Ponte (ponte.trade), a
vetted marketplace for physical goods and trade services. A trader has just
composed a listing and wants to know how strong it is before publishing.

Return STRICT JSON only, exactly these keys:
{
  "score": <0-100 integer: completeness + commercial appeal to a serious
    counterparty>,
  "headline": "<one encouraging sentence summing up the state of the
    listing>",
  "fix": ["<gap that will block serious interest, e.g. no photos, no
    quantity, vague description>", ...],
  "improve": ["<concrete addition that would raise the score, e.g. name the
    variety and grade, add packaging details, state availability>", ...],
  "passed": ["<what is already strong>", ...]
}

Rules: be specific to what they wrote, never generic. 3 items maximum per
array; empty arrays allowed. Judge only the text given; missing photos are
told to you via media_count. Encourage, do not scold. Never use em dashes.
IMPORTANT: write headline, fix, improve and passed in the SAME LANGUAGE the
listing description is written in.`;

export async function assessListing(input: {
  type: string;
  product: string;
  description: string;
  quantity: string;
  price: string;
  origin: string;
  destination: string;
  role: string;
  media_count: number;
}): Promise<AiAssessment | null> {
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
      max_tokens: 700,
      system: ASSESS_SYSTEM,
      messages: [
        { role: "user", content: `Assess this draft listing:\n${JSON.stringify(input, null, 2)}` },
      ],
    }),
  });
  if (!res.ok) {
    console.error("[ponte] AI assess API error:", res.status);
    return null;
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const jsonText = text.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as AiAssessment;
    if (typeof parsed.score !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Listing translation: a member lists in Chinese, a buyer reads it in
// Spanish. Translations are cached in listing_translations by the caller,
// so each listing/language pair costs one API call ever.

export async function translateListing(
  input: { product: string; details: string },
  targetLang: string,
): Promise<{ product: string; details: string } | null> {
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
      max_tokens: 1500,
      system: `You are a professional trade translator. Translate the given
listing into the language with ISO 639-1 code "${targetLang}". Keep numbers,
units, currencies and incoterms (FOB, CIF, EXW...) exactly as written. Use
plain commercial language. Return STRICT JSON only:
{"product": "<translated product line>", "details": "<translated details>"}`,
      messages: [
        { role: "user", content: JSON.stringify(input) },
      ],
    }),
  });
  if (!res.ok) {
    console.error("[ponte] AI translate API error:", res.status);
    return null;
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const jsonText = text.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as { product: string; details: string };
    if (!parsed.product || !parsed.details) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 2: the AI account manager. Reads a member's whole account and
// produces a short brief: where things stand, what to do next, and a
// nudge email draft the desk can send. Cached in account_briefs, one
// generation per member per day at most.

export type AccountBrief = {
  summary: string;
  next_actions: string[]; // max 4, imperative, member-facing
  nudge_email_draft: string; // desk-facing draft to re-engage this member
};

const ACCOUNT_SYSTEM = `You are the account manager of Ponte (ponte.trade),
a free vetted marketplace for physical trade with an optional paid desk
(success fee or retainer) for managed deals.

You are given a member's account: their listings with statuses, drafts,
and pending connection requests. Return STRICT JSON only:
{
  "summary": "<2 sentences, warm and concrete, on where their account
    stands. Address the member as 'you'.>",
  "next_actions": ["<imperative, specific next step, e.g. 'Accept or
    decline the pending connection request on PT-0104', 'Add photos to
    your draft before submitting', 'Your listing PT-0101 has been live 30
    days: confirm it is still available'>", ...],
  "nudge_email_draft": "<short friendly email the desk could send this
    member to re-engage them, plain text, no subject line>"
}

Rules: max 4 next_actions, most valuable first. Ground every point in the
data given, never invent listings. Statuses: draft (only they see it),
submitted (in vetting), approved (live on the board), rejected, closed.
Pending connection requests are other members wanting to connect: urgent.
Mention the optional desk only when a deal looks big or stuck. Plain
language, never em dashes.`;

export async function accountBrief(input: {
  listings: {
    ref: string;
    type: string;
    product: string;
    status: string;
    days_old: number;
  }[];
  pending_connection_requests: number;
}): Promise<AccountBrief | null> {
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
      max_tokens: 700,
      system: ACCOUNT_SYSTEM,
      messages: [
        { role: "user", content: `This member's account:\n${JSON.stringify(input, null, 2)}` },
      ],
    }),
  });
  if (!res.ok) {
    console.error("[ponte] AI account brief API error:", res.status);
    return null;
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const jsonText = text.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as AccountBrief;
    if (!parsed.summary || !Array.isArray(parsed.next_actions)) return null;
    return parsed;
  } catch {
    return null;
  }
}
