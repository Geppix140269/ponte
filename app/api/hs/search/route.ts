import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { searchHSCodes, logSearch } from "@/lib/hs/search";
import type { HSSearchRequest, HSSearchResponse } from "@/lib/hs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fire-and-forget — don't await
    logSearch(user.id, query.trim(), schedule, results[0] ?? null, usedGPT);

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
