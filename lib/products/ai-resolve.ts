/**
 * The semantic stage of product resolution.
 *
 * Stage one (`./resolve.ts`) is deterministic, free and English-shaped. It
 * answers `gas oil`, `EN 590` and `ULSD` without a network call, which is why
 * the acceptance criteria are unit tests rather than manual checks. It cannot
 * answer "mandorle sgusciate", "Dieselkraftstoff nach EN 590" or a description
 * that names no catalogue term at all, and North Star 3.4 is explicit that the
 * user's language overrides the database's.
 *
 * So this runs *after* stage one, and only when stage one could not answer.
 * The order matters commercially as well as technically: every call here costs
 * tokens against `ai_calls`, and the common case must not.
 *
 * ## The rule that makes this safe
 *
 * The model is given the catalogue's own keys and may return nothing else. A
 * key that is not in the catalogue is discarded by the parser. That is the
 * difference between "AI may structure, compare, explain, recommend and draft"
 * and the silent invention `AGENTS.md` forbids: the worst a confused or hostile
 * model answer can do here is return fewer candidates, never a product that
 * does not exist.
 *
 * The score a semantic candidate carries is *assigned by this module*, not by
 * the model. A model-stated confidence is a number nobody can check, and North
 * Star 5.2 forbids putting one on a Ponte surface.
 */

import { callAiJson, isAiConfigured, MODEL_FAST } from "@/lib/ai";
import { PRODUCT_CATALOGUE, productByKey } from "./catalogue";
import { bandFor, type ProductCandidate, type ResolutionOutcome } from "./model";
import { resolveProduct } from "./resolve";

/**
 * What a semantic match is worth.
 *
 * Below the lexical stage's exact-synonym score on purpose. A model saying "this
 * sounds like gasoil" is weaker evidence than a member typing a term the
 * catalogue records, and the ranking should say so.
 */
const SEMANTIC_SCORE = 0.62;
/** A second or third semantic suggestion is weaker still. */
const SEMANTIC_DECAY = 0.08;

/**
 * The confirmation margin is not applied to semantic results.
 *
 * A model returning one key is not evidence that no other product fits; it is
 * evidence that the model chose one. Treating that as settled would be
 * "silently accepting the first AI guess", which the decision record names as a
 * rejected approach. Semantic results therefore always arrive as `candidates`
 * or `ambiguous`, never as `resolved`.
 */

type ModelAnswer = {
  matches?: { key?: unknown; because?: unknown }[];
  clarify?: unknown;
  language?: unknown;
};

function systemPrompt(): string {
  const lines = PRODUCT_CATALOGUE.map(
    (p) => `- ${p.key}: ${p.name}. ${p.distinguisher} Also known as: ${p.synonyms.slice(0, 8).join(", ")}.`,
  ).join("\n");

  return `You match a trader's description of a physical product, written in ANY language, to entries in Ponte's product catalogue.

The catalogue is exactly this list. You may return keys from it and nothing else:

${lines}

Return a JSON object:
- "matches": an array of up to 4 objects, best first, each {"key": "<a key from the list above>", "because": "<one short clause in ENGLISH naming what in the description points at this product>"}. Return an empty array if nothing in the list plausibly matches.
- "clarify": ONE short question in ENGLISH to ask the trader when two or more entries are genuinely plausible and the description does not choose between them, otherwise null.
- "language": the description's language as a short tag, e.g. "it", "ar", "en", or null.

Rules:
- Never return a key that is not in the list. If the product is not in the list, return an empty "matches" array.
- Never invent a grade, a standard, a quantity or a specification the description does not contain.
- "because" must point at words that are actually in the description. Do not justify a match with knowledge the description does not carry.
- If the description names a standard or a grade, prefer the entry that standard belongs to.`;
}

function cleanClause(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, 160) : "";
}

/**
 * Resolve with the model, then fold the result into the lexical outcome.
 *
 * Returns the lexical outcome untouched whenever the model is unconfigured,
 * fails, times out or answers with nothing usable. A member is never blocked by
 * an AI outage: the deterministic answer still stands, and where there was no
 * deterministic answer the `none` outcome still names what was tried.
 */
export async function resolveProductSemantically(
  raw: string,
  opts?: { userId?: string | null },
): Promise<ResolutionOutcome> {
  const lexical = resolveProduct(raw);

  // A named standard or an exact catalogue term is a decision the member
  // already made. Spending a token on it would buy nothing.
  if (lexical.kind === "resolved" || lexical.kind === "candidates") return lexical;
  if (!isAiConfigured()) return lexical;

  const text = raw.trim().slice(0, 600);
  if (text.length < 2) return lexical;

  let answer: ModelAnswer;
  try {
    const { data } = await callAiJson<ModelAnswer>({
      feature: "product_resolve",
      model: MODEL_FAST,
      maxTokens: 400,
      temperature: 0,
      userId: opts?.userId ?? null,
      system: systemPrompt(),
      user: text,
      timeoutMs: 10_000,
    });
    answer = data;
  } catch {
    // Already recorded as a failed row inside callAi. Degrade, never block.
    return lexical;
  }

  const seen = new Set<string>();
  const semantic: ProductCandidate[] = [];
  for (const match of Array.isArray(answer.matches) ? answer.matches : []) {
    const key = typeof match?.key === "string" ? match.key : "";
    // The enforcement, not the request: an unknown key is dropped here.
    const product = productByKey(key);
    if (!product || seen.has(product.key)) continue;
    seen.add(product.key);
    const score = Math.max(0.3, SEMANTIC_SCORE - SEMANTIC_DECAY * semantic.length);
    semantic.push({
      product,
      score,
      band: bandFor(score),
      matchedOn: [{ kind: "semantic", term: cleanClause(match?.because) || "matched by description" }],
    });
    if (semantic.length === 4) break;
  }

  if (semantic.length === 0) {
    // The lexical stage found nothing and the model recognised nothing. That is
    // still an explained outcome, never a blank screen.
    return lexical.kind === "ambiguous" ? lexical : { kind: "none", wording: raw.trim(), tried: [text] };
  }

  // Keep any weak lexical candidates below the semantic ones rather than
  // discarding them: they were real matches that merely failed to settle.
  const carried = lexical.kind === "ambiguous" ? lexical.candidates.filter((c) => !seen.has(c.product.key)) : [];
  const candidates = [...semantic, ...carried];

  const clarify = cleanClause(answer.clarify);
  if (candidates.length > 1) {
    return {
      kind: "ambiguous",
      candidates,
      wording: raw.trim(),
      question:
        clarify ||
        `More than one product could match "${raw.trim()}". Which do you trade?`,
    };
  }

  return { kind: "candidates", candidates, wording: raw.trim() };
}
