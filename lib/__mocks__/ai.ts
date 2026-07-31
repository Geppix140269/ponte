// Test double for @/lib/ai.
//
// No model is called and no key is needed. A test installs the JSON the model
// would have returned and the double hands it back through the real
// callAi/callAiJson shapes, so the code under test parses and validates the
// answer exactly as it does in production.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const MODEL_FAST = "mock-fast";
export const MODEL_WORK = "mock-work";

export type SystemBlock = { text: string; cache?: boolean };
export type UserBlock = { type: string; [key: string]: any };

export type AiCallOptions = {
  feature: string;
  system: string | SystemBlock[];
  user: string | UserBlock[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string | null;
  ref?: string | null;
  [key: string]: any;
};

export type AiResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type AiCallRecord = { feature: string; model?: string; ref?: string | null };

export const aiCalls: AiCallRecord[] = [];

let nextText = "{}";

/** Install the raw text the next model call returns, and clear the log. */
export function __resetAi(json?: unknown): void {
  aiCalls.length = 0;
  nextText = json === undefined ? "{}" : JSON.stringify(json);
}

export function isAiConfigured(): boolean {
  return true;
}

export async function callAi(opts: AiCallOptions): Promise<AiResult> {
  aiCalls.push({ feature: opts.feature, model: opts.model, ref: opts.ref ?? null });
  return {
    text: nextText,
    model: opts.model ?? MODEL_WORK,
    inputTokens: 100,
    outputTokens: 50,
    durationMs: 1,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}

export async function callAiJson<T>(
  opts: AiCallOptions,
): Promise<{ data: T; usage: AiResult }> {
  const usage = await callAi(opts);
  return { data: JSON.parse(usage.text) as T, usage };
}

export async function tokensForRef(ref: string): Promise<{
  calls: number;
  inputTokens: number;
  outputTokens: number;
}> {
  void ref;
  return { calls: aiCalls.length, inputTokens: 0, outputTokens: 0 };
}
