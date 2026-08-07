import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIMARY_NAV } from "@/lib/nav/primary";
import DeskAccount from "@/components/desk/DeskAccount";
import ThemeToggle from "@/components/desk/ThemeToggle";

/**
 * The global header. There is one, it lives at the layout boundary, and no page
 * or page wrapper owns any part of it.
 *
 * ## Why it had to move here
 *
 * The 7 August 2026 walkthrough found five header systems across the product,
 * with four navigation vocabularies, two lockups and two surfaces carrying no
 * header at all. The first R0-A pass gave every header the same nav declaration,
 * which fixed the vocabulary but left the architecture unchanged: four
 * components still each rendered their own masthead, so the wordmark still
 * changed between the entrance and everywhere else, and a surface that mounted
 * no wrapper still got no header.
 *
 * A shared declaration rendered by four independent owners is not one shell. It
 * is four shells that currently agree, and agreement that depends on four places
 * staying in step is the condition this work exists to end.
 *
 * So ownership of the global chrome moves here:
 *
 *   - the wordmark and its home behaviour;
 *   - the primary navigation;
 *   - the sign-in and signed-in account door;
 *   - the sticky ink band they sit on.
 *
 * `DeskShell`, `PonteShell`, `FindChrome` and the bridge `Chrome` remain, and
 * legitimately: they carry page-specific layout, the journey rail, the signal
 * tape and the footers. What they no longer carry is a header.
 *
 * ## The lockup
 *
 * `PONTE`, the ADR-0032 wordmark, in one place. The `Ponte .trade` icon lockup
 * is retired from the active surfaces. This is a consolidation, not a redesign:
 * the mark itself is unchanged and the class names the bridge stylesheet
 * already targets are reused, so the band keeps its approved treatment.
 */
export default async function GlobalHeader() {
  // Whether there is a session, and nothing else about it. The header needs to
  // know which door to offer; it does not need a profile, so it does not read
  // one. An unreadable session shows the signed-out door, which is the safe way
  // to be wrong: it offers a way in rather than hiding one.
  let signedIn = false;
  try {
    const { data } = await createClient().auth.getUser();
    signedIn = Boolean(data?.user);
  } catch {
    signedIn = false;
  }

  return (
    <header className="brg-mast pg-mast">
      <div className="brg-mx brg-mast__bar">
        <Link className="brg-mast__mark" href="/" aria-label="Ponte Trade, home">
          Ponte
        </Link>

        <nav className="brg-mast__nav" aria-label="Ponte Trade">
          {PRIMARY_NAV.map((entry) => (
            <Link key={entry.key} href={entry.href}>
              {entry.label}
            </Link>
          ))}
        </nav>

        <ThemeToggle />

        {/* The account door, and the one part of the bar that depends on who is
            reading. `DeskAccount` is reused rather than re-implemented because
            it already builds the return path from the CURRENT location, query
            included, so a member reading a filtered board comes back to that
            board. Suspense because reading the live search params opts the
            subtree into client rendering. */}
        <Suspense fallback={null}>
          <DeskAccount signedIn={signedIn} />
        </Suspense>
      </div>
    </header>
  );
}
