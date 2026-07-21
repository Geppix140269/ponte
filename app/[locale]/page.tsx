import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ProcessFlow from "@/components/ProcessFlow";
import Reveal from "@/components/Reveal";
import { BridgeMark } from "@/components/Logo";
import { alternatesFor } from "@/lib/seo";
import {
  ArrowRight,
  PackageSearch,
  PackageCheck,
  LayoutGrid,
  ShieldCheck,
  FileSignature,
  BadgePercent,
} from "lucide-react";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { locale: any } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/", params.locale),
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("home");

  const TRUST = [
    { icon: ShieldCheck, label: t("trust.vetted") },
    { icon: FileSignature, label: t("trust.ncnda") },
    { icon: BadgePercent, label: t("trust.successFee") },
  ];

  return (
    <>
      {/* ============ HERO: two doors, three clicks ============ */}
      <header className="container-px pt-12 pb-10 md:pt-16 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 opacity-[0.07] hidden lg:block">
          <BridgeMark className="h-[480px] w-[480px]" />
        </div>

        <div className="relative">
          <h1
            className="serif text-white max-w-4xl"
            style={{ fontWeight: 400, fontSize: "clamp(44px, 6.5vw, 84px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
          >
            {t("hero.title")}{" "}
            <em className="text-gold italic" style={{ fontWeight: 400 }}>{t("hero.titleAccent")}</em>
          </h1>

          {/* Trust strip: icons, not paragraphs */}
          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2">
            {TRUST.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2 text-[12px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
                <item.icon className="h-4 w-4 text-gold" /> {item.label}
              </span>
            ))}
          </div>

          {/* The two doors */}
          <div className="mt-10 grid gap-5 md:grid-cols-2 max-w-4xl">
            <Link
              href="/marketplace/new?type=offer"
              className="group relative overflow-hidden rounded-2xl p-8 md:p-10 transition-transform duration-300 hover:-translate-y-1"
              style={{ background: "linear-gradient(135deg, #E8A020 0%, #C9973A 60%, #A87A22 100%)", boxShadow: "0 20px 60px rgba(232,160,32,0.25)" }}
            >
              <PackageCheck className="h-10 w-10 text-navy" />
              <h2 className="serif mt-5 text-navy" style={{ fontSize: "clamp(26px, 2.6vw, 34px)", fontWeight: 600, lineHeight: 1.05 }}>
                {t("sell.titleLine1")}<br />{t("sell.titleLine2")}
              </h2>
              <p className="mt-3 text-[13px] font-medium text-navy/80">
                {t("sell.body")}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-[12px] font-bold uppercase text-gold transition-transform duration-300 group-hover:translate-x-1" style={{ letterSpacing: "0.14em" }}>
                {t("sell.cta")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              href="/marketplace/new?type=requirement"
              className="group relative overflow-hidden rounded-2xl border border-gold/40 bg-white/5 p-8 md:p-10 transition-transform duration-300 hover:-translate-y-1 hover:border-gold"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
            >
              <PackageSearch className="h-10 w-10 text-gold" />
              <h2 className="serif mt-5 text-white" style={{ fontSize: "clamp(26px, 2.6vw, 34px)", fontWeight: 600, lineHeight: 1.05 }}>
                {t("source.titleLine1")}<br />{t("source.titleLine2")}
              </h2>
              <p className="mt-3 text-[13px] text-gray-2">
                {t("source.body")}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[12px] font-bold uppercase text-navy transition-transform duration-300 group-hover:translate-x-1" style={{ letterSpacing: "0.14em" }}>
                {t("source.cta")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          {/* Secondary door */}
          <div className="mt-5 max-w-4xl">
            <Link href="/marketplace" className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 transition-colors hover:border-gold/50">
              <LayoutGrid className="h-5 w-5 text-gold" />
              <span className="flex-1 text-[14px] text-cream">{t("board.link")}</span>
              <ArrowRight className="h-4 w-4 text-gray-2 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HOW IT WORKS: shown, not told ============ */}
      <section className="container-px py-14 border-t border-white/8">
        <Reveal>
          <p className="eyebrow text-gold">{t("process.eyebrow")}</p>
        </Reveal>
        <div className="mt-10">
          <ProcessFlow />
        </div>
      </section>

      {/* ============ ONE closing line ============ */}
      <section className="container-px py-14">
        <Reveal>
          <div className="glass p-10 md:p-12 text-center">
            <h2 className="serif text-white" style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 500 }}>
              {t("closing.title")}
            </h2>
            <div className="mt-7 flex justify-center gap-3">
              <Link href="/marketplace/new?type=offer" className="btn-gold">
                {t("closing.postDeal")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/marketplace" className="btn-ghost-light">{t("closing.seeBoard")}</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
