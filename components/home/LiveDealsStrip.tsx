import LiveDealCard, { type DealLabels } from "./LiveDealCard";
import type { LiveDeal } from "@/lib/board/live-deals";

/**
 * The board, moving. Newest first, looping, paused when a reader points at it.
 *
 * The motion is the message: a board that scrolls is a board with something on
 * it. It is also the cheapest honest signal we have, because every card in it
 * is a real approved deal.
 *
 * CSS only. The track is rendered twice and translated by exactly half its
 * width, which is what makes the loop seamless, and the pause is
 * `animation-play-state` on hover rather than a JavaScript listener. That
 * keeps the whole strip server-rendered with no hydration cost.
 *
 * Under prefers-reduced-motion the animation is dropped and the strip becomes
 * an ordinary horizontal scroller, so the same deals stay reachable.
 */
export default function LiveDealsStrip({
  deals,
  labels,
  locale,
}: {
  deals: LiveDeal[];
  labels: DealLabels;
  locale: string;
}) {
  if (deals.length === 0) return null;

  // Slow enough to read a card in passing, and scaled by how many there are
  // so twenty deals do not become a blur.
  const seconds = Math.max(28, deals.length * 5);

  return (
    <div className="marquee" style={{ ["--marquee-duration" as string]: `${seconds}s` }}>
      <div className="marquee-track">
        {deals.map((deal) => (
          <div key={deal.id} className="w-[268px] shrink-0">
            <LiveDealCard deal={deal} labels={labels} locale={locale} />
          </div>
        ))}
        {/* The second pass is the same cards again, purely so the loop has
            somewhere to go. Hidden from assistive tech: a screen reader
            should hear the board once. */}
        {deals.map((deal) => (
          <div key={`echo-${deal.id}`} className="w-[268px] shrink-0" aria-hidden="true">
            <LiveDealCard deal={deal} labels={labels} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
