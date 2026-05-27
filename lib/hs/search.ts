import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/server";
import type { HSSchedule, HSSearchResult, MatchHSCodesRow } from "./types";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const GPT_MODEL = "gpt-4o";
const HIGH_CONFIDENCE = 0.82;
const MED_CONFIDENCE = 0.68;

async function embedQuery(query: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    input: query,
    model: EMBEDDING_MODEL,
  });
  return response.data[0].embedding;
}

async function vectorSearch(
  embedding: number[],
  schedule: HSSchedule | null,
  limit: number,
): Promise<MatchHSCodesRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_hs_codes", {
    query_embedding: embedding,
    schedule_filter: schedule ?? null,
    match_threshold: 0.45,
    match_count: limit,
  });
  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return (data as MatchHSCodesRow[]) ?? [];
}

async function disambiguateWithGPT(
  query: string,
  candidates: MatchHSCodesRow[],
): Promise<{ best_index: number; explanation: string }> {
  const candidateList = candidates
    .map((c, i) => `${i + 1}. [${c.code}] ${c.description} (${c.schedule})`)
    .join("\n");

  const prompt = `You are an expert customs classifier. A user is searching for the HS code for: "${query}"

The top candidate codes from the database are:
${candidateList}

Select the single best match. Reply with ONLY valid JSON in this exact format:
{"best_index": <1-based number>, "explanation": "<one sentence why>"}`;

  const response = await getOpenAI().chat.completions.create({
    model: GPT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 150,
  });

  const content = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    best_index: (parsed.best_index ?? 1) - 1,
    explanation: parsed.explanation ?? "",
  };
}

function getConfidence(similarity: number): HSSearchResult["confidence"] {
  if (similarity >= HIGH_CONFIDENCE) return "high";
  if (similarity >= MED_CONFIDENCE) return "medium";
  return "low";
}

export async function searchHSCodes(
  query: string,
  schedule: HSSchedule | null = null,
  limit: number = 5,
): Promise<{ results: HSSearchResult[]; usedGPT: boolean }> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return { results: [], usedGPT: false };

  const embedding = await embedQuery(trimmed);
  const candidates = await vectorSearch(
    embedding,
    schedule,
    Math.min(limit * 2, 20),
  );
  if (!candidates.length) return { results: [], usedGPT: false };

  const topSimilarity = candidates[0]?.similarity ?? 0;
  let usedGPT = false;
  let gptExplanation: string | undefined;
  let ranked = candidates;

  if (topSimilarity < HIGH_CONFIDENCE && candidates.length > 1) {
    usedGPT = true;
    try {
      const { best_index, explanation } = await disambiguateWithGPT(
        trimmed,
        candidates.slice(0, 8),
      );
      const best = candidates.splice(best_index, 1)[0];
      ranked = [best, ...candidates];
      gptExplanation = explanation;
    } catch (e) {
      console.error("GPT disambiguation failed:", e);
    }
  }

  const results: HSSearchResult[] = ranked.slice(0, limit).map((c, idx) => ({
    id: c.id,
    code: c.code,
    code_clean: "",
    schedule: c.schedule,
    level: c.level,
    chapter: c.chapter,
    chapter_desc: c.chapter_desc,
    heading: c.heading,
    heading_desc: c.heading_desc,
    subheading: null,
    subheading_desc: null,
    description: c.description,
    parent_code: null,
    notes: null,
    unit: c.unit,
    hs_version: "2022",
    is_active: true,
    similarity: c.similarity,
    confidence: getConfidence(c.similarity),
    used_gpt: usedGPT && idx === 0,
    gpt_explanation: idx === 0 ? gptExplanation : undefined,
  }));

  return { results, usedGPT };
}

export async function logSearch(
  userId: string,
  query: string,
  schedule: HSSchedule | null,
  topResult: HSSearchResult | null,
  usedGPT: boolean,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("hs_search_history").insert({
      user_id: userId,
      query,
      schedule,
      result_code: topResult?.code ?? null,
      used_gpt: usedGPT,
      confidence: topResult?.similarity ?? null,
    });
  } catch (e) {
    console.error("Failed to log HS search:", e);
  }
}
