import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { getBalance, COST_VERIFICATION_L2 } from "@/lib/credits";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import VerifyForm, { type VerifyPurpose } from "@/components/VerifyForm";
import "@/components/desk/desk.css";
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
 * This route has now moved onto the Desk, which is the approved Ponte
 * generation (Issue #135, required outcome 3). It previously mounted the
 * intermediate PonteShell, so a member who reached the last blocker on a deal,
 * business verification, left the Desk mid-task and landed in an earlier
 * generation of the same product: same session, same job, different chrome. It
 * now renders the same command bar, the same surfaces and the same controls as
 * /account and /opportunities.
 *
 * The rail is null deliberately. Verification is a condition a deal waits on,
 * not a station in either authoritative journey (`find`, `submit`), and
 * lib/desk/journey.ts is explicit that a screen with no journey gets no rail
 * rather than an invented one.
 *
 * Nothing about what a verification means, costs or claims changed with the
 * chrome. Verifying the member's own business remains free.
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
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null} objective={null}>
        <section className="sec">
          <div className="sech">
            <div>
              <p className="kicker">{t("request.pill")}</p>
              <h1 className="vh1">
                <PonteIcon name="evidence.evreview" size={18} />
                {heading}
              </h1>
              <p className="d">{intro}</p>
            </div>
            {mode ? (
              <Link href="/verify">Both verification types</Link>
            ) : (
              <Link href="/verification">{t("request.explainerLink")}</Link>
            )}
          </div>

          {!mode ? (
            // The deliberate choice. Two distinct services, not a preselected
            // one, each on its own raised record surface.
            <ul className="vchoices">
              {CHOICES.map((c) => (
                <li key={c.purpose}>
                  <Link className="vchoice" href={c.href}>
                    <span className="vchoice__n mono" aria-hidden="true">{c.num}</span>
                    <span className="vchoice__b">
                      <span className="vchoice__t">{MODE[c.purpose].title}</span>
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
            <div className="empty">
              <PonteIcon name="profile.account" size={24} />
              <div>
                <b>{t("request.signedOut.heading")}</b>
                {/* Purpose-aware, because the two acts differ commercially:
                    verifying your own business is free, a counterparty check is
                    paid. The generic line is used only before a choice is made. */}
                <p>
                  {mode === "member_business"
                    ? t("request.signedOut.bodyBusiness")
                    : mode === "counterparty_check"
                      ? t("request.signedOut.bodyCounterparty")
                      : t("request.signedOut.body")}
                </p>
                <div className="empty__a">
                  <Link
                    className="b"
                    href={`/login?next=/verify?for=${searchParams.for}`}
                  >
                    {t("request.signedOut.button")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* The disclaimer is the one thing here a redesign must not soften:
              it says what a verification is NOT. It keeps a panel of its own so
              it cannot be quietly demoted into body copy. */}
          <div className="panel vdisc">
            <div className="panel__h">
              <PonteIcon name="evidence.evprov" size={16} />
              <b>{t("request.disclaimerHeading")}</b>
            </div>
            <p className="vdisc__p">{VERIFICATION_DISCLAIMER}</p>
          </div>
        </section>
      </DeskShell>
    </div>
  );
}
