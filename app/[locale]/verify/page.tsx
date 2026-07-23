import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Building2, Search, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { getBalance, COST_VERIFICATION_L2 } from "@/lib/credits";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import VerifyForm, { type VerifyPurpose } from "@/components/VerifyForm";

export const dynamic = "force-dynamic";

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
    title: t("request.meta.title"),
    description: t("request.meta.description"),
    alternates: alternatesFor("/verify", params.locale),
  };
}

/**
 * The member-facing verification request page (Block B).
 *
 * It opens on a deliberate choice, never a single blended flow: verifying the
 * member's OWN business is a different act from checking someone else's company,
 * and only the first can move the member's badge. The chosen purpose travels to
 * the form and on to the server; it is never inferred from this copy.
 *
 * `?for=business` and `?for=counterparty` select the two paths. The English
 * chrome here is Block B's; Block E folds it into the message fragments.
 */

const MODE: Record<
  VerifyPurpose,
  { title: string; intro: string }
> = {
  member_business: {
    title: "Verify my business",
    intro:
      "Verify the legal entity you represent on Ponte. A clean check sets your Business checked status, which is what lets you publish an opportunity and receive an introduction.",
  },
  counterparty_check: {
    title: "Check a counterparty",
    intro:
      "Run a private check on another company against company registers, VIES, GLEIF and the published sanctions lists. This does not verify your own business or change your account.",
  },
};

function modeFor(param: string | undefined): VerifyPurpose | null {
  if (param === "business") return "member_business";
  if (param === "counterparty") return "counterparty_check";
  return null;
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { for?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("verification");

  const mode = modeFor(searchParams?.for);
  const user = isSupabaseConfigured() ? await getUser() : null;

  let balance: number | null = null;
  if (user) {
    try {
      balance = await getBalance(user.id);
    } catch (err) {
      console.error("[ponte] balance read failed on /verify:", err);
    }
  }

  const heading = mode ? MODE[mode].title : t("request.heading");
  const intro = mode ? MODE[mode].intro : t("request.intro");

  return (
    <>
      <section className="container-px pt-16 pb-8">
        <span className="pill">{t("request.pill")}</span>
        <h1
          className="serif text-white mt-6 mb-4 max-w-2xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(36px, 5vw, 60px)",
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
          }}
        >
          {heading}
        </h1>
        <p className="max-w-2xl text-[15.5px] leading-relaxed text-gray-2">
          {intro}
        </p>
        {mode ? (
          <Link
            href="/verify"
            className="mt-4 inline-flex items-center gap-2 text-[12px] uppercase text-gold hover:text-cream"
            style={{ letterSpacing: "0.16em" }}
          >
            Both verification types <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <Link
            href="/verification"
            className="mt-4 inline-flex items-center gap-2 text-[12px] uppercase text-gold hover:text-cream"
            style={{ letterSpacing: "0.16em" }}
          >
            {t("request.explainerLink")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </section>

      <section className="container-px pb-16">
        <div className="max-w-2xl">
          {!mode ? (
            // The deliberate choice. Two distinct services, not a preselected one.
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/verify?for=business"
                className="glass flex flex-col p-7 transition-colors hover:border-gold/40"
              >
                <Building2 className="h-6 w-6 text-gold" />
                <h2 className="serif text-white mt-4" style={{ fontSize: 20, fontWeight: 500 }}>
                  Verify my business
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-gray-2">
                  Verify the business you represent. Sets your Business checked status.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase text-gold" style={{ letterSpacing: "0.16em" }}>
                  Start <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link
                href="/verify?for=counterparty"
                className="glass flex flex-col p-7 transition-colors hover:border-gold/40"
              >
                <Search className="h-6 w-6 text-gold" />
                <h2 className="serif text-white mt-4" style={{ fontSize: 20, fontWeight: 500 }}>
                  Check a counterparty
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-gray-2">
                  A private check on another company. Does not change your account.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase text-gold" style={{ letterSpacing: "0.16em" }}>
                  Start <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          ) : user ? (
            <VerifyForm balance={balance} cost={COST_VERIFICATION_L2} purpose={mode} />
          ) : (
            <div className="glass p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
              <h2
                className="serif text-white mt-5"
                style={{ fontSize: 26, fontWeight: 500 }}
              >
                {t("request.signedOut.heading")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-gray-2">
                {t("request.signedOut.body")}
              </p>
              <Link
                href={`/login?next=/verify?for=${searchParams.for}`}
                className="btn-gold mt-7"
              >
                {t("request.signedOut.button")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div
            className="mt-6 rounded-2xl border p-6"
            style={{
              background: "rgba(232,160,32,0.08)",
              borderColor: "rgba(232,160,32,0.35)",
            }}
          >
            <p
              className="text-[10px] uppercase text-gold"
              style={{ letterSpacing: "0.22em" }}
            >
              {t("request.disclaimerHeading")}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-cream">
              {VERIFICATION_DISCLAIMER}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
