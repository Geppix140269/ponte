import { NextResponse, type NextRequest } from "next/server";
import { getFxRate } from "@/lib/datasources";

/*
 * GET /api/data/fx?base=USD&quote=EUR
 *
 * Left open rather than behind sign in. Both providers behind it are key free
 * public endpoints, the answer is cached for a day, so the second request for
 * a pair and every one after it is served from Supabase rather than from
 * somebody else's free service. There is no key here to leak and no member
 * data in the response.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const base = params.get("base") ?? "USD";
  const quote = params.get("quote") ?? "EUR";

  const result = await getFxRate(base, quote);

  if (!result.ok) {
    // 502, not 500. The fault is upstream, and a monitor should be able to
    // tell "their service is down" from "our code threw".
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json(result, {
    headers: {
      // Stale answers must not be cached at the edge as though they were
      // current, or the staleness outlives the outage that caused it.
      "Cache-Control": result.stale
        ? "no-store"
        : "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
