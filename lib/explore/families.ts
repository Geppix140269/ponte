import {
  breakdown,
  inChapterRange,
  type ActivityBreakdown,
  type ActivityItem,
} from "../board/activity-logic";

/**
 * The Explore market universe: three families, and the counts under them.
 *
 * Pure. It is handed the merged activity stream and the sector definitions (the
 * approved HS categories, which stay the single source of truth in
 * components/hs/hsCategories.tsx and are passed in rather than re-declared
 * here), and it returns counts. No query, no React, so the counting rules are
 * unit-tested directly and the page stays a thin shell over two bounded reads.
 *
 * Honesty rules encoded here, not left to the template:
 *   - a sector count is a count of market records, never of verified or
 *     reviewed opportunities;
 *   - Trade services counts member service records only, because desk_radar
 *     carries no service classification and a signal cannot be counted as one;
 *   - Distribution and representation returns no count at all, because no
 *     record in this repository is classified as one. An honest absence beats
 *     an invented zero dressed up as a category.
 */

export type FamilyKey = "products" | "services" | "distribution";

export const FAMILY_KEYS: readonly FamilyKey[] = ["products", "services", "distribution"];

/** The minimum a sector definition must provide: an id and a chapter span. */
export interface SectorSpan {
  id: number;
  min: number;
  max: number;
}

export interface SectorCount<S extends SectorSpan = SectorSpan> {
  sector: S;
  counts: ActivityBreakdown;
}

/**
 * Counts per sector, in the order the sectors were given.
 *
 * One pass per sector over an in-memory array that is already capped by
 * ACTIVITY_SOURCE_CAP: no query per category, which is the constraint the North
 * Star performance section names explicitly.
 */
export function sectorCounts<S extends SectorSpan>(
  items: ActivityItem[],
  sectors: readonly S[],
): SectorCount<S>[] {
  return sectors.map((sector) => ({
    sector,
    counts: breakdown(inChapterRange(items, sector.min, sector.max)),
  }));
}

export interface FamilyCounts {
  /**
   * Product records: everything that is not a service.
   *
   * Deliberately NOT "records carrying an HS chapter". Imported Market Signals
   * have no HS code at all (the importer records `hs_code: null` because the
   * source has no clean HS column), so counting only chaptered records printed
   * "Products 0" directly above "Market activity 40" on the same screen. Both
   * numbers were individually defensible and the pair was nonsense. A record
   * about a physical good is a product record whether or not anyone has yet
   * mapped it to a chapter.
   */
  products: number;
  /** Member service records. */
  services: number;
  /**
   * Product records that no sector can claim, because they carry no HS
   * chapter. Surfaced so a sector universe reading zero next to a non-zero
   * product count explains itself instead of looking broken.
   */
  unclassified: number;
  /**
   * Null, always, in this phase: nothing in the schema classifies a record as a
   * distribution or representation opportunity. Null means "not counted", which
   * a surface must render as an absence of a count, never as zero.
   */
  distribution: null;
}

export function familyCounts(items: ActivityItem[]): FamilyCounts {
  let products = 0;
  let services = 0;
  let unclassified = 0;
  for (const item of items) {
    if (item.kind === "service_requirement") {
      services++;
      continue;
    }
    products++;
    if (!item.chapter) unclassified++;
  }
  return { products, services, unclassified, distribution: null };
}

/** The sectors that actually have records, most active first, for "popular areas". */
export function busiestSectors<S extends SectorSpan>(
  items: ActivityItem[],
  sectors: readonly S[],
  limit: number,
): SectorCount<S>[] {
  return sectorCounts(items, sectors)
    .filter((s) => s.counts.total > 0)
    .sort((a, b) => {
      const delta = b.counts.total - a.counts.total;
      return delta !== 0 ? delta : a.sector.id - b.sector.id;
    })
    .slice(0, limit);
}

/** The activity belonging to one family, for a family or sector listing. */
export function itemsInFamily(items: ActivityItem[], family: FamilyKey): ActivityItem[] {
  if (family === "services") return items.filter((i) => i.kind === "service_requirement");
  // Products is every non-service record, chaptered or not, for the same
  // reason familyCounts counts them that way.
  if (family === "products") return items.filter((i) => i.kind !== "service_requirement");
  return [];
}

export function isFamilyKey(value: unknown): value is FamilyKey {
  return typeof value === "string" && (FAMILY_KEYS as readonly string[]).includes(value);
}
