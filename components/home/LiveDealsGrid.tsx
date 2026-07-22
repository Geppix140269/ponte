"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import LiveDealCard, { type DealLabels } from "./LiveDealCard";
import type { LiveDeal } from "@/lib/board/live-deals";

/**
 * A window onto the board: nine deals, filterable by category.
 *
 * The chips are built from the HS chapters actually present, not from a fixed
 * taxonomy. A category nobody is trading does not get a chip, so the filter
 * bar can never offer a click that leads to an empty grid. When the seed
 * import lands and metal scrap leads the board, a metal scrap chip appears on
 * its own.
 *
 * The only client component in the showcase, and only because filtering
 * without a round trip is the point. The deals are already in the payload
 * from the server render; this adds no fetch.
 */

const MAX_CARDS = 9;

export default function LiveDealsGrid({
  deals,
  labels,
  locale,
  allLabel,
  seeAllLabel,
}: {
  deals: LiveDeal[];
  labels: DealLabels;
  locale: string;
  allLabel: string;
  seeAllLabel: string;
}) {
  const [chapter, setChapter] = useState<string | null>(null);

  // Chapters in the order they first appear, which is newest-deal first, so
  // the busiest recent category leads the chips.
  const chapters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of deals) {
      if (d.chapter && !seen.has(d.chapter)) {
        seen.set(d.chapter, d.chapterTitle ?? `HS ${d.chapter}`);
      }
    }
    return Array.from(seen, ([code, title]) => ({ code, title }));
  }, [deals]);

  const shown = useMemo(() => {
    const filtered = chapter ? deals.filter((d) => d.chapter === chapter) : deals;
    return filtered.slice(0, MAX_CARDS);
  }, [deals, chapter]);

  return (
    <>
      {/* One chip is not a filter, it is a label. Below two categories the
          bar is noise and is left out. */}
      {chapters.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <FilterChip
            active={chapter === null}
            onClick={() => setChapter(null)}
            label={allLabel}
          />
          {chapters.map((c) => (
            <FilterChip
              key={c.code}
              active={chapter === c.code}
              onClick={() => setChapter(c.code)}
              label={c.title}
            />
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((deal) => (
          <LiveDealCard key={deal.id} deal={deal} labels={labels} locale={locale} />
        ))}
      </div>

      <div className="mt-7">
        <Link href="/marketplace" className="btn-primary">
          {seeAllLabel}
          <Icon name="chevron" size={16} />
        </Link>
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
        active
          ? "border-lime bg-lime text-obsidian"
          : "border-hairline bg-white/[0.06] text-slate hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
