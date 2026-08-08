import { LIFECYCLE, type LifecycleStageKey } from "@/lib/nav/lifecycle";

/**
 * Where a member is in the canonical lifecycle. Orientation, and nothing else.
 *
 * ## What it deliberately does not say
 *
 * **It is not a progress meter.** There is no "step 3 of 8", no count, no
 * percentage and no completion bar, because a member arriving on `/find` from a
 * search engine has not completed `ENTER` in any sense worth claiming, and a
 * rail that said so would be asserting work they never did. It names the whole
 * lifecycle and marks where they are standing in it. That is the entire job.
 *
 * **It does not say the journey must reach a Deal Room.** `[DEAL ROOM]` is drawn
 * as a contextual threshold: dashed rather than solid, and announced as optional.
 * ADR-0037 is explicit that convergence is available, never automatic and never
 * obligatory, and a journey may end validly at `CONNECT`. A rail is the easiest
 * place in a product to smuggle a funnel back in after the copy has stopped
 * claiming one, so the distinction is structural here rather than editorial.
 *
 * **It is not navigation.** North Star section 2 and ADR-0038 both forbid that,
 * and nothing here is a link or a control. A stage a member has not reached is
 * not somewhere they can click to, and one they have passed is not somewhere the
 * chrome sends them back to. That is also why there is nothing focusable: the
 * rail reports, the screen navigates.
 *
 * ## Reading it without sight, and without motion
 *
 * The current stage is a weight, a colour and a marker, so it survives colour
 * being removed, and it is stated in words for assistive technology because a
 * label that differs only by brightness communicates nothing to a screen reader.
 * The contextual stage is announced as optional rather than left to the dashed
 * border to imply. Nothing animates, in any state, so there is no reduced-motion
 * case to handle: there is no motion to reduce.
 */
export default function LifecycleRail({
  at,
}: {
  /** The stage the member is standing in on this surface. */
  at: LifecycleStageKey;
}) {
  return (
    <nav className="pg-rail" aria-label="Where you are in the Ponte journey">
      <ol className="pg-rail__stages">
        {LIFECYCLE.map((stage) => {
          const here = stage.key === at;
          return (
            <li
              key={stage.key}
              className="pg-rail__stage"
              data-here={here ? "true" : undefined}
              data-contextual={stage.contextual ? "true" : undefined}
              {...(here ? { "aria-current": "true" as const } : {})}
            >
              <i className="pg-rail__mark" aria-hidden="true" />
              <b>{stage.label}</b>
              {here && <span className="pg-rail__sr">, where you are now</span>}
              {stage.contextual && (
                <span className="pg-rail__sr">, optional, and not part of every journey</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
