import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { searchHSCodes, logSearch } from "@/lib/hs/search";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { HSSearchRequest, HSSearchResponse } from "@/lib/hs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit: 30 searches per IP per hour. Plenty for genuine browsing,
// caps OpenAI cost exposure from abuse. Tune via env if needed.
const SEARCH_LIMIT = Number(process.env.HS_SEARCH_RATE_LIMIT) || 30;
const SEARCH_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Public endpoint (auth-optional). Anonymous users on a product page can
  // search for their HS code without signing in. We still log the search
  // against the user if they happen to be logged in.
  const ip = getClientIp(req);
  if (!checkRateLimit(`hs-search:${ip}`, SEARCH_LIMIT, SEARCH_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many searches. Please try again later." },
      { status: 429 },
    );
  }

  let body: HSSearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, schedule = null, limit = 5 } = body;

  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return NextResponse.json(
      { error: "query must be at least 2 characters" },
      { status: 400 },
    );
  }

  const validSchedules = ["WCO", "US_HTS", "EU_TARIC", "UK_GTT", null];
  if (!validSchedules.includes(schedule)) {
    return NextResponse.json(
      { error: "Invalid schedule. Must be WCO | US_HTS | EU_TARIC | UK_GTT | null" },
      { status: 400 },
    );
  }

  const clampedLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);

  try {
    const { results, usedGPT } = await searchHSCodes(
      query.trim(),
      schedule,
      clampedLimit,
    );

    // Fire-and-forget log. Anonymous searches are not logged because the
    // schema requires a user_id. (Worth revisiting if we want anonymous
    // analytics — would need to relax the schema.)
    const user = await getUser();
    if (user) {
      logSearch(user.id, query.trim(), schedule, results[0] ?? null, usedGPT);
    }

    const response: HSSearchResponse = {
      results,
      query: query.trim(),
      schedule,
      used_gpt: usedGPT,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[hs/search] Error:", err);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 },
    );
  }
}
