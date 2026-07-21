import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Store, Briefcase, CalendarClock, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pricing",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/pricing", params.locale),
  };
}

export default async function PricingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pricing");

  return (
    <>
      <section className="container-px pt-16 pb-10">
        <span className="pill">{t("pill")}</span>
        <h1 className="serif text-white mt-6 mb-4 max-w-2xl" style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}>
          {t.rich("title", {
            em: (chunks) => (
              <em className="text-gold italic" style={{ fontWeight: 400 }}>{chunks}</em>
            ),
          })}
        </h1>
        <p className="text-[17px] text-gray-2 max-w-xl">
          {t("intro")}
        </p>
      </section>

      <section className="container-px pb-12">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* Free marketplace */}
          <div className="glass p-7 flex flex-col ring-1 ring-gold/40">
            <Store className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>{t("marketplace.name")}</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>{t("marketplace.price")}</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>{t("marketplace.terms")}</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              {t("marketplace.body")}
            </p>
            <Link href="/marketplace/new" className="btn-gold mt-6">{t("marketplace.cta")} <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {/* Ponte AI */}
          <div className="glass p-7 flex flex-col">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>{t("ai.name")}</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>$19<span className="text-[15px] text-gray-2">{t("ai.period")}</span></div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>{t("ai.terms")}</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              {t("ai.body")}
            </p>
            <a
              href={process.env.NEXT_PUBLIC_AI_PAYMENT_LINK || "/contact?engagement=ai"}
              className="btn-gold mt-6"
            >
              {t("ai.cta")} <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Success fee */}
          <div className="glass p-7 flex flex-col">
            <Briefcase className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>{t("desk.name")}</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>{t("desk.price")}</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>{t("desk.terms")}</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              {t("desk.body")}
            </p>
            <Link href="/contact?engagement=desk" className="btn-ghost-light mt-6">{t("desk.cta")} <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {/* Retainer */}
          <div className="glass p-7 flex flex-col">
            <CalendarClock className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>{t("retainer.name")}</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>{t("retainer.price")}</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>{t("retainer.terms")}</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              {t("retainer.body")}
            </p>
            <Link href="/contact?engagement=retainer" className="btn-ghost-light mt-6">{t("retainer.cta")} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-gray-2 max-w-2xl">
          {t("footnote")}
        </p>
      </section>
    </>
  );
}
