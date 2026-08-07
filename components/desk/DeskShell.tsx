import { Suspense, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import JourneyRail from "./JourneyRail";
import ThemeToggle from "@/components/desk/ThemeToggle";
import DeskAccount from "./DeskAccount";
import PonteLockup from "@/components/ponte/brand/PonteLockup";
import type { Rail } from "@/lib/desk/journey";
import { PRIMARY_NAV, type PrimaryNavKey } from "@/lib/nav/primary";

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
 * Navigation is no longer decided here.
 *
 * Two earlier notes lived at this point and both are now wrong, so they are
 * replaced rather than left to mislead. One explained that `/explore` was
 * deliberately absent "until Explore is rebuilt on the Desk". The other
 * recorded that "Start a deal" had been removed because it pointed at the
 * composer.
 *
 * The 7 August 2026 walkthrough showed what those two decisions produced
 * together: on the 21 routes this shell serves, the bar offered neither entry
 * journey. A member could not reach the market or start a deal from the
 * navigation at all, and the only two entries were Market Signals and the paid
 * room's proposal flow.
 *
 * Both journeys are back, under the canonical labels fixed by OD-J, pointing at
 * `/find` and `/publish`. The reasoning that removed them still holds in one
 * respect and is preserved: **"Start a deal" must not mean the composer.** It
 * goes to `/publish`, the listing path, not to `/structure`.
 */
export type DeskNavKey = PrimaryNavKey | "market" | "about";

/*
  The bar is no longer declared here.

  It carried two entries, "Market Signals" and "Open a Deal Room", and NEITHER
  primary entry journey. So across the 21 routes this shell serves, a member
  could not reach Explore the market or Start a deal from the navigation at all,
  while the paid product was offered as a destination and sent an anonymous
  visitor into a proposal flow (registered as JD-09, and not fixed here).

  `PRIMARY_NAV` is now the single declaration for every shell. See
  `lib/nav/primary.ts`.

  `market` is kept in `DeskNavKey` so the pages that already mark themselves as
  the current place keep compiling; it resolves to the `signals` entry.
*/
const NAV = PRIMARY_NAV;

/** The retired `market` key means the Market Signals entry. */
function navKey(current: DeskNavKey | undefined): string | undefined {
  return current === "market" ? "signals" : current;
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

export default async function DeskShell({ children, rail, current, objective }: DeskShellProps) {
  const stated = objective?.trim();

  // Whether there is a session, and nothing else about it. The header needs to
  // know which door to show; it does not need a profile, so it does not read
  // one.
  let signedIn = false;
  try {
    const { data } = await createClient().auth.getUser();
    signedIn = Boolean(data?.user);
  } catch {
    // An unreadable session is a signed-out header, which is the safe way to
    // be wrong: it offers a door rather than hiding one.
    signedIn = false;
  }

  return (
    <>
      <header className="cmd">
        <PonteLockup />

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
              {...(navKey(current) === item.key ? { "aria-current": "page" as const } : {})}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ThemeToggle />

        {/* Suspense because the control reads the current search params to
            build its return path, and useSearchParams opts a subtree into
            client rendering. */}
        <Suspense fallback={null}>
          <DeskAccount signedIn={signedIn} />
        </Suspense>
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
