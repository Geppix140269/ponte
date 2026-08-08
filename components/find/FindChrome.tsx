import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PRIMARY_NAV, signInHref } from "@/lib/nav/primary";

/**
 * The Find journey's own light chrome: a cream sticky nav with the bridge
 * lockup and a trust-line footer. It replaces the app's obsidian header/footer
 * (dropped by ChromeGate on these routes) so the journey reads as one Brand v5
 * world with the landing. Each page renders its own <main> inside.
 *
 * `current` underlines the active primary destination.
 */
export default async function FindChrome({
  current,
  children,
  signInReturnTo,
}: {
  current?: "opportunities" | "signals";
  children: ReactNode;
  /** The route to come back to after signing in. */
  signInReturnTo?: string | null;
}) {
  const t = await getTranslations("find");

  return (
    <>
      {/* Header owned by GlobalHeader at the layout boundary. */}

      <main className="fmain">{children}</main>

      <footer className="ffoot">{t("trust")}</footer>
    </>
  );
}
