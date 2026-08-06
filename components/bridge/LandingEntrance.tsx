"use client";

import { useRouter } from "next/navigation";
import BridgeLanding, { type LandingSignal } from "./BridgeLanding";
import type { Signal } from "./Chrome";

/**
 * The entrance, wired.
 *
 * `BridgeLanding` stays presentational and takes callbacks, so it can be
 * rendered in a specimen, in evidence and in a test without a router. This is
 * the one place that knows where the two controls go.
 */

export interface LandingEntranceProps {
  signals: readonly Signal[];
  recent: readonly LandingSignal[];
  counts?: { total: number; live: number } | null;
}

export default function LandingEntrance({ signals, recent, counts = null }: LandingEntranceProps) {
  const router = useRouter();
  return (
    <BridgeLanding
      signals={signals}
      recent={recent}
      counts={counts}
      onPublish={() => router.push("/publish")}
      onFind={() => router.push("/find")}
    />
  );
}
