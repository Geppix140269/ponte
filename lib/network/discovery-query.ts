// Pure parsing of discovery filters from URL params. No I/O.
import type { DiscoveryQuery, DiscoverRole } from "@/lib/network/discovery";

const clean = (v?: string) => { const t = (v ?? "").trim(); return t.length ? t : undefined; };

export function parseDiscoveryQuery(raw: Record<string, string | undefined>): DiscoveryQuery {
  const role: DiscoverRole = raw.role === "buyers" ? "buyers" : "suppliers";
  const q: DiscoveryQuery = { role, commodity: clean(raw.commodity), hsCode: clean(raw.hsCode), country: clean(raw.country) };
  const min = Number(raw.minShipments);
  if (Number.isFinite(min) && min > 0) q.minShipments = Math.floor(min);
  const lim = Number(raw.limit);
  q.limit = Number.isFinite(lim) && lim > 0 ? Math.min(50, Math.floor(lim)) : 8;
  return q;
}
