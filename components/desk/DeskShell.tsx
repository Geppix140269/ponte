import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import JourneyRail from "./JourneyRail";
import type { Rail } from "@/lib/desk/journey";

/**
 * The Desk page system: one global command bar, an optional journey rail, and
 * the work surface.
 *
 * The two chromes are deliberately different systems and are meant to be
 * unmistakable for one another:
 *
 *   The COMMAND BAR is paper, horizontal, sticky, and carries navigation. It is
 *   where Market, Explore, Start a deal and About live, because those are
 *   places in the product.
 *
 *   The RAIL is ink, vertical, and carries journey positions only. It never
 *   contains account, profile, settings, notifications, Explore, workspace
 *   links, help, administration or any other product destination, and its
 *   stations are not links. A screen with no journey passes `rail={null}` and
 *   gets no rail at all, which is the landing page's whole point: nothing has
 *   started, so there is no position to show.
 *
 * The objective slot states what the member asked for, when they asked for
 * something. It renders nothing when no objective was stated, rather than a
 * placeholder that would read as one.
 */

/**
 * Navigation, and only to surfaces that are in the Desk system.
 *
 * `/explore` is deliberately absent. It still exists and is still reachable
 * from the legacy application, but it renders the pre-Desk chrome, and sending
 * a visitor from a Desk page straight into it is the seam this navigation is
 * responsible for not creating. It returns when Explore is rebuilt on the Desk,
 * which is not this slice.
 */
export type DeskNavKey = "market" | "deal" | "records" | "about";

const NAV: { key: DeskNavKey; label: string; href: string }[] = [
  { key: "market", label: "Market Signals", href: "/market-signals" },
  { key: "deal", label: "Start a deal", href: "/structure" },
  // A member's own records. Owner-scoped and signed-out safe: it explains
  // itself rather than 404ing or bouncing a visitor to a login wall.
  { key: "records", label: "Your records", href: "/opportunities" },
  { key: "about", label: "How Ponte works", href: "/about" },
];

function Lockup() {
  return (
    <Link className="cmd__lockup" href="/" aria-label="Ponte Trade, home">
      <span className="cmd__chip">
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <path
            d="M22 98 L22 60 C22 35 98 35 98 60 L98 98"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinejoin="miter"
          />
          <line x1="12" y1="98" x2="108" y2="98" stroke="currentColor" strokeWidth="5" />
          <circle className="cmd__dot" cx="60" cy="41" r="10" />
        </svg>
      </span>
      <span className="cmd__word serif">Ponte</span>
      <span className="cmd__tld">.trade</span>
    </Link>
  );
}

export interface DeskShellProps {
  children: ReactNode;
  /** The journey position, or null for a screen that has no journey. */
  rail?: Rail | null;
  /** Which navigation entry is the current place in the product. */
  current?: DeskNavKey;
  /** The objective the member actually stated. Omitted when they stated none. */
  objective?: string | null;
}

export default function DeskShell({ children, rail, current, objective }: DeskShellProps) {
  const stated = objective?.trim();

  return (
    <>
      <header className="cmd">
        <Lockup />

        {stated ? (
          <Link className="cmd__obj" href="/">
            <span>Objective</span>
            <b>{stated}</b>
            <span className="cmd__k">Edit</span>
          </Link>
        ) : null}

        <nav className="cmd__nav" aria-label="Ponte Trade">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              {...(current === item.key ? { "aria-current": "page" as const } : {})}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className={`dk-app${rail ? "" : " dk-app--norail"}`}>
        {rail ? <JourneyRail rail={rail} /> : null}
        {/* The one <main> landmark on the page. ChromeGate drops the app's
            shared wrapper on these routes precisely so this is the only one. */}
        <main className="dk-main">{children}</main>
      </div>
    </>
  );
}
