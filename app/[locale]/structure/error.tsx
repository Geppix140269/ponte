"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import "@/components/find/find.css";
import "@/components/structure/structure.css";

/**
 * What a member sees when the composer route itself fails.
 *
 * ## Why a segment boundary, when a locale one already exists
 *
 * `app/[locale]/error.tsx` catches this today, so the route was never silent.
 * But it catches it into the legacy obsidian error page, whose only ways out
 * are "try again" and "home" - and "home" is precisely the exit the owner
 * called absurd on 1 August 2026, because from a half-built record it looks
 * like the record is gone.
 *
 * A boundary that sits on THIS segment can offer the recoveries that belong to
 * this segment: try again, go back to the entrance you came from, or open the
 * records you already have. It also stays in the composer's own cream world,
 * so a failure does not additionally look like a different product.
 *
 * ## What it must not claim
 *
 * It must not say the draft is gone, and it must not promise it is kept. A
 * client-held draft survives a re-render and does not survive a reload, and
 * this boundary cannot tell which is about to happen. So it says the one thing
 * that is true either way: nothing that was submitted has been lost, because
 * nothing here submits.
 */
export default function StructureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what support correlates against; no member data is added.
    console.error("[ponte] structure route failed:", error);
  }, [error]);

  return (
    <div className={landingFontVars}>
      <div className="ponte-find" style={{ minHeight: "100dvh" }}>
        <div className="sbar">
          <span className="sbar__title serif">
            Ponte
            <span style={{ color: "var(--ink-3)", fontFamily: "var(--f-mono)", fontSize: 12 }}>.trade</span>
          </span>
        </div>

        <div className="fmain">
          <section className="sstep" role="alert">
            <h1 className="fphead__h serif">This screen could not be opened</h1>
            <p className="sload__b">
              The fault is on our side, not in anything you entered. Nothing has been submitted, so nothing has been
              published or charged. Trying again usually works.
            </p>
            <div className="sload__a">
              <button type="button" className="fbtn fbtn--lg" onClick={reset}>
                Try again
              </button>
              <Link className="fbtn fbtn--ghost" href="/deal-rooms/propose">
                Back to Deal Rooms
              </Link>
              <Link className="fbtn fbtn--ghost" href="/opportunities">
                See the records you already have
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
