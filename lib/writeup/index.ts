// Generating the deal write-up.
//
// This is the free hook: it runs before we have asked the visitor for
// anything, including their email. It is not a credit action and must never
// become one.

import { createHash } from "node:crypto";
import { callAiJson, MODEL_FAST } from "@/lib/ai";
import { PROMPT_VERSION, writeupSystem } from "./prompt";
import { meetsWriteupMinimum, type DraftForScore } from "./completeness";

export { PROMPT_VERSION };

export type OpenPoint = { text: string; field_ref: string | null };

export type Writeup = {
  description: string;
  strengths: string[];
  open_points: OpenPoint[];
  non_negotiables: string;
  summary_line: string;
  share_text: string;
};

export type WriteupResult = {
  writeup: Writeup;
  model: string;
  promptVersion: string;
  /** True when this came from the payload cache and cost nothing. */
  cached: boolean;
  cacheReadTokens?: number;
};

export type WriteupDraft = DraftForScore & {
  details?: string | null;
  flexibility?: Record<string, string> | null;
};

/**
 * The payload the model sees.
 *
 * Built explicitly rather than by serialising the draft, for two reasons. It
 * keeps user free text from other members out of this prompt entirely, and it
 * keeps the key order stable so the payload hash is stable, which is what
 * makes the cache below work at all.
 */
function payloadFor(draft: WriteupDraft): Record<string, unknown> {
  return {
    type: draft.type ?? null,
    product: draft.product ?? null,
    hs_code: draft.hs_code ?? null,
    quantity: draft.quantity ?? null,
    unit: draft.unit ?? null,
    frequency: (draft as { frequency?: string | null }).frequency ?? null,
    incoterm: draft.incoterm ?? null,
    payment_terms: draft.payment_terms ?? null,
    origin: draft.origin_country ?? draft.origin ?? null,
    destination: draft.destination_country ?? draft.destination ?? null,
    poster_role: draft.submitter_role ?? null,
    chain: draft.chain_depth ?? null,
    flexibility: draft.flexibility ?? {},
    validity_type: draft.validity_type ?? null,
    valid_until: draft.valid_until ?? null,
    key_notes: draft.key_notes ?? null,
    details: draft.details ?? null,
    media_count: draft.media_count ?? 0,
  };
}

export function payloadHash(draft: WriteupDraft): string {
  return createHash("sha256")
    .update(PROMPT_VERSION)
    .update(JSON.stringify(payloadFor(draft)))
    .digest("hex");
}

/**
 * In-process cache of identical payloads.
 *
 * The regenerate loop is the point of this feature, and a member who presses
 * Update without changing anything should cost nothing at all. This composes
 * with Anthropic's prompt cache rather than replacing it: this one skips the
 * call entirely for an identical payload, the prompt cache makes the
 * non-identical case cheap and fast.
 *
 * Deliberately in memory and small. A serverless instance is short-lived, and
 * the durable copy of a write-up belongs on the draft row, not here.
 */
const cache = new Map<string, { at: number; value: Writeup }>();
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX = 200;

function cacheGet(key: string): Writeup | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: Writeup): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

function clean(s: unknown, max: number): string {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

/**
 * Shape whatever came back into the contract the interface renders.
 *
 * A model that returns four strengths when asked for two to four is fine. One
 * that returns a string where an array belongs would otherwise crash a React
 * tree, so every field is coerced rather than trusted.
 */
function normalise(raw: unknown): Writeup {
  const r = (raw ?? {}) as Record<string, unknown>;

  const strengths = Array.isArray(r.strengths)
    ? r.strengths.map((s) => clean(s, 200)).filter(Boolean).slice(0, 4)
    : [];

  const openPoints = Array.isArray(r.open_points)
    ? r.open_points
        .map((p) => {
          const o = (p ?? {}) as Record<string, unknown>;
          const text = clean(o.text ?? p, 300);
          const ref = clean(o.field_ref, 40);
          return text ? { text, field_ref: ref || null } : null;
        })
        .filter((p): p is OpenPoint => p !== null)
        .slice(0, 4)
    : [];

  return {
    description: clean(r.description, 1400),
    strengths,
    open_points: openPoints,
    non_negotiables: clean(r.non_negotiables, 900),
    summary_line: clean(r.summary_line, 90),
    share_text: clean(r.share_text, 180),
  };
}

export class WriteupBelowMinimum extends Error {
  constructor() {
    super("not enough fields to write up");
    this.name = "WriteupBelowMinimum";
  }
}

/**
 * Generate, or return an identical earlier answer.
 *
 * Temperature 0: two members entering the same deal should get the same
 * write-up, and a regenerate that changes the wording without changing the
 * facts reads as unreliable.
 */
export async function generateWriteup(
  draft: WriteupDraft,
  opts: { userId?: string | null; ref?: string | null } = {},
): Promise<WriteupResult> {
  if (!meetsWriteupMinimum(draft)) throw new WriteupBelowMinimum();

  const key = payloadHash(draft);
  const hit = cacheGet(key);
  if (hit) {
    return {
      writeup: hit,
      model: MODEL_FAST,
      promptVersion: PROMPT_VERSION,
      cached: true,
    };
  }

  const { data, usage } = await callAiJson<unknown>({
    feature: "deal_writeup",
    system: writeupSystem(),
    user: JSON.stringify(payloadFor(draft)),
    model: MODEL_FAST,
    maxTokens: 1400,
    temperature: 0,
    userId: opts.userId ?? null,
    ref: opts.ref ?? null,
    // The composer promises a regeneration in under three seconds, so a call
    // that has not returned in twenty is not going to be useful.
    timeoutMs: 20_000,
  });

  const writeup = normalise(data);
  if (!writeup.description) {
    throw new Error("write-up came back without a description");
  }

  cacheSet(key, writeup);

  return {
    writeup,
    model: usage.model,
    promptVersion: PROMPT_VERSION,
    cached: false,
    cacheReadTokens: usage.cacheReadTokens,
  };
}
