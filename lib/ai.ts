// The metered entry point for every AI call in Ponte.
//
// Nothing calls the Anthropic API directly. Everything goes through here, so
// that every call is attributable, costed in real tokens, and recorded even
// when it fails. That is what makes credit pricing checkable against what the
// model actually costs, rather than a guess.
//
// Env:
//   ANTHROPIC_API_KEY   required
//   AI_VET_MODEL        optional, overrides the default working model

// From lib/supabase/admin, not lib/supabase/server: the scheduled re-screen
// reaches this file outside Next. See the note in lib/supabase/admin.ts.
import { createAdminClient } from "@/lib/supabase/admin";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

// Cheap and fast, for high volume classification such as sanctions triage.
export const MODEL_FAST = "claude-haiku-4-5-20251001";
// The working model for reasoning over a whole case.
export const MODEL_WORK = "claude-sonnet-4-6";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * A model call that never returns is worse than one that fails: sanctions
 * triage runs inline in a member's request, so a hung call would hold the
 * request open until the platform kills it, with no row written and no way to
 * tell what happened.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

export type AiCallOptions = {
  /** Short stable name, used for cost reporting. e.g. "verification_reconcile" */
  feature: string;
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  /** Low by default: these are analysis tasks, not creative ones. */
  temperature?: number;
  /** Who to bill the call to. Null for guests and system jobs. */
  userId?: string | null;
  /** What the call was for: a verification id, a listing id. */
  ref?: string | null;
  /** Hard ceiling on the call. Defaults to 60 seconds. */
  timeoutMs?: number;
};

export type AiResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
};

// Metering must never be the reason a feature breaks, so a failure to record
// is logged and swallowed. The call itself has already happened either way.
async function record(row: {
  user_id: string | null;
  feature: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  ok: boolean;
  error?: string | null;
  duration_ms: number;
  ref?: string | null;
}): Promise<void> {
  try {
    const sb = createAdminClient();
    await sb.from("ai_calls").insert(row);
  } catch (err) {
    console.error("[ponte] ai_calls insert failed:", (err as Error).message);
  }
}

/**
 * One AI call, metered. Throws on failure, after recording the failure.
 */
export async function callAi(opts: AiCallOptions): Promise<AiResult> {
  if (!isAiConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const model = opts.model || process.env.AI_VET_MODEL || MODEL_WORK;
  const started = Date.now();

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const durationMs = Date.now() - started;
    const aborted = (err as Error).name === "AbortError";
    await record({
      user_id: opts.userId ?? null,
      feature: opts.feature,
      model,
      input_tokens: 0,
      output_tokens: 0,
      ok: false,
      error: aborted ? `timeout after ${timeoutMs}ms` : `network: ${(err as Error).message}`,
      duration_ms: durationMs,
      ref: opts.ref ?? null,
    });
    throw aborted
      ? new Error(`AI call for ${opts.feature} timed out after ${timeoutMs}ms`)
      : err;
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - started;

  if (!res.ok) {
    const body = await res.text();
    // The body can echo the prompt, so keep only enough to diagnose, and never
    // log anything that could carry a key.
    const error = `http ${res.status}: ${body.slice(0, 200)}`;
    await record({
      user_id: opts.userId ?? null,
      feature: opts.feature,
      model,
      input_tokens: 0,
      output_tokens: 0,
      ok: false,
      error,
      duration_ms: durationMs,
      ref: opts.ref ?? null,
    });
    throw new Error(`AI call failed, ${error}`);
  }

  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text =
    (json.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim() || "";

  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;

  await record({
    user_id: opts.userId ?? null,
    feature: opts.feature,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ok: true,
    duration_ms: durationMs,
    ref: opts.ref ?? null,
  });

  return { text, model, inputTokens, outputTokens, durationMs };
}

/**
 * A metered call that must return JSON. The model is asked for raw JSON, and
 * a fenced block is tolerated because models add them.
 */
export async function callAiJson<T>(
  opts: AiCallOptions,
): Promise<{ data: T; usage: AiResult }> {
  const usage = await callAi({
    ...opts,
    system: `${opts.system}\n\nReturn raw JSON only. No prose, no code fence, no commentary.`,
  });

  const cleaned = usage.text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return { data: JSON.parse(cleaned) as T, usage };
  } catch {
    // Salvage the outermost object or array if the model wrapped it in prose.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return { data: JSON.parse(match[0]) as T, usage };
      } catch {
        /* fall through to the throw below */
      }
    }
    throw new Error(
      `AI returned unparseable JSON for ${opts.feature}: ${cleaned.slice(0, 160)}`,
    );
  }
}

/**
 * Total real token cost of everything done for one reference, for example a
 * whole verification. This is what validates credit pricing.
 */
export async function tokensForRef(ref: string): Promise<{
  calls: number;
  inputTokens: number;
  outputTokens: number;
}> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("ai_calls")
    .select("input_tokens, output_tokens")
    .eq("ref", ref);

  return (data ?? []).reduce(
    (acc, row: { input_tokens: number; output_tokens: number }) => ({
      calls: acc.calls + 1,
      inputTokens: acc.inputTokens + (row.input_tokens ?? 0),
      outputTokens: acc.outputTokens + (row.output_tokens ?? 0),
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0 },
  );
}
