import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { COUNTRIES } from "@/lib/countries";
import ClaimReferral from "@/components/founding/ClaimReferral";
import "@/components/desk/desk.css";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function detail(label: string, value: string | null | undefined) {
  return (
    <div>
      <dt
        className="mono"
        style={{ color: "var(--mute)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {label}
      </dt>
      <dd style={{ margin: "5px 0 0", color: "var(--ink)", fontSize: 14 }}>
        {value?.trim() || "Not added"}
      </dd>
    </div>
  );
}

export default async function AccountPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  if (!isSupabaseConfigured()) {
    return (
      <div className={`ponte-desk ${landingFontVars}`}>
        <DeskShell rail={null}>
          <section className="sec">
            <div className="empty">
              <PonteIcon name="profile.drafts" size={24} label="Account unavailable" />
              <div>
                <b>Account access is not configured</b>
                <p>The account surface becomes available when Ponte authentication is connected.</p>
              </div>
            </div>
          </section>
        </DeskShell>
      </div>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login?next=%2Faccount");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, company, country, business_verification_id")
    .eq("id", user.id)
    .maybeSingle();

  let businessCheck:
    | { subject: string; country: string | null; decidedAt: string | null }
    | null = null;

  if (profile?.business_verification_id) {
    const { data: verification } = await admin
      .from("verifications")
      .select("subject_name, subject_country, decided_at")
      .eq("id", profile.business_verification_id)
      .maybeSingle();

    if (verification) {
      businessCheck = {
        subject: verification.subject_name,
        country: verification.subject_country,
        decidedAt: verification.decided_at,
      };
    }
  }

  const countryName = COUNTRIES.find((country) => country.code === profile?.country)?.name;

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null}>
        <section className="sec">
          <ClaimReferral />

          <div className="sech">
            <div>
              <h2>
                <PonteIcon name="profile.drafts" size={18} label="Your account" />
                Your account
              </h2>
              <p className="d">Your identity, represented business and member-business status.</p>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="b b--2">
                Sign out
              </button>
            </form>
          </div>

          <article
            style={{
              marginTop: 12,
              padding: 22,
              background: "var(--raised)",
              border: "1px solid var(--rule-strong)",
              borderRadius: "var(--dk-radius)",
              boxShadow: "var(--e-1)",
            }}
          >
            <h3 className="serif" style={{ fontSize: 22 }}>Profile and company</h3>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "20px 28px",
                margin: "20px 0 0",
              }}
            >
              {detail("Email", user.email)}
              {detail("Full name", profile?.full_name)}
              {detail("Company", profile?.company)}
              {detail("Country", countryName ?? profile?.country)}
            </dl>
          </article>

          <article
            style={{
              marginTop: 14,
              padding: 22,
              background: "var(--raised)",
              border: `1px solid ${businessCheck ? "var(--pos-line)" : "var(--review-line)"}`,
              borderRadius: "var(--dk-radius)",
              boxShadow: "var(--e-1)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <PonteIcon name="evidence.evreview" size={20} label="Business status" />
              <div style={{ minWidth: 0 }}>
                <h3 className="serif" style={{ fontSize: 22 }}>Member-business status</h3>
                {businessCheck ? (
                  <>
                    <p style={{ marginTop: 10, fontWeight: 600, color: "var(--pos)" }}>
                      Business checked
                    </p>
                    <p className="d" style={{ marginTop: 6 }}>
                      {businessCheck.subject}
                      {businessCheck.country ? ` · ${businessCheck.country}` : ""}
                      {businessCheck.decidedAt
                        ? ` · Checked ${new Date(businessCheck.decidedAt).toLocaleDateString("en-GB")}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ marginTop: 10, fontWeight: 600, color: "var(--review)" }}>
                      Not completed
                    </p>
                    <p className="d" style={{ marginTop: 6 }}>
                      Verify the business you represent to complete your Ponte member profile.
                    </p>
                    <div style={{ marginTop: 16 }}>
                      <Link className="b" href="/verify?for=business">
                        Verify my business
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </article>
        </section>
      </DeskShell>
    </div>
  );
}
