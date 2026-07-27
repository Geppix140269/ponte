import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import PonteShell from "@/components/shell/PonteShell";
import "@/components/verify/verify.css";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "verification",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/verification", params.locale),
  };
}

/**
 * Public explainer. This page is the answer to "how do I verify a trade
 * counterparty", so it is written to be read by someone who has not signed
 * in and is deciding whether the check is worth anything.
 *
 * Two rules govern the copy here, and they are not stylistic:
 *   - Nothing is described as instant, guaranteed or exhaustive.
 *   - Only the sources actually consulted are named: company registers,
 *     VIES, GLEIF, the published sanctions lists, and documents a member
 *     supplies about their own business.
 *
 * It moved into the shared PonteShell with /verify, so a member reading about
 * the check and a member requesting one are in the same product. Every line of
 * copy, every level and the disclaimer are unchanged.
 */
export default async function VerificationPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("verification");

  const levels = [
    { key: "l1", num: "01", checks: ["c1", "c2"] },
    { key: "l2", num: "02", checks: ["c1", "c2", "c3", "c4"] },
    { key: "l3", num: "03", checks: ["c1", "c2", "c3"] },
    { key: "l4", num: "04", checks: ["c1", "c2"] },
  ] as const;

  const lists = ["l1", "l2", "l3", "l4"] as const;

  return (
    <PonteShell locale={params.locale}>
      <div className="vwrap">
        <div className="fphead__eb">
          <span className="fphead__rule" aria-hidden="true" />
          <span className="eyebrow">{t("hero.pill")}</span>
        </div>
        <h1 className="fphead__h serif">{t("hero.title")}</h1>
        <p className="fphead__def">{t("hero.intro")}</p>

        {/* The four levels. Numbered rather than iconed: the number is the
            level, so it carries meaning an icon would only decorate. */}
        <section className="vex" aria-label={t("levels.heading")}>
          <h2 className="vex__h">{t("levels.heading")}</h2>
          <p className="vex__p">{t("levels.lead")}</p>
          <ul className="vsteps">
            {levels.map(({ key, num, checks }) => (
              <li className="vstep" key={key}>
                <span className="vstep__n" aria-hidden="true">{num}</span>
                <span className="vstep__b">
                  <span className="vstep__t">{t(`levels.${key}.name`)}</span>
                  <span className="vstep__d">{t(`levels.${key}.body`)}</span>
                  <span className="vreason">
                    <span className="vreason__l">{t("levels.checksLabel")}</span>
                    {checks.map((c) => (
                      <p className="vreason__p" key={c}>
                        {t(`levels.${key}.${c}`)}
                      </p>
                    ))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="vex" aria-label={t("sanctions.heading")}>
          <h2 className="vex__h">{t("sanctions.heading")}</h2>
          <p className="vex__p">{t("sanctions.lead")}</p>
          <ul className="vsteps">
            {lists.map((l, i) => (
              <li className="vstep" key={l}>
                <span className="vstep__n" aria-hidden="true">{`0${i + 1}`}</span>
                <span className="vstep__b">
                  <span className="vstep__d">{t(`sanctions.${l}`)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="vex__p">{t("sanctions.matching")}</p>
          <p className="vex__p">{t("sanctions.refresh")}</p>
        </section>

        <section className="vex" aria-label={t("process.heading")}>
          <h2 className="vex__h">{t("process.heading")}</h2>
          <p className="vex__p">{t("process.auto")}</p>
          <p className="vex__p">{t("process.review")}</p>
          <p className="vex__p">{t("process.human")}</p>
        </section>

        <section className="vex" aria-label={t("sources.heading")}>
          <h2 className="vex__h">{t("sources.heading")}</h2>
          <p className="vex__p">{t("sources.body")}</p>
        </section>

        {/* The disclaimer. Printed on every certificate, so it is printed here. */}
        <div className="vdisc">
          <p className="vdisc__h">{t("disclaimer.heading")}</p>
          <p className="vdisc__p">{VERIFICATION_DISCLAIMER}</p>
        </div>

        <section className="vex" aria-label={t("cta.heading")}>
          <h2 className="vex__h">{t("cta.heading")}</h2>
          <p className="vex__p">{t("cta.body")}</p>
          <div className="vacts">
            <Link href="/verify" className="fbtn">
              {t("cta.button")}
            </Link>
            <Link href="/pricing" className="fbtn fbtn--ghost">
              {t("cta.pricing")}
            </Link>
          </div>
        </section>
      </div>
    </PonteShell>
  );
}
