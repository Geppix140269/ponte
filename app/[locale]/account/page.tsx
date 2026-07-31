import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { COUNTRIES } from "@/lib/countries";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import ClaimReferral from "@/components/founding/ClaimReferral";
import "@/components/desk/desk.css";

/**
 * The member's account, rebuilt on the Desk shell (single-generation cutover,
 * PR 2). It is the one personal settings surface and it carries exactly four
 * things: who the member is (profile), the business they represent (company),
 * whether that business is verified (member-business status), and the way out
 * (sign out).
 *
 * What it deliberately does NOT carry any more: the member's listings, a link
 * to a marketplace, and any credit, balance, cost or top-up language. Records
 * live at /opportunities, which is where a signed-in member now lands; the
 * marketplace pages are retiring; and member-business verification is a status,
 * not a purchase. Account is settings, not operations.
 */

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/** The Desk chrome around whatever the account page needs to say. */
function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null} objective={null}>
        {children}
      </DeskShell>
    </div>
  );
}

export default async function AccountPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  if (!isSupabaseConfigured()) {
    return (
      <AccountShell>
        <section className="sec">
          <div className="empty">
            <PonteIcon name="profile.account" size={24} />
            <div>
              <b>Accounts activate once sign-in is connected</b>
              <p>
                Sign-in becomes available when the authentication service is configured for this
                deployment. Nothing here can load until then.
              </p>
            </div>
          </div>
        </section>
      </AccountShell>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");

  // One read, with the service role, scoped to this member. The profile fields
  // are the member's own; the business badge is only real when it rests on the
  // member's own business verification, so it is read from
  // business_verification_id, not from the level alone, and read past RLS so a
  // policy on verifications cannot blank a member's own status.
  const adminSb = createAdminClient();
  const { data: profile } = await adminSb
    .from("profiles")
    .select("full_name, company, country, verification_level, verified_at, business_verification_id")
    .eq("id", user.id)
    .maybeSingle();

  let businessCheck:
    | { subject: string; country: string | null; decidedAt: string | null }
    | null = null;
  if (profile?.business_verification_id) {
    const { data: v } = await adminSb
      .from("verifications")
      .select("subject_name, subject_country, decided_at")
      .eq("id", profile.business_verification_id)
      .maybeSingle();
    if (v) {
      businessCheck = {
        subject: v.subject_name,
        country: v.subject_country,
        decidedAt: v.decided_at,
      };
    }
  }
  const businessChecked = Boolean(businessCheck);

  const countryName =
    (profile?.country && COUNTRIES.find((c) => c.code === profile.country)?.name) || null;

  return (
    <AccountShell>
      {/* Founding attribution (Block F): records once, for a genuinely new
          signup, via a route that can clear the cookie. Renders nothing. */}
      <ClaimReferral />

      <section className="sec">
        <div className="sech">
          <div>
            <p className="kicker">Account</p>
            <h2>
              <PonteIcon name="profile.account" size={18} />
              Your account
            </h2>
            <p className="d mono">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="b b--2">
              Sign out
            </button>
          </form>
        </div>

        {/* Profile and company: who the member is and the business they act for.
            Only stated facts are shown; a blank field reads "Not stated" rather
            than an inferred or empty value. */}
        <dl className="factgrid">
          <div>
            <dt>Name</dt>
            <dd className={profile?.full_name ? "" : "na"}>
              {profile?.full_name || "Not stated"}
            </dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd className={profile?.company ? "" : "na"}>
              {profile?.company || "Not stated"}
            </dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd className={countryName ? "" : "na"}>{countryName || "Not stated"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="sec">
        <div className="sech">
          <div>
            <h2>
              <PonteIcon name="evidence.evreview" size={18} />
              Member business
            </h2>
            <p className="d">
              Verifying the business you represent is what lets you publish an opportunity and
              receive an introduction. Checking another company does not verify you.
            </p>
          </div>
        </div>

        {businessChecked ? (
          <div className="panel">
            <div className="panel__h">
              <PonteIcon name="evidence.infocomplete" size={16} />
              <b>Business checked</b>
              {businessCheck!.decidedAt ? (
                <span>
                  Checked {new Date(businessCheck!.decidedAt).toLocaleDateString("en-GB")}
                </span>
              ) : null}
            </div>
            <div style={{ padding: "14px 16px" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{businessCheck!.subject}</p>
              {businessCheck!.country ? (
                <p className="d" style={{ marginTop: 4 }}>
                  {businessCheck!.country}
                </p>
              ) : null}
              <p className="d" style={{ marginTop: 10 }}>
                This status rests on the verification of your own business. Checking another company
                does not change it.
              </p>
            </div>
          </div>
        ) : (
          <div className="notice">
            <PonteIcon name="evidence.evreview" size={18} />
            <div>
              <b>Your business is not checked yet</b>
              Verify the business you represent to publish an opportunity and receive an
              introduction. This is separate from checking another company.
              <div style={{ marginTop: 12 }}>
                <Link className="b" href="/verify?for=business">
                  Verify my business
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
