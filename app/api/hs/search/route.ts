import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  searchHsCodes,
  getHsCode,
  listHsChapters,
  listHeadingsInChapter,
  listHsCodesInHeading,
} from "@/lib/hs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HS 2022 lookup for the composer and the board filters.
 *
 * Open to anonymous callers by design. The composer is anonymous until the
 * Publish gate, and published nomenclature is not a secret: it is the same
 * list the WCO puts on its website.
 *
 *   GET /api/hs/search?q=sugar        ranked search, the typing fallback
 *   GET /api/hs/search?chapters=1     the 97 chapters, for the tile grid
 *   GET /api/hs/search?chapter=17     the headings inside one chapter
 *   GET /api/hs/search?heading=1701   the codes inside one heading
 *   GET /api/hs/search?code=170199    one code with its WCO unit
 *
 * Cached at the edge: the answer for a given query is identical for every
 * visitor and changes only when an HS edition does.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  // Generous. A member tapping through the tile grid fires several of these
  // in a few seconds and must never meet a limit while doing it.
  if (!checkRateLimit(`hs:${ip}`, 240, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many lookups." }, { status: 429 });
  }

  const params = req.nextUrl.searchParams;
  const headers = { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" };

  if (params.get("chapters") !== null) {
    return NextResponse.json({ chapters: await listHsChapters() }, { headers });
  }

  const chapter = params.get("chapter");
  if (chapter) {
    return NextResponse.json({ headings: await listHeadingsInChapter(chapter) }, { headers });
  }

  const heading = params.get("heading");
  if (heading) {
    return NextResponse.json({ codes: await listHsCodesInHeading(heading) }, { headers });
  }

  // A single code, with its WCO unit, so the composer can prefill the unit chip
  // from the chosen product.
  const code = params.get("code");
  if (code) {
    return NextResponse.json({ code: await getHsCode(code.replace(/\D/g, "")) }, { headers });
  }

  const q = (params.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) {
    return NextResponse.json({ codes: [] }, { headers });
  }

  const limit = Math.min(Number(params.get("limit")) || 20, 50);
  return NextResponse.json({ codes: await searchHsCodes(q, limit) }, { headers });
}
