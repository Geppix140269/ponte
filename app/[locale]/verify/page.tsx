import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { getBalance, COST_VERIFICATION_L2 } from "@/lib/credits";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import VerifyForm from "@/components/VerifyForm";

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
 * Member facing Level 2 request page.
 *
 * The balance is read on the server so the number a member sees is the
 * ledger's own answer, not something the browser could have been told. The
 * API route checks it again before spending, because a page can be stale.
 */
export default async function VerifyPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("verification");

  const user = isSupabaseConfigured() ? await getUser() : null;

  let balance: number | null = null;
  if (user) {
    try {
      balance = await getBalance(user.id);
    } catch (err) {
      // The ledger being unreadable must not hide the form: the API route
      // is the gate that actually protects a spend.
      console.error("[ponte] balance read failed on /verify:", err);
    }
  }

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
          {t("request.heading")}
        </h1>
        <p className="max-w-2xl text-[15.5px] leading-relaxed text-gray-2">
          {t("request.intro")}
        </p>
        <Link
          href="/verification"
          className="mt-4 inline-flex items-center gap-2 text-[12px] uppercase text-gold hover:text-cream"
          style={{ letterSpacing: "0.16em" }}
        >
          {t("request.explainerLink")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section className="container-px pb-16">
        <div className="max-w-2xl">
          {user ? (
            <VerifyForm balance={balance} cost={COST_VERIFICATION_L2} />
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
              <Link href="/login?next=/verify" className="btn-gold mt-7">
                {t("request.signedOut.button")}{" "}
                <ArrowRight className="h-4 w-4" />
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
