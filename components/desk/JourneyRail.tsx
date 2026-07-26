import type { Rail, StationCondition } from "@/lib/desk/journey";

/**
 * The journey rail.
 *
 * It renders a position, not a menu, so nothing in here is a link. A station a
 * member has not reached is not somewhere they can click to, and a station they
 * have passed is not somewhere they go "back" to through the chrome; the rail
 * reports, and the screen navigates.
 *
 * Each condition is a shape and a weight as well as a colour, so the rail is
 * still readable with colour removed: `here` is a filled gold point with a
 * ring, `done` is a filled cream point, `halt` is a slate point on a dashed
 * connector, and `reserved` is an unfilled dashed ring. `active` is the only
 * animated state in the whole system, it means Ponte is genuinely running work,
 * and it is the first thing reduced-motion turns off.
 *
 * The condition is also stated in words for assistive technology, because a
 * point that differs only by fill communicates nothing to a screen reader.
 */

const CONDITION_WORD: Record<StationCondition, string> = {
  done: "completed",
  here: "current position",
  active: "in progress",
  halt: "requires you to act",
  reserved: "not yet reached",
};

export default function JourneyRail({ rail }: { rail: Rail }) {
  return (
    <nav className="rail dk-ink" aria-label={`Journey: ${rail.journeyName}`}>
      <p className="rail__name">
        {rail.journeyId.replace("R-", "")}
        <br />
        journey
      </p>

      <ol className="rail__stations">
        {rail.stations.map((station) => (
          <li key={station.key} className={`st st--${station.condition}`}>
            <span className="st__n" aria-hidden="true">
              <i />
            </span>
            <b>{station.label}</b>
            <span className="sr-only">{`, ${CONDITION_WORD[station.condition]}`}</span>
          </li>
        ))}
      </ol>

      {rail.origin ? (
        <p className="rail__origin">
          <b>From record</b>
          <span>{rail.origin}</span>
        </p>
      ) : null}
    </nav>
  );
}
