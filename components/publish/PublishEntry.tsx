"use client";

import { useRouter } from "next/navigation";
import ChooseDealIntent from "./ChooseDealIntent";
import type { MarketFamily, MarketIntent } from "@/lib/taxonomy/market";

/**
 * The entry point of the listing path: `B01`, then onward.
 *
 * ## Why this hands off to `/structure` for now
 *
 * `B01` replaces the live three-option intent screen **today**, while `B02`
 * through `B09` are still being built. Resolving into the existing composer
 * with `?family=&intent=` means:
 *
 *   - the six choices and the seven stored values are live immediately, so the
 *     collapsed-axis defect stops reaching members;
 *   - the rest of the path keeps working, so nothing is half-replaced;
 *   - the handoff is one line to delete when `B02` lands.
 *
 * The alternative - hold `B01` back until all nine surfaces are ready - leaves
 * the three-option screen in production for the whole build, and it is the
 * screen that cannot express `DECISION-17` at all.
 */
export default function PublishEntry({
  signedIn,
  lastTime,
}: {
  signedIn: boolean;
  lastTime?: { label: string; family: MarketFamily; direction: "need" | "offer" } | null;
}) {
  const router = useRouter();

  function onResolved({ intent, family }: { intent: MarketIntent; family: MarketFamily }) {
    // Both values are carried, not just the intent. The composer reads family
    // to decide which field set applies, and deriving one from the other in two
    // places is how they drift.
    router.push(`/structure?family=${family}&intent=${intent}`);
  }

  return <ChooseDealIntent onResolved={onResolved} signedIn={signedIn} lastTime={lastTime} />;
}
