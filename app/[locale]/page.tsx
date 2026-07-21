import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ProcessFlow from "@/components/ProcessFlow";
import Reveal from "@/components/Reveal";
import { BridgeMark } from "@/components/Logo";
import { alternatesFor } from "@/lib/seo";
import { ArrowRight, Check, Info, Landmark, ShieldAlert } from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { locale: any } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/", params.locale),
  };
}

/**
 * The front door for a commodity trader.
 *
 * Two rules govern this page and they are not stylistic:
 *   - No volume, member count or deal value is stated anywhere. The board is
 *     thin and pretending otherwise is the fastest way to lose a trader.
 *   - The deal cards below are format examples, labelled as such in the copy
 *     and in the markup. They demonstrate the notation a listing is written
 *     in. They are never presented as live inventory.
 */

/** Registers and identifiers read by a verification. Names stay untranslated
 *  where they are proper nouns; the qualifier line is translated. */
const REGISTRIES = ["reg1", "reg2", "reg3"] as const;
const SANCTIONS = ["s1", "s2", "s3", "s4"] as const;

/** Codes are identical in every language: incoterms, ISO country codes and HS
 *  headings never get translated, so they live here rather than in messages. */
const EXAMPLES = [
  {
    key: "e1",
    type: "offer",
    hs: "1701.99",
    incoterm: "CIF",
    origin: "BR",
    destination: "NL",
  },
  {
    key: "e2",
    type: "requirement",
    hs: "3102.10",
    incoterm: "FOB",
    origin: "EG",
    destination: "BR",
  },
  {
    key: "e3",
    type: "offer",
    hs: "7601.10",
    incoterm: "FOB",
    origin: "AE",
    destination: "TR",
  },
] as const;

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("home");

  return (
    <>
      {/* ============ 1. WHAT THIS IS ============ */}
      <header className="container-px pt-12 pb-9 md:pt-16 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-28 -top-24 opacity-[0.06] hidden lg:block">
          <BridgeMark className="h-[440px] w-[440px]" />
        </div>

        <div className="relative max-w-4xl">
          <p className="eyebrow">{t("hero.eyebrow")}</p>

          <h1
            className="serif text-white mt-4"
            style={{
              fontWeight: 400,
              fontSize: "clamp(34px, 4.6vw, 60px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
            }}
          >
            {t("hero.title")}{" "}
            <em className="text-gold italic" style={{ fontWeight: 400 }}>
              {t("hero.titleAccent")}
            </em>
          </h1>

          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-gray-2">
            {t("hero.lead")}
          </p>

          {/*
            Three benefits, scannable without reading a sentence.

            The first version of this hero opened with quantity and unit,
            incoterm, origin and destination, payment terms, HS code and NCNDA,
            before giving anyone a reason to care. That is a definition of the
            category, not an offer, and a reader who does not yet know what
            this is leaves during it. The trade vocabulary is not deleted, it
            is later on the page, where somebody who wants it will look.
          */}
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
            {["hero.b1", "hero.b2", "hero.b3"].map((key) => (
              <li key={key} className="flex items-center gap-2 text-[13.5px] text-cream">
                <Check className="h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} />
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link href="/marketplace/new" className="btn-gold">
              {t("hero.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/marketplace"
              className="text-[13px] text-cream underline decoration-white/25 underline-offset-4 transition-colors hover:text-gold"
            >
              {t("hero.secondary")}
            </Link>
          </div>
        </div>
      </header>

      {/* ============ 2. WHO IS ON THE OTHER SIDE ============ */}
      <section className="container-px border-t border-white/10 py-11">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <p className="eyebrow">{t("proof.eyebrow")}</p>
            <h2
              className="serif text-white mt-3"
              style={{ fontSize: "clamp(23px, 2.3vw, 31px)", fontWeight: 500, lineHeight: 1.12 }}
            >
              {t("proof.heading")}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-gray-2">{t("proof.lead")}</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-cream">{t("proof.refresh")}</p>
            <Link
              href="/verification"
              className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase text-gold transition-colors hover:text-gold-400"
              style={{ letterSpacing: "0.18em" }}
            >
              {t("proof.link")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-tight p-5">
              <div className="flex items-center gap-2.5">
                <Landmark className="h-4 w-4 text-gold" />
                <p
                  className="mono text-[10px] uppercase text-gray-2"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {t("proof.registriesLabel")}
                </p>
              </div>
              <ul className="mt-4 space-y-3.5">
                {REGISTRIES.map((k) => (
                  <li key={k}>
                    <span className="block text-[13.5px] leading-snug text-cream">
                      {t(`proof.${k}.name`)}
                    </span>
                    <span className="block text-[11.5px] leading-snug text-gray-2">
                      {t(`proof.${k}.note`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-tight p-5">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-gold" />
                <p
                  className="mono text-[10px] uppercase text-gray-2"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {t("proof.sanctionsLabel")}
                </p>
              </div>
              <ul className="mt-4 space-y-3.5">
                {SANCTIONS.map((k) => (
                  <li key={k}>
                    <span className="block text-[13.5px] leading-snug text-cream">
                      {t(`proof.${k}.name`)}
                    </span>
                    <span className="block text-[11.5px] leading-snug text-gray-2">
                      {t(`proof.${k}.note`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-7 max-w-4xl text-[12px] leading-relaxed text-gray-2">
          {t("proof.caveat")}
        </p>
      </section>

      {/* ============ 3. THE SHAPE OF A DEAL ============ */}
      <section className="container-px border-t border-white/10 py-11">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="eyebrow">{t("shape.eyebrow")}</p>
            <h2
              className="serif text-white mt-3"
              style={{ fontSize: "clamp(23px, 2.3vw, 31px)", fontWeight: 500, lineHeight: 1.12 }}
            >
              {t("shape.heading")}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-gray-2">{t("shape.lead")}</p>
          </div>
          <Link href="/marketplace" className="btn-ghost-light">
            {t("shape.cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Said in the copy and said in the markup: these are not listings. */}
        <p className="mt-8 flex items-start gap-2 text-[11px] uppercase leading-relaxed text-gray-2" style={{ letterSpacing: "0.12em" }}>
          <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-gold" />
          <span>{t("shape.sampleLabel")}</span>
        </p>

        <Reveal>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <article key={ex.key} className="glass-tight p-6" aria-label={t("shape.sampleLabel")}>
                <div className="flex items-center justify-between gap-3">
                  <span className="badge-navy">{t(`shape.type.${ex.type}`)}</span>
                  <span className="mono text-[11px] tabular-nums text-gray-2">
                    {t("shape.fields.hs")} {ex.hs}
                  </span>
                </div>

                <h3 className="serif text-white mt-4 text-[19px] leading-snug" style={{ fontWeight: 500 }}>
                  {t(`shape.${ex.key}.product`)}
                </h3>

                <p
                  className="mono text-gold mt-4 tabular-nums"
                  style={{ fontSize: "clamp(26px, 2.5vw, 32px)", lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  {t(`shape.${ex.key}.quantity`)}
                </p>
                <p className="mt-1.5 text-[12px] text-gray-2">{t(`shape.${ex.key}.frequency`)}</p>

                <dl className="mt-5 border-t border-white/10 text-[12.5px]">
                  <div className="flex justify-between gap-4 border-b border-white/10 py-2.5">
                    <dt className="shrink-0 text-gray-2">{t("shape.fields.incoterm")}</dt>
                    <dd className="mono text-right text-cream">{ex.incoterm}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/10 py-2.5">
                    <dt className="shrink-0 text-gray-2">{t("shape.fields.corridor")}</dt>
                    <dd className="mono text-right text-cream">
                      {t("shape.fields.corridorValue", { from: ex.origin, to: ex.destination })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/10 py-2.5">
                    <dt className="shrink-0 text-gray-2">{t("shape.fields.payment")}</dt>
                    <dd className="text-right text-cream">{t(`shape.${ex.key}.payment`)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-gray-2">{t("shape.fields.role")}</dt>
                    <dd className="text-right text-cream">{t(`shape.${ex.key}.role`)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ 4. HOW A DEAL MOVES ============ */}
      <section className="container-px border-t border-white/10 py-11">
        <Reveal>
          <p className="eyebrow">{t("flow.eyebrow")}</p>
          <h2
            className="serif text-white mt-3"
            style={{ fontSize: "clamp(23px, 2.3vw, 31px)", fontWeight: 500, lineHeight: 1.12 }}
          >
            {t("flow.heading")}
          </h2>
        </Reveal>
        <div className="mt-9">
          <ProcessFlow />
        </div>
      </section>

      {/* ============ 5. THE DESK ============ */}
      <section className="container-px border-t border-white/10 py-11 pb-20">
        <p className="eyebrow">{t("desk.eyebrow")}</p>
        <h2
          className="serif text-white mt-3 max-w-3xl"
          style={{ fontSize: "clamp(23px, 2.3vw, 31px)", fontWeight: 500, lineHeight: 1.12 }}
        >
          {t("desk.heading")}
        </h2>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="glass flex flex-col p-7">
            <h3 className="serif text-white text-[20px]" style={{ fontWeight: 500 }}>
              {t("desk.free.title")}
            </h3>
            <p
              className="mono mt-2 text-[10px] uppercase text-gold"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("desk.free.terms")}
            </p>
            <p className="mt-4 flex-1 text-[13.5px] leading-relaxed text-gray-2">
              {t("desk.free.body")}
            </p>
            <div className="mt-6">
              <Link href="/marketplace/new" className="btn-gold">
                {t("desk.free.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="glass flex flex-col p-7">
            <h3 className="serif text-white text-[20px]" style={{ fontWeight: 500 }}>
              {t("desk.mandate.title")}
            </h3>
            <p
              className="mono mt-2 text-[10px] uppercase text-gold"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("desk.mandate.terms")}
            </p>
            <p className="mt-4 flex-1 text-[13.5px] leading-relaxed text-gray-2">
              {t("desk.mandate.body")}
            </p>
            <div className="mt-6">
              <Link href="/pricing" className="btn-ghost-light">
                {t("desk.mandate.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-5 text-[12px] text-gray-2">{t("desk.currency")}</p>
      </section>
    </>
  );
}
