import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileSearch,
  Landmark,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";

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
 */
export default async function VerificationPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("verification");

  const levels = [
    {
      key: "l1",
      icon: UserCheck,
      checks: ["c1", "c2"],
    },
    {
      key: "l2",
      icon: Building2,
      checks: ["c1", "c2", "c3", "c4"],
    },
    {
      key: "l3",
      icon: FileSearch,
      checks: ["c1", "c2", "c3"],
    },
    {
      key: "l4",
      icon: Landmark,
      checks: ["c1", "c2"],
    },
  ] as const;

  const lists = ["l1", "l2", "l3", "l4"] as const;

  return (
    <>
      <section className="container-px pt-16 pb-10">
        <span className="pill">{t("hero.pill")}</span>
        <h1
          className="serif text-white mt-6 mb-4 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(38px, 5.5vw, 66px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          {t("hero.title")}
        </h1>
        <p className="max-w-2xl text-[16px] leading-relaxed text-gray-2">
          {t("hero.intro")}
        </p>
      </section>

      {/* The four levels */}
      <section className="container-px pb-12">
        <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
          {t("levels.heading")}
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-gray-2">
          {t("levels.lead")}
        </p>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {levels.map(({ key, icon: Icon, checks }) => (
            <div key={key} className="glass flex flex-col p-7">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-gold" />
                <span
                  className="mono text-[11px] uppercase text-gray-2"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {t(`levels.${key}.badge`)}
                </span>
              </div>
              <h3
                className="serif text-white mt-3 text-xl"
                style={{ fontWeight: 500 }}
              >
                {t(`levels.${key}.name`)}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-cream">
                {t(`levels.${key}.body`)}
              </p>
              <p
                className="mt-5 text-[10px] uppercase text-gray-2"
                style={{ letterSpacing: "0.2em" }}
              >
                {t("levels.checksLabel")}
              </p>
              <ul className="mt-3 space-y-2.5">
                {checks.map((c) => (
                  <li
                    key={c}
                    className="flex gap-2.5 text-[13px] leading-relaxed text-gray-2"
                  >
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>{t(`levels.${key}.${c}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Sanctions screening */}
      <section className="container-px pb-12">
        <div className="glass p-7 md:p-9">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-gold" />
            <h2
              className="serif text-white"
              style={{ fontSize: 28, fontWeight: 500 }}
            >
              {t("sanctions.heading")}
            </h2>
          </div>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-gray-2">
            {t("sanctions.lead")}
          </p>
          <ul className="mt-4 max-w-2xl space-y-2.5">
            {lists.map((l) => (
              <li
                key={l}
                className="flex gap-2.5 text-[13.5px] leading-relaxed text-cream"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                <span>{t(`sanctions.${l}`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-2xl text-[13.5px] leading-relaxed text-gray-2">
            {t("sanctions.matching")}
          </p>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-gray-2">
            {t("sanctions.refresh")}
          </p>
        </div>
      </section>

      {/* How a case is decided, and what the result is built on */}
      <section className="container-px pb-12">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass p-7">
            <h2
              className="serif text-white"
              style={{ fontSize: 24, fontWeight: 500 }}
            >
              {t("process.heading")}
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-gray-2">
              {t("process.auto")}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-gray-2">
              {t("process.review")}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-cream">
              {t("process.human")}
            </p>
          </div>
          <div className="glass p-7">
            <h2
              className="serif text-white"
              style={{ fontSize: 24, fontWeight: 500 }}
            >
              {t("sources.heading")}
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-gray-2">
              {t("sources.body")}
            </p>
          </div>
        </div>
      </section>

      {/* The disclaimer. Printed on every certificate, so it is printed here. */}
      <section className="container-px pb-12">
        <div
          className="rounded-2xl border p-7 md:p-8"
          style={{
            background: "rgba(232,160,32,0.08)",
            borderColor: "rgba(232,160,32,0.35)",
          }}
        >
          <p
            className="text-[10px] uppercase text-gold"
            style={{ letterSpacing: "0.22em" }}
          >
            {t("disclaimer.heading")}
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-cream">
            {VERIFICATION_DISCLAIMER}
          </p>
        </div>
      </section>

      <section className="container-px pb-20">
        <div className="glass flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between md:p-9">
          <div className="max-w-xl">
            <h2
              className="serif text-white"
              style={{ fontSize: 26, fontWeight: 500 }}
            >
              {t("cta.heading")}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-2">
              {t("cta.body")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/verify" className="btn-gold">
              {t("cta.button")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-ghost-light">
              {t("cta.pricing")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
