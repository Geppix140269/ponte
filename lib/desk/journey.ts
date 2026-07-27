/**
 * The Desk journey rail authority.
 *
 * The rail is the journey. It is NEVER navigation.
 *
 * A station is a position in a journey the member is actually on. It is not a
 * link to a section of the product, and the following never appear on it:
 * account, profile, settings, notifications, Explore, workspace links, help,
 * administration, or any general product navigation. Those belong to the global
 * command bar, which is a separate system with a separate visual language. A
 * screen with no journey has no rail at all, which is why the landing page has
 * none: nothing has started, so there is nothing to show a position in.
 *
 * Review is not a station. Once a submission is received the work belongs to
 * Ponte, so `submitted`, `under review` and `returned for correction` change
 * the record's lifecycle and leave the member's rail exactly where it was. A
 * rail that advanced on review would be claiming the member had done something
 * they had not. The unit test asserts that no station in either journey is a
 * review station.
 *
 * Save and Submit are alternative terminal outcomes of one station, Conclude.
 * Saving privately is not a step towards submitting and must never render as
 * one; both terminate the same station, and a terminated station is `done` and
 * static, never `active`.
 *
 * Pure. No React, no Next, no database, so it is unit-tested standalone.
 */

export type JourneyKey = "find" | "submit";

/**
 * The only conditions a rail may express.
 *
 *   done      the member has been through this station
 *   here      the member is at this station
 *   active    the member is at this station and Ponte is genuinely working
 *   halt      this station requires something of the member before it proceeds
 *   reserved  not reached, or not yet taken
 */
export type StationCondition = "done" | "here" | "active" | "halt" | "reserved";

export interface JourneyStation {
  key: string;
  label: string;
}

export interface Journey {
  id: string;
  name: string;
  stations: readonly JourneyStation[];
}

/** The two authoritative journeys. Four stations each, in order. */
export const JOURNEYS: Readonly<Record<JourneyKey, Journey>> = {
  find: {
    id: "R-FIND",
    name: "Find demand or supply",
    stations: [
      { key: "objective", label: "Objective" },
      { key: "discover", label: "Discover" },
      { key: "record", label: "Record" },
      { key: "act", label: "Act" },
    ],
  },
  submit: {
    id: "R-SUBMIT",
    name: "Structure and submit",
    stations: [
      { key: "objective", label: "Objective" },
      { key: "compose", label: "Compose" },
      { key: "preview", label: "Preview" },
      { key: "conclude", label: "Conclude" },
    ],
  },
};

/** Which journey a screen belongs to, and where in it. */
export interface ScreenPosition {
  journey: JourneyKey | null;
  /** Zero-based station index, or null when the screen has no journey. */
  at: number | null;
  /** A station the member must satisfy before the journey proceeds. */
  halt?: number;
}

export type DeskScreen = "landing" | "listing" | "signal";

/**
 * The screens implemented in this slice.
 *
 * `landing` carries a null journey deliberately, and is the reason `railFor`
 * returns null rather than an empty rail: an empty rail is still a rail, and
 * would tell a first-time visitor they are somewhere in a process they have not
 * begun.
 */
export const DESK_SCREENS: Readonly<Record<DeskScreen, ScreenPosition>> = {
  landing: { journey: null, at: null },
  listing: { journey: "find", at: 1 },
  // Reading a record is Record. Act is halted: the member must choose, and
  // every choice at Act needs an account. The halt states the condition; it
  // does not move the member.
  signal: { journey: "find", at: 2, halt: 3 },
};

export interface RailStationView extends JourneyStation {
  condition: StationCondition;
}

export interface Rail {
  journeyId: string;
  journeyName: string;
  stations: RailStationView[];
  /** The record this journey is carrying, when it is carrying one. */
  origin?: string;
}

export interface RailOptions {
  /** Ponte is genuinely running work at the current station. */
  active?: boolean;
  /** The current station is a terminal outcome: completed and static. */
  terminal?: boolean;
  /**
   * Whether the member has actually stated an objective.
   *
   * The Objective station is only `done` when one was stated. Arriving at the
   * listing from a bare link means Objective has not been taken, and marking it
   * complete would be the rail asserting a step the member never made.
   */
  objectiveStated?: boolean;
  /** The record reference the journey is carrying. */
  origin?: string;
}

/**
 * Resolve the rail for a position in a journey.
 *
 * `active` and `terminal` are mutually exclusive by construction: a terminal
 * station is completed and therefore static, and a station cannot be both
 * finished and still running. `terminal` wins.
 */
export function railFor(
  journey: JourneyKey,
  at: number,
  opts: RailOptions & { halt?: number } = {},
): Rail {
  const j = JOURNEYS[journey];

  const stations: RailStationView[] = j.stations.map((station, i) => {
    let condition: StationCondition;

    if (i === at) {
      condition = opts.terminal ? "done" : opts.active ? "active" : "here";
    } else if (opts.halt === i) {
      condition = "halt";
    } else if (i < at) {
      condition = "done";
    } else {
      condition = "reserved";
    }

    // An objective the member never stated is not a station they completed.
    if (station.key === "objective" && i < at && opts.objectiveStated === false) {
      condition = "reserved";
    }

    return { ...station, condition };
  });

  return {
    journeyId: j.id,
    journeyName: j.name,
    stations,
    ...(opts.origin ? { origin: opts.origin } : {}),
  };
}

/**
 * The rail for a screen, or null when the screen has no journey.
 *
 * Null is the landing page's answer and must stay distinguishable from an empty
 * station list, so callers render nothing at all rather than an empty rail.
 */
export function railForScreen(screen: DeskScreen, opts: RailOptions = {}): Rail | null {
  const position = DESK_SCREENS[screen];
  if (!position || position.journey === null || position.at === null) return null;
  return railFor(position.journey, position.at, { ...opts, halt: position.halt });
}
