"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * The segment error boundary for every route below the locale layout.
 *
 * Before this, an unhandled runtime error fell through to Next's default error
 * page: no wordmark, no way back, the dead-end the brief forbids (section 7). A
 * caught error now always offers two explicit recoveries -- retry the segment,
 * or return to the home page -- so a member is never stranded.
 *
 * This boundary sits inside the locale layout, so where the shared header
 * renders its logo is still above this content. On a bared journey route there
 * is no header, which is exactly why "Return to Ponte Trade" is always present
 * here rather than assumed from the chrome.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the digest visible in the console for support; no PII is added.
    console.error(error);
  }, [error]);

  const t = useTranslations("journey");

  return (
    <div className="pux-errpage" role="alert">
      <div className="pux-errpage__card">
        <h1 className="pux-errpage__h">{t("error.title")}</h1>
        <p className="pux-errpage__d">{t("error.body")}</p>
        <div className="pux-errpage__a">
          <button type="button" className="pux-btn pux-btn--safe" onClick={reset}>
            {t("error.retry")}
          </button>
          <Link className="pux-btn pux-btn--draft" href="/">
            {t("error.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
