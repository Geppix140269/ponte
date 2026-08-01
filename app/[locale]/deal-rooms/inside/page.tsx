import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { RoomHeader } from "@/components/deal-room/primitives";
import Walkthrough from "@/components/deal-room/Walkthrough";
import "@/components/deal-room/draft-room.css";
import "@/components/deal-room/screens-2-3-4.css";

/*
  Dynamic, and it has to be.

  This was `force-static`, which is what a page of fixed content wants until
  you notice that `DeskShell` reads the session to decide whether the command
  bar says "Account" or "Sign in". A statically rendered page has no session,
  so a signed-in member arriving here was shown a Sign in button and reasonably
  concluded they had been logged out.

  The owner hit it on mobile on 1 August 2026: Account on the entrance, Sign in
  one tap later on the same site.

  The page's own content is still fixed and still public. Only the chrome needs
  the request, and the chrome is on every Desk surface.
*/
export const dynamic = "force-dynamic";

/**
 * See inside a Deal Room.
 *
 * ## It is public, deliberately
 *
 * No session, no gate, no allowlist. This is the page a visitor reads BEFORE
 * deciding whether Ponte is for them, and the entrance links to it as "See
 * inside one". A walkthrough of the product that requires an account to read
 * is a brochure locked in the shop.
 *
 * It replaces the second landing control's old destination, `/pricing`, which
 * promised an explanation and delivered a price list. The owner walked that
 * loop on 1 August 2026 and left.
 *
 * ## What it must never become
 *
 * A page of screenshots. Every stage is drawn with the product's own approved
 * components from `lib/deal-room/walkthrough.ts`, so it cannot show a room the
 * product no longer builds.
 *
 * A sales page. The prices are stated at every stage, read from
 * `lib/deal-room/pricing.ts`, including the two stages that cost nothing. A
 * reader should finish it knowing exactly where the money starts, which is
 * when a room goes live and not before.
 */

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  return {
    title: "Inside a Deal Room | Ponte Trade",
    description:
      "How a deal is built on Ponte: from an offer or a requirement, through credible interest, into one Master Deal Room with a separate branch for each counterparty, to signature elsewhere.",
    alternates: alternatesFor("/deal-rooms/inside", params.locale),
  };
}

export default function InsideADealRoomPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  return (
    <>
      <RoomHeader
        reference="Deal Rooms"
        title="Inside a Deal Room"
        dealLine="Six stages, from a deal you want to a contract signed somewhere else. Nothing here is a mock-up: every stage is drawn with the same components the room itself is built from."
      />
      <Walkthrough ctaHref="/deal-rooms/propose" />
    </>
  );
}
