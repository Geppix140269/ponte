import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { BridgeMark } from "@/components/Logo";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "about" });
  const description = t("meta.description");

  return {
    title: t("meta.title"),
    description,
    alternates: alternatesFor("/about", params.locale),
    openGraph: {
      title: t("meta.title"),
      description,
      url: "/about",
      siteName: "Ponte Trade",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.title"),
      description,
    },
  };
}

const PRINCIPLES = ["i", "ii", "iii"] as const;

/**
 * What Ponte is, for a reader deciding whether to trust it with a deal.
 *
 * This page used to describe an independent brokerage that took deals in,
 * papered them, and charged a success fee. That is no longer what the product
 * is: the board is free, members connect to each other directly, and the desk
 * vets rather than intermediates. The desk engagement survives as an option
 * and is described as one.
 */
export default async function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("about");

  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">{t("pill")}</span>
        <h1
          className="serif text-white mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          {t("hero.title")}{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            {t("hero.titleAccent")}
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          {t("hero.lead")}
        </p>
      </header>

      {/* What it is */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline">
          <div className="num-italic">{t("what.label")}</div>
          <div className="max-w-2xl">
            <p className="text-[16px] leading-relaxed text-gray-2">
              {t("what.body")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/marketplace" className="btn-gold">
                {t("cta.action")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-10">
          <div className="num-italic">{t("principles.label")}</div>
          <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
            {t("principles.heading")}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p} className="glass p-7">
              <p className="num-italic mb-4">{t(`principles.${p}.n`)}</p>
              <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>
                {t(`principles.${p}.title`)}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">
                {t(`principles.${p}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* The desk */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-10">
          <div className="num-italic">{t("desk.label")}</div>
          <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
            {t("desk.heading")}
          </h2>
        </div>
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline">
          <div />
          <div className="max-w-2xl">
            <p className="text-[16px] leading-relaxed text-gray-2">
              {t("desk.body")}
            </p>
            <div className="mt-6">
              <Link href="/contact" className="btn-ghost-light">
                {t("desk.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Company */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline">
          <div className="num-italic">{t("company.label")}</div>
          <div className="max-w-2xl">
            <p className="text-[15px] leading-relaxed text-gray-2">
              {t("company.body")}{" "}
              <a
                href="mailto:hello@ponte.trade"
                className="text-gold hover:text-cream"
              >
                hello@ponte.trade
              </a>
              {" · +44 7988 540104."}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-px py-16">
        <div className="glass p-10 md:p-12 text-center">
          <div className="mx-auto flex justify-center">
            <BridgeMark className="h-12 w-12" />
          </div>
          <h2 className="serif text-white mt-4" style={{ fontSize: 32, fontWeight: 500 }}>
            {t("cta.heading")}
          </h2>
          <p className="mt-3 text-[15px] text-gray-2 max-w-xl mx-auto">
            {t("cta.body")}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/marketplace/new" className="btn-gold">
              {t("cta.action")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
