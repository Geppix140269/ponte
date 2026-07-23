import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Icon } from "@/components/icons";
import { alternatesFor } from "@/lib/seo";
import CaptureReferral from "@/components/founding/CaptureReferral";

export const dynamic = "force-dynamic";

/**
 * The single general Founding Network invitation URL (brief Block F).
 *
 * `/join`, optionally `/join?ref=<code>`. It is a plain entry point: it needs
 * no database change of its own. The optional attribution layer rides on it,
 * CaptureReferral drops a first-party cookie carrying an allowlisted code (the
 * general "founding" code when none is given), which the account page later
 * records once on the member profile. The code is attribution only and never
 * grants anything.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "founding" });
  return {
    title: t("metaTitle"),
    robots: { index: false },
    alternates: alternatesFor("/join", params.locale),
  };
}

export default async function JoinPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("founding");

  return (
    <>
      <CaptureReferral />
      <section className="container-px py-20 sm:py-28">
        <div className="mx-auto max-w-xl rounded-[20px] border border-hairline bg-glass p-8 text-center sm:p-10">
          <p className="inline-flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-[0.8px] text-lime">
            <span className="h-2 w-2 rounded-full bg-lime" />
            {t("eyebrow")}
          </p>
          <h1
            className="display mt-5 text-ink"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08, letterSpacing: "-1px" }}
          >
            {t("heading")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            {t("lead")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-[15px] bg-lime px-6 py-[15px] text-[15px] font-bold text-obsidian shadow-lime transition-transform hover:-translate-y-px"
            >
              {t("ctaExplore")}
              <Icon name="chevron" size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-[15px] border border-hairline-strong bg-white/[0.06] px-6 py-[15px] text-[15px] font-bold text-ink transition-colors hover:bg-white/10"
            >
              {t("ctaSignIn")}
            </Link>
          </div>

          <p className="mt-8 border-t border-hairline-soft pt-5 text-[12px] leading-relaxed text-muted">
            {t("privacy")}
          </p>
        </div>
      </section>
    </>
  );
}
