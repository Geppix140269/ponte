/**
 * Where "Back" goes from the composer's FIRST step, and what it is called.
 *
 * ## The defect
 *
 * The composer's top bar shows a labelled Back from step two onward, because
 * from there back means a previous step. On step one there is no previous step,
 * so the bar showed the wordmark alone. The wordmark IS a control - it is a
 * guarded button that goes home - but it does not look like one and it does not
 * mean "back", so the intake screen read as having no way out except the
 * browser's own control. The design director filed exactly that on 2 August
 * 2026.
 *
 * ## Why a parameter rather than history
 *
 * `history.back()` would be the obvious answer and it is the wrong one twice.
 * It does nothing at all when the composer was opened directly, in a new tab,
 * or from an email - which is a dead control, the same class of defect as the
 * silent CTA. And it cannot be labelled: a Back control that cannot name its
 * destination is the bare arrow the Ponte navigation contract forbids.
 *
 * So the entrance states itself in the URL and this resolves it to a named
 * place. An absent or unrecognised value is not an error and is not obeyed: it
 * falls back to the entrance, which is where the wordmark already went.
 *
 * ## Why an allowlist and not a path check
 *
 * `?from=` is attacker-controlled. A "starts with /" test passes `//evil.example`
 * and `/\evil.example`, both of which browsers resolve as a host. Rather than
 * enumerate the ways a string can look internal while not being internal, only
 * these exact keys resolve, and each resolves to a path written here. Nothing
 * from the URL is ever concatenated into the destination.
 */

export interface ComposerExit {
  /** Locale-relative path, always one of the literals below. */
  href: string;
  /** The visible Back label. It names the destination; it is never a bare word. */
  label: string;
}

/** The surfaces that link into the composer, by the key they pass. */
const ENTRANCES: Record<string, ComposerExit> = {
  "deal-rooms": { href: "/deal-rooms/propose", label: "Back to Deal Rooms" },
  find: { href: "/find", label: "Back to the board" },
  "market-signals": { href: "/market-signals", label: "Back to Market Signals" },
  opportunities: { href: "/opportunities", label: "Back to your records" },
  home: { href: "/", label: "Back to Ponte Trade" },
};

/** The answer when nothing usable was given: the same place the wordmark went. */
export const DEFAULT_COMPOSER_EXIT: ComposerExit = ENTRANCES.home;

/**
 * Resolve `?from=` to a destination. Never throws, never echoes the input.
 */
export function composerExit(from: string | string[] | undefined): ComposerExit {
  // A repeated parameter arrives as an array. Take the first and judge it on
  // its own; there is no merging to be done and no reason to look further.
  const key = Array.isArray(from) ? from[0] : from;
  if (typeof key !== "string") return DEFAULT_COMPOSER_EXIT;
  // Reading a key straight out of an object literal reaches Object.prototype,
  // so `?from=constructor` would resolve to a function rather than to nothing.
  // Only an own key answers.
  if (!Object.prototype.hasOwnProperty.call(ENTRANCES, key)) return DEFAULT_COMPOSER_EXIT;
  return ENTRANCES[key];
}

/** The keys, for the surfaces that link in and for the test that pins them. */
export const COMPOSER_ENTRANCE_KEYS = Object.keys(ENTRANCES);
