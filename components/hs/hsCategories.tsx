import type { ReactNode } from "react";

/**
 * Tier 1 of the HS product drill: 15 friendly categories, each a proprietary
 * Ponte line icon over a span of HS chapters. Lifted verbatim from the approved
 * Structure & Submit design (Ponte_HS_Category_Icons_Extract_2026-07-25.html,
 * itself from the file Giuseppe signed off on 2026-07-24). Do not redraw the
 * icons or reword the labels here — this is the design, not a paraphrase.
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
};

export const HS_CATEGORIES: HsCategory[] = [
  {
    id: 0,
    label: "Agriculture & live animals",
    range: "HS 01–14",
    min: 1,
    max: 14,
    icon: (
      <>
        <path d="M12 21c0-5 0-9 5-13M12 21c0-5 0-8-4-11M12 21v-6" />
        <path d="M17 8c1-3 4-4 4-4s-1 4-4 5-4-1-4-1 1 0 4 0zM7 10C6 7 3 6 3 6s1 4 4 5" />
      </>
    ),
  },
  {
    id: 1,
    label: "Food, beverages & tobacco",
    range: "HS 15–24",
    min: 15,
    max: 24,
    icon: <path d="M6 3v8a2 2 0 0 0 2 2h0v8M8 3v6M4 3v6M18 3c-1 0-3 2-3 5s1 4 2 4v9" />,
  },
  {
    id: 2,
    label: "Minerals, ores & fuels",
    range: "HS 25–27",
    min: 25,
    max: 27,
    icon: (
      <>
        <path d="M12 3 3 9l9 12 9-12-9-6z" />
        <path d="M3 9h18M9 4l-2 5 5 12M15 4l2 5-5 12" />
      </>
    ),
  },
  {
    id: 3,
    label: "Chemicals & pharmaceuticals",
    range: "HS 28–38",
    min: 28,
    max: 38,
    icon: (
      <>
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        <path d="M7.5 14h9" />
      </>
    ),
  },
  {
    id: 4,
    label: "Plastics & rubber",
    range: "HS 39–40",
    min: 39,
    max: 40,
    icon: <path d="M4 8c4-5 12-5 16 0M4 8v8c4 5 12 5 16 0V8M4 12c4 5 12 5 16 0" />,
  },
  {
    id: 5,
    label: "Hides, leather & furs",
    range: "HS 41–43",
    min: 41,
    max: 43,
    icon: <path d="M5 4c3-1 4 2 7 2s4-3 7-2c1 4-1 6-1 9s2 5 0 7c-3 1-4-2-6-2s-3 3-6 2c-2-2 0-4 0-7S4 8 5 4z" />,
  },
  {
    id: 6,
    label: "Wood, paper & pulp",
    range: "HS 44–49",
    min: 44,
    max: 49,
    icon: (
      <>
        <path d="M3 7h18M3 7l4-4h10l4 4M3 7v10l4 4h10l4-4V7" />
        <path d="M8 7v14M16 7v14" />
      </>
    ),
  },
  {
    id: 7,
    label: "Textiles & apparel",
    range: "HS 50–63",
    min: 50,
    max: 63,
    icon: (
      <>
        <path d="M4 4h16v4l-4 2 4 2v8H4v-8l4-2-4-2V4z" />
        <path d="M8 4l4 4 4-4M8 20l4-4 4 4" />
      </>
    ),
  },
  {
    id: 8,
    label: "Footwear, headgear & accessories",
    range: "HS 64–67",
    min: 64,
    max: 67,
    icon: (
      <>
        <path d="M3 8v6h13c3 0 5 2 5 2V8s-2-2-5-2c-2 0-3 1-5 1S6 6 3 8z" />
        <path d="M3 14h18" />
      </>
    ),
  },
  {
    id: 9,
    label: "Stone, ceramics & glass",
    range: "HS 68–70",
    min: 68,
    max: 70,
    icon: (
      <>
        <path d="M12 3l8 5v8l-8 5-8-5V8l8-5z" />
        <path d="M12 3v18M4 8l8 4 8-4" />
      </>
    ),
  },
  {
    id: 10,
    label: "Metals & metal products",
    range: "HS 72–83",
    min: 72,
    max: 83,
    icon: (
      <>
        <path d="M2 8l4-4h8l4 4-4 4H6L2 8zM6 12v8h8v-8" />
        <path d="M10 4v4M14 12v8" />
      </>
    ),
  },
  {
    id: 11,
    label: "Machinery & electronics",
    range: "HS 84–85",
    min: 84,
    max: 85,
    icon: (
      <>
        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
  },
  {
    id: 12,
    label: "Vehicles & transport",
    range: "HS 86–89",
    min: 86,
    max: 89,
    icon: (
      <>
        <path d="M3 13l2-5h10l3 5M3 13h16v4H3v-4z" />
        <circle cx="7" cy="17" r="1.6" />
        <circle cx="15" cy="17" r="1.6" />
      </>
    ),
  },
  {
    id: 13,
    label: "Instruments, medical & precision",
    range: "HS 90",
    min: 90,
    max: 90,
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
        <path d="M12 12l4-3M12 12v5" />
      </>
    ),
  },
  {
    id: 14,
    label: "Miscellaneous, arms & art",
    range: "HS 93–97",
    min: 93,
    max: 97,
    icon: (
      <>
        <path d="M4 8l8-5 8 5-8 5-8-5z" />
        <path d="M4 8v8l8 5 8-5V8" />
        <path d="M12 13v8" />
      </>
    ),
  },
];

/** True when a 2-digit chapter code ("01".."97") falls inside a category. */
export function chapterInCategory(chapter: string, cat: HsCategory): boolean {
  const n = parseInt(chapter, 10);
  return Number.isFinite(n) && n >= cat.min && n <= cat.max;
}

/**
 * The 15-tile category grid (Tier 1). Box-free by construction: the hairline
 * grid comes from a 1px background gap, never a rounded card. Presentational —
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
