import BridgeLanding, { type LandingSignal } from "./BridgeLanding";
import type { Signal } from "./Chrome";

/**
 * The entrance.
 *
 * `BridgeLanding` is now entirely link-driven: every door, every board row and
 * every footer route is an `<a href>` resolving to a real page, so this shell
 * no longer holds a router or wires callbacks. It stays as its own module
 * because the route composes the landing with the fonts and the reads, and one
 * named seam between "what the page is" and "what the page says" is worth
 * keeping even when the seam is thin.
 */

export interface LandingEntranceProps {
  signals: readonly Signal[];
  recent: readonly LandingSignal[];
  counts?: { total: number; offers: number; requirements: number } | null;
}

export default function LandingEntrance({ signals, recent, counts = null }: LandingEntranceProps) {
  return <BridgeLanding signals={signals} recent={recent} counts={counts} />;
}
