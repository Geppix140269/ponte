import { landingFontVars } from "@/components/home/landing/fonts";
import "@/components/find/find.css";
import "@/components/structure/structure.css";

/**
 * What the composer looks like while it is opening.
 *
 * ## Why this file exists
 *
 * `/structure` is `force-dynamic` and mounts the whole S01-S06 composer, so a
 * client navigation to it is a blocking round trip. Without a `loading` state
 * the App Router holds the PREVIOUS page on screen, unchanged, until the new
 * one is ready. Nothing moves, nothing dims, nothing says a thing.
 *
 * Measured on 2 August 2026, on a warm dev server, from the entrance's own
 * "Describe what you trade": 2,638 ms between the click and the first pixel of
 * the composer, with no visible change in between. The design director walked
 * the same path on production, waited past ten seconds, pressed it a second
 * time, and reported the button as dead. It was not dead. It was silent, which
 * a member cannot tell apart.
 *
 * ## Why it is this and not a skeleton
 *
 * A skeleton draws shapes where content is about to be, and the content here
 * is a question - "What do you want to do?" - not a layout. Drawing three grey
 * bars would promise a shape that never arrives.
 *
 * So this is the composer's own chrome, which IS what arrives, plus one line
 * that says what is happening. The wordmark and the step mark land in their
 * final positions, so when the composer replaces this nothing jumps.
 *
 * The stylesheets are imported here rather than relied on from `page.tsx`: a
 * loading state that renders before its route's CSS chunk is unstyled, and an
 * unstyled loading state is worse than none.
 */
export default function StructureLoading() {
  return (
    <div className={landingFontVars}>
      <div className="ponte-find" style={{ minHeight: "100dvh" }}>
        <div className="sbar">
          <span className="sbar__title serif">
            Ponte
            <span style={{ color: "var(--ink-3)", fontFamily: "var(--f-mono)", fontSize: 12 }}>.trade</span>
          </span>
          <span className="sbar__step">S01</span>
        </div>

        <div className="fmain">
          {/*
            `role="status"` and not `aria-live="assertive"`: this is progress,
            not an alert. A screen reader hears it once, politely, and is not
            interrupted again when the composer replaces it.
          */}
          <section className="sstep" role="status">
            <p className="sload">
              <span className="sload__m" aria-hidden="true" />
              Opening the composer
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
