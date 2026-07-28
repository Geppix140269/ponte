import { Link } from "@/i18n/navigation";
import CategoryLinks, { type CategoryLink } from "@/components/ponte/category/CategoryLinks";
import { MARKET_FAMILIES, PRODUCT_SECTORS } from "@/lib/taxonomy/market";
import { TRADE_SERVICE_CATEGORIES, serviceCategory } from "@/lib/taxonomy/services";
import { DISTRIBUTION_PARTNER_TYPES, partnerType } from "@/lib/taxonomy/distribution";
import type { FindQuery } from "@/lib/find/query";

/**
 * Structured filters over the Market Signals board.
 *
 * The board had none. It read the sixty most recent approved signals and
 * printed them, so the only way to find a signal about a particular market was
 * to read the list. That is workable at sixty and not at three thousand, and it
 * is the reason the requirement ties the category work to the inventory work:
 * a market has to be describable before it can be searched, and searchable
 * before the classification is worth anything.
 *
 * Every filter is a link carrying a canonical key, and the read behind it
 * filters at the database over the complete table rather than over the page.
 * The same keys the composer stores are the keys this filters on, which is the
 * whole contract.
 */

const FILTER_PARAMS = ["family", "serviceCategory", "partnerType", "sector", "territory"] as const;

/** The board URL for a query, keeping only the filters that are set. */
export function signalFilterHref(q: Partial<FindQuery>): string {
  const params = new URLSearchParams();
  for (const key of FILTER_PARAMS) {
    const value = q[key];
    if (value) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/market-signals?${qs}` : "/market-signals";
}

export default function SignalFilters({ q }: { q: FindQuery }) {
  const families: CategoryLink[] = MARKET_FAMILIES.map((family) => ({
    key: family.key,
    label: family.label,
    icon: family.icon,
    current: q.family === family.key,
    // Changing family clears the family-specific filters below it. Keeping a
    // freight category on a distribution search would be a filter nobody set.
    href: signalFilterHref({ family: family.key, territory: q.territory }),
  }));

  return (
    <div className="sigfilters">
      <CategoryLinks
        dense
        items={families.concat([
          {
            key: "__all",
            label: "Every market",
            current: q.family === null,
            href: signalFilterHref({ territory: q.territory }),
          },
        ])}
        legend="Filter by market"
        currentLabel="Filtering"
      />

      {q.family === "services" && (
        <CategoryLinks
          dense
          items={TRADE_SERVICE_CATEGORIES.map((category) => ({
            key: category.key,
            label: category.label,
            icon: category.icon,
            isOther: category.isOther,
            current: q.serviceCategory === category.key,
            href: signalFilterHref({
              family: "services",
              serviceCategory: category.key,
              territory: q.territory,
            }),
          }))}
          legend="Filter by trade service category"
          currentLabel="Filtering"
        />
      )}

      {q.family === "distribution" && (
        <CategoryLinks
          dense
          items={DISTRIBUTION_PARTNER_TYPES.map((type) => ({
            key: type.key,
            label: type.label,
            icon: type.icon,
            isOther: type.isOther,
            current: q.partnerType === type.key,
            href: signalFilterHref({
              family: "distribution",
              partnerType: type.key,
              territory: q.territory,
            }),
          }))}
          legend="Filter by partner type"
          currentLabel="Filtering"
        />
      )}

      {q.family === "products" && (
        <CategoryLinks
          dense
          items={PRODUCT_SECTORS.map((sector) => ({
            key: sector.key,
            label: sector.label,
            icon: sector.icon,
            current: q.sector === sector.key,
            href: signalFilterHref({
              family: "products",
              sector: sector.key,
              territory: q.territory,
            }),
          }))}
          legend="Filter by product sector"
          currentLabel="Filtering"
        />
      )}
    </div>
  );
}

/** The filters currently in force, in words, with a way to clear them. */
export function ActiveFilters({ q }: { q: FindQuery }) {
  const parts: string[] = [];
  if (q.family) {
    parts.push(MARKET_FAMILIES.find((f) => f.key === q.family)?.label ?? q.family);
  }
  if (q.serviceCategory) parts.push(serviceCategory(q.serviceCategory)?.label ?? q.serviceCategory);
  if (q.partnerType) parts.push(partnerType(q.partnerType)?.label ?? q.partnerType);
  if (q.sector) parts.push(PRODUCT_SECTORS.find((s) => s.key === q.sector)?.label ?? q.sector);
  if (q.territory) parts.push(q.territory);
  if (parts.length === 0) return null;

  return (
    <p className="mono" style={{ fontSize: 11, color: "var(--ink-3)", paddingBottom: 10 }}>
      {parts.join(" · ")}{" "}
      <Link href="/market-signals" style={{ color: "var(--gold-ink)" }}>
        Clear
      </Link>
    </p>
  );
}
