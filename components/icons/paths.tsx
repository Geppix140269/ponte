import type { ReactNode } from "react";

/**
 * The proprietary Ponte icon set, transcribed from the `<symbol>` definitions
 * in design_handoff_ponte/Brand Book.dc.html (ids `s-*` and `pf-*`, mirrored
 * in Ponte Trade.dc.html as `ic-*` and `ic-pf-*`).
 *
 * Every icon is drawn on a 24x24 grid with `fill: none`, `stroke:
 * currentColor`, 1.8px stroke and round caps and joins. The geometry is built
 * on the bridge motif: two piers and an arc span, with a raised node mid-span
 * where an intermediary sits. This path data is brand IP. It is not a
 * third-party set and must not be swapped for one.
 *
 * Path data only. The renderer lives in ./index.tsx.
 */

export const SYSTEM_ICON_PATHS = {
  home: (
    <>
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
    </>
  ),
  board: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  verify: (
    <>
      <path d="M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  bridge: (
    <>
      <path d="M3 18V9" />
      <path d="M21 18V9" />
      <path d="M3 12.5c6-7 12-7 18 0" />
      <path d="M3 18h18" />
      <path d="M9 18v-4M15 18v-4" />
    </>
  ),
  room: (
    <>
      <circle cx="5" cy="15" r="2.2" />
      <circle cx="19" cy="15" r="2.2" />
      <path d="M6.6 13.4C9 9 15 9 17.4 13.4" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13l2.4-7h11.2L20 13v5H4z" />
      <path d="M4 13h5l1.5 2h3L15 13h5" />
    </>
  ),
  alert: (
    <>
      <path d="M6 16v-5a6 6 0 1112 0v5l2 2H4z" />
      <path d="M10 20a2 2 0 004 0" />
    </>
  ),
  credit: <path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" />,
  ai: (
    <>
      <path d="M11 3l2 5.2L18 10l-5 1.8L11 17l-2-5.2L4 10l5-1.8z" />
      <path d="M18 15l.9 2.3L21 18l-2.1.7L18 21l-.9-2.3L15 18l2.1-.7z" />
    </>
  ),
  post: <path d="M12 5v14M5 12h14" />,
  offer: (
    <>
      <path d="M4 15c4-8 10-8 14 0" />
      <path d="M14 5l4 1 -1 4" />
    </>
  ),
  request: (
    <>
      <path d="M20 9c-4 8-10 8-14 0" />
      <path d="M10 19l-4-1 1-4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c3 3.2 3 15 0 18M12 3c-3 3.2-3 15 0 18" />
    </>
  ),
  scan: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" strokeDasharray="4 4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  registry: (
    <>
      <path d="M4 20h16" />
      <path d="M6 20V9l6-4 6 4v11" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  tag: (
    <>
      <path d="M4 12V5h7l8 8-7 7z" />
      <circle cx="8" cy="9" r="1.3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  check: <path d="M5 12l4.5 4.5L19 6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M8 11l4 4 4-4" />
      <path d="M5 20h14" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.1 10.9 15.9 7.1M8.1 13.1 15.9 16.9" />
    </>
  ),

  /* ---- Extensions beyond the handoff bundle ----
     The book's 26 glyphs do not include a menu or a close, and the header
     needs both. Drawn to the same rules (24 grid, 1.8px, round caps) rather
     than pulled from a third-party set, which the UI brief rules out. Flag
     them to the design side at the next review so they can be adopted or
     redrawn. */
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
} satisfies Record<string, ReactNode>;

export const PROFILE_ICON_PATHS = {
  manufacturer: (
    <>
      <path d="M3 20V11l5 3V11l5 3V10l6 3v7z" />
      <path d="M3 20h18" />
      <path d="M7 17h1.5M11.5 17h1.5" />
    </>
  ),
  producer: (
    <>
      <path d="M12 21V10" />
      <path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z" />
      <path d="M12 17c0-3-2-5-6-5 0 3 2 5 6 5z" />
    </>
  ),
  trader: (
    <>
      <path d="M4 9h13" />
      <path d="M14 6l3 3-3 3" />
      <path d="M20 15H7" />
      <path d="M10 12l-3 3 3 3" />
    </>
  ),
  distributor: (
    <>
      <rect x="9" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M12 9v3M6 15v-1.5A1.5 1.5 0 017.5 12h9a1.5 1.5 0 011.5 1.5V15" />
    </>
  ),
  importer: (
    <>
      <path d="M4 14v4a1 1 0 001 1h14a1 1 0 001-1v-4" />
      <path d="M12 4v9" />
      <path d="M8.5 9.5 12 13l3.5-3.5" />
    </>
  ),
  exporter: (
    <>
      <path d="M4 14v4a1 1 0 001 1h14a1 1 0 001-1v-4" />
      <path d="M12 13V4" />
      <path d="M8.5 7.5 12 4l3.5 3.5" />
    </>
  ),
  broker: (
    <>
      <circle cx="4" cy="16" r="2" />
      <circle cx="20" cy="16" r="2" />
      <circle cx="12" cy="7" r="2" />
      <path d="M5.6 14.6 10.4 8.4" />
      <path d="M13.6 8.4 18.4 14.6" />
    </>
  ),
  agency: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <circle cx="12" cy="12.5" r="2.2" />
      <path d="M10.5 14.4 10 18l2-1.1 2 1.1-.5-3.6" />
    </>
  ),
  service: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" />
    </>
  ),
  logistics: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h3.5L21 13v3h-7" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </>
  ),
  inspection: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.2-4.2" />
      <path d="M8.6 11l1.8 1.8L14 9.4" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="6" width="18" height="11" rx="2" />
      <circle cx="12" cy="11.5" r="2.4" />
      <path d="M6.5 9v5M17.5 9v5" />
    </>
  ),
  customs: (
    <>
      <path d="M4 21V8h2v13" />
      <path d="M6 9l13-3v3.2L6 12.2z" />
      <path d="M3 21h8" />
    </>
  ),
  warehouse: (
    <>
      <path d="M3 21V9l9-4 9 4v12z" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 17h6" />
    </>
  ),
  insurance: (
    <>
      <path d="M12 4a8 8 0 018 8H4a8 8 0 018-8z" />
      <path d="M12 4V3" />
      <path d="M12 12v5a2 2 0 01-4 0" />
    </>
  ),
  chamber: (
    <>
      <path d="M3 9l9-5 9 5" />
      <path d="M3 9h18" />
      <path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8" />
      <path d="M3 20h18" />
    </>
  ),
  authority: (
    <>
      <path d="M6 21V4l11 2.5L6 9" />
      <path d="M6 21h7" />
    </>
  ),
} satisfies Record<string, ReactNode>;

/**
 * The labels the brand book prints under each glyph. Kept here so the design
 * sample page and any picker UI name an icon the same way the book does.
 * These are design-system labels, not product copy, so they are not
 * translated.
 */
export const SYSTEM_ICON_LABELS: Record<keyof typeof SYSTEM_ICON_PATHS, string> = {
  home: "Home",
  board: "Board",
  verify: "Verify",
  bridge: "Bridge",
  room: "Deal room",
  inbox: "Inbox",
  alert: "Alerts",
  credit: "Credits",
  ai: "AI match",
  post: "Post",
  offer: "Offer",
  request: "Request",
  globe: "Global",
  scan: "Sanctions",
  registry: "Registry",
  tag: "HS code",
  search: "Search",
  filter: "Filter",
  lock: "Private",
  check: "Verified",
  chevron: "More",
  user: "Company",
  doc: "Document",
  clock: "Validity",
  download: "Export",
  share: "Share",
  menu: "Menu",
  close: "Close",
};

export const PROFILE_ICON_LABELS: Record<keyof typeof PROFILE_ICON_PATHS, string> = {
  manufacturer: "Maker",
  producer: "Producer",
  trader: "Trader",
  distributor: "Distributor",
  importer: "Buyer",
  exporter: "Seller",
  broker: "Broker",
  agency: "Agency",
  service: "Service",
  logistics: "Logistics",
  inspection: "Inspection",
  finance: "Finance",
  customs: "Customs",
  warehouse: "Warehouse",
  insurance: "Insurance",
  chamber: "Chamber",
  authority: "Authority",
};
