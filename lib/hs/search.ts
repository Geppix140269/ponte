import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/server";
import type { HSSchedule, HSSearchResult } from "./types";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

const GPT_MODEL = "gpt-4o";

type SearchRow = {
  id: number;
  code: string;
  schedule: HSSchedule;
  level: number;
  chapter: string;
  chapter_desc: string | null;
  heading: string;
  heading_desc: string | null;
  description: string;
  unit: string | null;
};

async function ftsSearch(
  query: string,
  schedule: HSSchedule | null,
  limit: number,
): Promise<SearchRow[]> {
  const supabase = createAdminClient();

  let dbQuery = supabase
    .from("hs_codes")
    .select("id, code, schedule, level, chapter, chapter_desc, heading, heading_desc, description, unit")
    .eq("is_active", true)
    .textSearch("description", query, { type: "websearch", config: "english" })
    .limit(limit);

  if (schedule) dbQuery = dbQuery.eq("schedule", schedule);

  const { data, error } = await dbQuery;
  if (error) throw new Error(`Text search failed: ${error.message}`);
  if (data && data.length > 0) return data as SearchRow[];

  // If websearch returns nothing, fall back to a single-term plain search
  // using just the first meaningful word (handles compound phrases)
  const firstWord = query.split(/\s+/).find((w) => w.length > 3);
  if (!firstWord) return [];

  let fallbackQuery = supabase
    .from("hs_codes")
    .select("id, code, schedule, level, chapter, chapter_desc, heading, heading_desc, description, unit")
    .eq("is_active", true)
    .textSearch("description", firstWord, { type: "plain", config: "english" })
    .limit(limit);

  if (schedule) fallbackQuery = fallbackQuery.eq("schedule", schedule);

  const { data: fallbackData, error: fallbackError } = await fallbackQuery;
  if (fallbackError) throw new Error(`Text search failed: ${fallbackError.message}`);
  return (fallbackData as SearchRow[]) ?? [];
}

async function disambiguateWithGPT(
  query: string,
  candidates: SearchRow[],
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

export async function searchHSCodes(
  query: string,
  schedule: HSSchedule | null = null,
  limit: number = 5,
): Promise<{ results: HSSearchResult[]; usedGPT: boolean }> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return { results: [], usedGPT: false };

  const candidates = await ftsSearch(trimmed, schedule, Math.min(limit * 3, 20));
  if (!candidates.length) return { results: [], usedGPT: false };

  let usedGPT = false;
  let gptExplanation: string | undefined;
  let ranked = candidates;

  if (candidates.length > 1) {
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
    chapter_desc: c.chapter_desc ?? "",
    heading: c.heading,
    heading_desc: c.heading_desc ?? "",
    subheading: null,
    subheading_desc: null,
    description: c.description,
    parent_code: null,
    notes: null,
    unit: c.unit,
    hs_version: "2022",
    is_active: true,
    similarity: 0.75,
    confidence: "medium",
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
