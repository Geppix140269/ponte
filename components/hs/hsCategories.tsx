import type { ReactNode } from "react";
import { PRODUCT_SECTORS } from "@/lib/taxonomy/market";
import type { FlowIconKey, FlowLabelledKey } from "@/design-system/ponte-flow/generated/flow-icon-keys";

/**
 * Tier 1 of the HS product drill: 15 friendly categories, each a proprietary
 * Ponte line icon over a span of HS chapters. Lifted verbatim from the approved
 * Structure & Submit design (Ponte_HS_Category_Icons_Extract_2026-07-25.html,
 * itself from the file Giuseppe signed off on 2026-07-24). Do not redraw the
 * icons or reword the labels here. This is the design, not a paraphrase.
 *
 * Single source of truth so both pickers (Structure's HsDrill and Find's
 * HsProductPicker) share one copy of the icons and one chapter-range map.
 *
 * Note: the ranges below are the approved map exactly as given. They leave a
 * handful of chapters (71 pearls/precious stones & metals, 91-92) outside every
 * category; those remain reachable through the search fallback, never lost.
 */
export type HsCategory = {
  /** data-cat index from the design export, kept for traceability. */
  id: number;
  label: string;
  /** Display range, e.g. "HS 01–14". */
  range: string;
  /** Inclusive 2-digit chapter bounds used to filter the chapter list. */
  min: number;
  max: number;
  icon: ReactNode;
  /** Stable taxonomy key. Prefer this over `id` in new code. */
  key: string;
  /**
   * The sector's Ponte Flow asset, for surfaces built on the design system.
   * Narrowed to the decorative keys: a sector icon always sits beside its own
   * visible name, so it must never be one that carries meaning alone.
   */
  flowIcon: Exclude<FlowIconKey, FlowLabelledKey>;
};

/**
 * The approved drawings, in taxonomy order. These are the icons signed off on
 * 2026-07-24 and used by the two HS pickers; they are NOT the Ponte Flow
 * sector assets, which are referenced by `flowIcon` and rendered through
 * PonteIcon on the design-system surfaces.
 */
const SECTOR_DRAWINGS: ReactNode[] = [
  (
      <>
        <path d="M12 21c0-5 0-9 5-13M12 21c0-5 0-8-4-11M12 21v-6" />
        <path d="M17 8c1-3 4-4 4-4s-1 4-4 5-4-1-4-1 1 0 4 0zM7 10C6 7 3 6 3 6s1 4 4 5" />
      </>
    ),
  <path d="M6 3v8a2 2 0 0 0 2 2h0v8M8 3v6M4 3v6M18 3c-1 0-3 2-3 5s1 4 2 4v9" />,
  (
      <>
        <path d="M12 3 3 9l9 12 9-12-9-6z" />
        <path d="M3 9h18M9 4l-2 5 5 12M15 4l2 5-5 12" />
      </>
    ),
  (
      <>
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        <path d="M7.5 14h9" />
      </>
    ),
  <path d="M4 8c4-5 12-5 16 0M4 8v8c4 5 12 5 16 0V8M4 12c4 5 12 5 16 0" />,
  <path d="M5 4c3-1 4 2 7 2s4-3 7-2c1 4-1 6-1 9s2 5 0 7c-3 1-4-2-6-2s-3 3-6 2c-2-2 0-4 0-7S4 8 5 4z" />,
  (
      <>
        <path d="M3 7h18M3 7l4-4h10l4 4M3 7v10l4 4h10l4-4V7" />
        <path d="M8 7v14M16 7v14" />
      </>
    ),
  (
      <>
        <path d="M4 4h16v4l-4 2 4 2v8H4v-8l4-2-4-2V4z" />
        <path d="M8 4l4 4 4-4M8 20l4-4 4 4" />
      </>
    ),
  (
      <>
        <path d="M3 8v6h13c3 0 5 2 5 2V8s-2-2-5-2c-2 0-3 1-5 1S6 6 3 8z" />
        <path d="M3 14h18" />
      </>
    ),
  (
      <>
        <path d="M12 3l8 5v8l-8 5-8-5V8l8-5z" />
        <path d="M12 3v18M4 8l8 4 8-4" />
      </>
    ),
  (
      <>
        <path d="M2 8l4-4h8l4 4-4 4H6L2 8zM6 12v8h8v-8" />
        <path d="M10 4v4M14 12v8" />
      </>
    ),
  (
      <>
        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
  (
      <>
        <path d="M3 13l2-5h10l3 5M3 13h16v4H3v-4z" />
        <circle cx="7" cy="17" r="1.6" />
        <circle cx="15" cy="17" r="1.6" />
      </>
    ),
  (
      <>
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
        <path d="M12 12l4-3M12 12v5" />
      </>
    ),
  (
      <>
        <path d="M4 8l8-5 8 5-8 5-8-5z" />
        <path d="M4 8v8l8 5 8-5V8" />
        <path d="M12 13v8" />
      </>
    )
];

/**
 * Tier 1 of the HS product drill, derived from the canonical taxonomy.
 *
 * Label, range and chapter bounds come from lib/taxonomy/market.ts and are no
 * longer restated here: product-authority finding F3 makes an independently
 * written taxonomy a defect even when its contents happen to match. This file
 * now owns exactly one thing, the drawings.
 *
 * `id` stays the array index because it is in shipped URLs (/explore?sector=3).
 */
export const HS_CATEGORIES: HsCategory[] = PRODUCT_SECTORS.map((sector, i) => ({
  id: i,
  key: sector.key,
  label: sector.label,
  range: sector.range,
  min: sector.min,
  max: sector.max,
  flowIcon: sector.icon,
  icon: SECTOR_DRAWINGS[i],
}));


/** True when a 2-digit chapter code ("01".."97") falls inside a category. */
export function chapterInCategory(chapter: string, cat: HsCategory): boolean {
  const n = parseInt(chapter, 10);
  return Number.isFinite(n) && n >= cat.min && n <= cat.max;
}

/**
 * The 15-tile category grid (Tier 1). Box-free by construction: the hairline
 * grid comes from a 1px background gap, never a rounded card. Presentational:
 * the caller decides what a tap does (narrow to that category's chapters).
 */
export function HsCategoryGrid({
  onPick,
  ariaLabel,
}: {
  onPick: (cat: HsCategory) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="hs__grid" role="group" aria-label={ariaLabel}>
      {HS_CATEGORIES.map((cat) => (
        <button key={cat.id} type="button" className="hs__tile" onClick={() => onPick(cat)}>
          <svg viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {cat.icon}
          </svg>
          <span className="t">{cat.label}</span>
          <span className="n">{cat.range}</span>
        </button>
      ))}
    </div>
  );
}
