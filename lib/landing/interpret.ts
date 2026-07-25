// AI fallback for the landing objective, for any language and any product.
//
// The deterministic matcher in ./intent.ts is fast, free, and English-first.
// It resolves the common cases with no network call. When it cannot (a phrase
// in Italian, Chinese, Arabic; a product not in its small vocabulary), this
// asks a cheap model to read the objective instead, in any language, and to
// return the product as an English trade name so the HS lookup downstream can
// match it.
//
// Every call is metered through lib/ai (recorded in ai_calls, costed in real
// tokens). It runs server-side only: the API key never reaches the browser.

import { callAiJson, isAiConfigured, MODEL_FAST } from "@/lib/ai";
import type { RouteKey } from "./intent";

export type Interpretation = {
  /** The best-fit route, or null when there is no commercial objective at all. */
  route: RouteKey | null;
  /** The product as a common English trade name, for the HS lookup. */
  product: string | null;
  /** A company name, when the objective is about checking one. */
  company: string | null;
  /**
   * One short sentence in the user's own language, always present. The caller
   * shows it when there is no route to navigate to, so the visitor is never met
   * with nothing.
   */
  reply: string;
  /** Detected language tag, e.g. "it", "zh". Best effort. */
  language: string | null;
};

const ROUTES: RouteKey[] = ["find", "structure", "check", "investigate"];

const SYSTEM = `You read a business person's short objective, typed or spoken, in ANY language, and map it onto one of Ponte's four cross-border trade routes. Ponte is a B2B trade network: find opportunities, structure requirements, verify companies, investigate signals.

Return a JSON object with these fields:
- "route": one of "find", "structure", "check", "investigate", or null.
- "product": the product as a common ENGLISH trade name (e.g. Italian "mandorle" -> "almonds", Chinese "杏仁" -> "almonds", "acciaio" -> "steel"), or null if no specific product is named.
- "company": a company name if the objective is about checking a specific company, else null.
- "reply": ONE short, friendly sentence in the SAME language as the input, acknowledging what you understood. Always provide this.
- "language": the input's language as a short tag (e.g. "it", "zh", "en"), or null.

Route meanings:
- "find": the person wants to find demand, supply, buyers, or opportunities for a product, or is searching/looking for a product. Product-centric. Examples: "I'm looking for almonds", "sto cercando mandorle", "who buys steel in Germany".
- "structure": the person wants to create, structure, or draft a buy/sell requirement, a procurement, or to move/ship goods (logistics). Examples: "I need to source 200 tons of urea", "ship two containers to Spain".
- "check": verify or run due diligence on a specific company or counterparty. Examples: "check Acme Trading before I deal with them".
- "investigate": look into a market signal, tender, rumour, or reported opportunity. Examples: "investigate a tender I saw".

Rules:
- Prefer "find" when a product is named and the intent is to source, sell, or buy it, unless the person explicitly asks to draft a formal requirement (then "structure"), verify a company (then "check"), or investigate a signal (then "investigate").
- If a product is clearly named but the route is otherwise unclear, choose "find".
- Use route null ONLY when there is no commercial objective at all (a greeting, gibberish). Even then, give a helpful "reply" inviting them to say what they want to source, supply, verify, or investigate.
- Never invent a product or company that is not in the text.`;

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 && s.length <= 120 ? s : s.length > 120 ? s.slice(0, 120) : null;
}

function normalizeRoute(v: unknown): RouteKey | null {
  return typeof v === "string" && (ROUTES as string[]).includes(v) ? (v as RouteKey) : null;
}

/**
 * Interpret a free-text objective with the model. Returns null (rather than
 * throwing) whenever the AI is unavailable or the call fails, so the caller can
 * fall back to the deterministic path and the visitor is never blocked.
 */
export async function interpretObjective(
  raw: string,
  opts?: { userId?: string | null },
): Promise<Interpretation | null> {
  if (!isAiConfigured()) return null;
  const text = raw.trim().slice(0, 400);
  if (text.length < 2) return null;

  try {
    const { data } = await callAiJson<Partial<Interpretation>>({
      feature: "landing_interpret",
      model: MODEL_FAST,
      maxTokens: 220,
      temperature: 0,
      userId: opts?.userId ?? null,
      // One block, no cache breakpoint: Haiku does not cache a prefix under
      // ~4k tokens, and this system prompt is far shorter than that.
      system: SYSTEM,
      user: text,
      timeoutMs: 8_000,
    });

    const route = normalizeRoute(data.route);
    return {
      route,
      product: cleanStr(data.product),
      company: cleanStr(data.company),
      reply: cleanStr(data.reply) ?? "",
      language: cleanStr(data.language),
    };
  } catch {
    // A metered failure is already recorded inside callAi; the caller degrades.
    return null;
  }
}
