import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { bridgeFontVars } from "@/components/bridge/fonts";
import PublishFlow from "@/components/publish/PublishFlow";
import { getUser } from "@/lib/auth";
import { MARKET_INTENTS } from "@/lib/taxonomy/market";
/*
  The retired path's two stylesheets are NOT loaded here any more.

  Every surface from `B01` to `B09` now renders on the bridge, so nothing on
  this route reads them. Leaving them imported would not be harmless: the
  defect that made every serif statement cream-on-cream was a global `h1, h2,
  h3, h4 { color: var(--ink) }` left behind by a retired chrome, and a
  stylesheet that no longer styles anything is exactly the shape that defect
  takes.
*/
import "@/design-system/bridge/tokens.css";
import "@/design-system/bridge/bridge.css";

/**
 * Publish a listing. Build 1, `B01` through `B09`.
 *
 * `/publish` and not `/deal-rooms/propose`: publishing an opportunity is free
 * and public, and it is a different act from activating a Deal Room. `P1-2`
 * established that "publish" must never name the paid room action, and Set 2 is
 * titled "Publish a Listing" for the same reason. The word is correct here and
 * only here.
 *
 * A thin server shell. It resolves the locale, publishes the editorial fonts,
 * and reads whether anyone is signed in. Being signed in changes three things
 * and only three: the retention promise, whether the upload route opens, and
 * whether `B08` appears in the path at all.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  setRequestLocale(params.locale);
  return {
    title: "Publish an opportunity",
    description:
      "Tell Ponte what you are offering or looking for. Publishing an opportunity is free.",
  };
}

/**
 * An intent named on the previous screen, read off the query string.
 *
 * Resolved against the pinned intent table, never trusted as given: an unknown
 * or malformed value yields null and the path opens on `B01` exactly as it
 * always did. A bad link degrades to the normal entrance rather than to an
 * error, which is the correct posture for a public URL anyone can edit.
 */
function presetIntent(raw: string | string[] | undefined) {
  if (typeof raw !== "string") return null;
  const found = MARKET_INTENTS.find((definition) => definition.key === raw);
  return found ? { intent: found.key, family: found.family } : null;
}

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { intent?: string | string[] };
}) {
  setRequestLocale(params.locale);

  /*
    Signed-in state, read on the server so the first paint is already correct.

    `getUser` returns null rather than throwing when Supabase is unconfigured -
    which is the fix from 2 August, when three routes answered 500 instead of
    degrading. This surface has no signed-in-only content, so an unknown session
    degrades to the anonymous retention sentence, which is the truthful one when
    nothing is known.
  */
  const user = await getUser().catch(() => null);

  return (
    <div className={bridgeFontVars}>
      <PublishFlow signedIn={Boolean(user)} initialIntent={presetIntent(searchParams?.intent)} />
    </div>
  );
}
