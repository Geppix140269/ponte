import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { checkHealth } from "@/lib/datasources";

/*
 * GET /api/data/health
 *
 * Admin only. The report names every upstream this platform depends on and
 * whether its key is set, which is a map of our supply chain and not something
 * to hand out. A non admin gets 404 rather than 403, so the route does not
 * confirm its own existence to someone probing.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const reports = await checkHealth();
  const failing = reports.filter((r) => r.status === "failing").length;

  return NextResponse.json(
    {
      ok: failing === 0,
      checked: reports.length,
      failing,
      sources: reports,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
