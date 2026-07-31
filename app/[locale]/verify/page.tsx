import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { getBalance, COST_VERIFICATION_L2 } from "@/lib/credits";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import PonteShell from "@/components/shell/PonteShell";
import VerifyForm, { type VerifyPurpose } from "@/components/VerifyForm";
import "@/components/verify/verify.css";

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
 *
 * This route used to render the legacy obsidian application. A member who
 * reached the last blocker on a deal, business verification, left the cream
 * editorial product mid-task and landed in the old black-and-lime one: same
 * session, same job, different product. It now mounts the shared PonteShell
 * like every other public route. Nothing about what a verification means,
 * costs or claims changed with the paint.
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

/** The two services, as the choice screen states them. */
const CHOICES: { purpose: VerifyPurpose; href: string; num: string; body: string }[] = [
  {
    purpose: "member_business",
    href: "/verify?for=business",
    num: "01",
    body: "Verify the business you represent. Sets your Business checked status.",
  },
  {
    purpose: "counterparty_check",
    href: "/verify?for=counterparty",
    num: "02",
    body: "A private check on another company. Does not change your account.",
  },
];

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

  // Verifying the member's OWN business is free (ADR-0018, Issue #135), so this
  // page performs no balance read on that path and passes no cost to the form.
  // The balance is read only for the paid counterparty check, which keeps its
  // commercial rule unchanged.
  const isPaid = mode === "counterparty_check";
  let balance: number | null = null;
  if (user && isPaid) {
    try {
      balance = await getBalance(user.id);
    } catch (err) {
      console.error("[ponte] balance read failed on /verify:", err);
    }
  }

  const heading = mode ? MODE[mode].title : t("request.heading");
  const intro = mode ? MODE[mode].intro : t("request.intro");

  return (
    <PonteShell locale={params.locale}>
      <div className="vwrap">
        <div className="fphead__eb">
          <span className="fphead__rule" aria-hidden="true" />
          <span className="eyebrow">{t("request.pill")}</span>
        </div>
        <h1 className="fphead__h serif">{heading}</h1>
        <p className="fphead__def">{intro}</p>

        {mode ? (
          <Link className="vback" href="/verify">
            Both verification types
          </Link>
        ) : (
          <Link className="vback" href="/verification">
            {t("request.explainerLink")}
          </Link>
        )}

        <div className="vbody">
          {!mode ? (
            // The deliberate choice. Two distinct services, not a preselected
            // one, and unboxed in the manner of the rest of the journey.
            <ul className="vchoices">
              {CHOICES.map((c) => (
                <li key={c.purpose}>
                  <Link className="vchoice" href={c.href}>
                    <span className="vchoice__n" aria-hidden="true">{c.num}</span>
                    <span className="vchoice__b">
                      <span className="vchoice__t serif">{MODE[c.purpose].title}</span>
                      <span className="vchoice__d">{c.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : user ? (
            <VerifyForm
              balance={balance}
              cost={isPaid ? COST_VERIFICATION_L2 : null}
              purpose={mode}
            />
          ) : (
            // Signed out. The service is still explained, because a member who
            // cannot act yet should still learn what the act would be.
            <div className="vgate">
              <h2 className="vgate__t serif">{t("request.signedOut.heading")}</h2>
              {/* Purpose-aware, because the two acts differ commercially:
                  verifying your own business is free, a counterparty check is
                  paid. The generic line is used only before a choice is made. */}
              <p className="vgate__p">
                {mode === "member_business"
                  ? t("request.signedOut.bodyBusiness")
                  : mode === "counterparty_check"
                    ? t("request.signedOut.bodyCounterparty")
                    : t("request.signedOut.body")}
              </p>
              <Link
                className="fbtn"
                href={`/login?next=/verify?for=${searchParams.for}`}
              >
                {t("request.signedOut.button")}
              </Link>
            </div>
          )}

          {/* The disclaimer is the one thing here a redesign must not soften:
              it says what a verification is NOT. */}
          <div className="vdisc">
            <p className="vdisc__h">{t("request.disclaimerHeading")}</p>
            <p className="vdisc__p">{VERIFICATION_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </PonteShell>
  );
}
