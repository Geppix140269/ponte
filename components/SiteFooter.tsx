import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Logo from "@/components/Logo";

export default async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="mt-20">
      <div className="container-px">
        <div className="glass p-8 md:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5 md:pr-6">
              <Logo reversed size="lg" />
              <p className="mt-5 text-sm leading-relaxed text-gray-2 max-w-md">
                {t("blurb")}
              </p>
            </div>

            <div className="md:col-span-3">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                {t("deskHeading")}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/marketplace" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    {t("deskMarketplace")}
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-gray-2 transition-colors hover:text-gold">
                    {t("deskFees")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                {t("companyHeading")}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/about" className="text-sm text-gray-2 hover:text-gold">
                    {t("companyAbout")}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-2 hover:text-gold">
                    {t("companyTerms")}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-gray-2 hover:text-gold">
                    {t("companyPrivacy")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4
                className="text-[10px] uppercase text-gold mb-4 font-medium"
                style={{ letterSpacing: "0.22em" }}
              >
                {t("contactHeading")}
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-2">
                <li>
                  <Link href="/contact" className="hover:text-gold">
                    {t("contactUs")}
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@ponte.trade" className="hover:text-gold">
                    hello@ponte.trade
                  </a>
                </li>
                <li>
                  <a href="tel:+447988540104" className="hover:text-gold">
                    +44 7988 540104
                  </a>
                </li>
                <li>{t("securePayment")}</li>
              </ul>
            </div>
          </div>

          {/* Legal entities */}
          <div className="mt-10 grid gap-6 border-t border-white/10 pt-6 text-[11px] leading-relaxed text-gray-2 md:grid-cols-2">
            <div>
              <p className="text-cream font-medium">{t("entities.bulgaria.name")}</p>
              <p>{t("entities.bulgaria.address")}</p>
              <p>{t("entities.bulgaria.registration")}</p>
            </div>
            <div>
              <p className="text-cream font-medium">{t("entities.unitedKingdom.name")}</p>
              <p>{t("entities.unitedKingdom.address")}</p>
              <p>{t("entities.unitedKingdom.registration")}</p>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-white/10 pt-6 text-[11px] text-gray-2">
            <p>{t("disclaimer")}</p>
            <p className="uppercase" style={{ letterSpacing: "0.18em" }}>
              {t("copyright", { year: String(new Date().getFullYear()) })}
            </p>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </footer>
  );
}
