import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Mail, FileText } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "contact",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/contact", params.locale),
  };
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { engagement?: string; product?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("contact");

  // The Analyst Desk's strategy intensive went with /advisory. The retainer
  // did not: it is still an engagement on /pricing, so it still gets its own
  // opening line here.
  const key = searchParams.engagement ?? searchParams.product ?? "";
  const lead = key === "retainer" ? t("lead.retainer") : t("lead.default");

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20">
        <span className="pill">{t("pill")}</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          {t("title")}
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-2xl">{lead}</p>
      </header>

      <section className="container-px pb-24">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass p-8 flex flex-col ring-1 ring-gold/40">
            <FileText className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>{t("deal.title")}</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              {t("deal.body")}
            </p>
            <Link href="/marketplace" className="btn-gold mt-6">
              {t("deal.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="glass p-8 flex flex-col">
            <Mail className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>{t("email.title")}</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              {t("email.body")}
            </p>
            <a
              href={`mailto:hello@ponte.trade${key ? `?subject=${encodeURIComponent(t("email.subject", { topic: key }))}` : ""}`}
              className="btn-ghost-light mt-6"
            >
              hello@ponte.trade
            </a>
          </div>

        </div>
      </section>
    </>
  );
}
