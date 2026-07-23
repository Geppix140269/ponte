import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, ShieldAlert, UserCircle2 } from "lucide-react";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <section className="container-px py-20">
        <div className="glass p-12 max-w-xl mx-auto text-center">
          <UserCircle2 className="mx-auto h-10 w-10 text-gold" />
          <h1
            className="serif text-white mt-5"
            style={{ fontSize: 32, fontWeight: 500 }}
          >
            Your account
          </h1>
          <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">
            Sign-in activates once Supabase Auth is connected. Add your
            Supabase keys to enable accounts.
          </p>
          <Link href="/pricing" className="btn-gold mt-8">
            See what the desk offers
          </Link>
        </div>
      </section>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: myListings } = await supabase
    .from("listings")
    .select("id, ref, type, product, status")
    .order("created_at", { ascending: false })
    .limit(10);

  // Business status (Block B). The badge is only real when it rests on the
  // member's own business verification, so it is read from
  // business_verification_id, not from the level alone: a level with no bound
  // member-business case is not a Business checked badge. Read with the service
  // role, scoped to this member, so RLS on verifications cannot blank it.
  const adminSb = createAdminClient();
  const { data: profile } = await adminSb
    .from("profiles")
    .select("verification_level, verified_at, business_verification_id")
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
  const businessVerified = Boolean(businessCheck);

  // The report-era "delivered files" section is gone with the shop. The
  // orders table was checked before deletion: zero rows, so there is no
  // account anywhere with a file this section could have shown.

  return (
    <section className="container-px py-14 lg:py-20">
      <header className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <span className="pill">Account</span>
          <h1
            className="serif text-white mt-5"
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
            }}
          >
            Your account
          </h1>
          <p className="mono text-[12px] text-gray-2 mt-2">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-ghost-light">
            Sign out
          </button>
        </form>
      </header>

      {/* Business status (Block B). Prompts an unverified founding member to
          verify their own business, which is what a Business checked badge
          means and what unlocks publishing and introductions. */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-6">
        <div className="num-italic">01 / Business</div>
        <h2 className="serif text-white" style={{ fontSize: 28, fontWeight: 500 }}>
          Business status
        </h2>
      </div>
      {businessVerified ? (
        <div className="glass p-6 mb-4">
          <p className="flex items-center gap-2 text-[11px] uppercase text-positive" style={{ letterSpacing: "0.16em" }}>
            <BadgeCheck className="h-4 w-4" /> Business checked
          </p>
          <p className="mt-3 text-[15px] text-cream">{businessCheck!.subject}</p>
          <p className="mt-1 text-[13px] text-gray-2">
            {businessCheck!.country ? `${businessCheck!.country} · ` : ""}
            {businessCheck!.decidedAt
              ? `Checked ${new Date(businessCheck!.decidedAt).toLocaleDateString("en-GB")}`
              : "Checked"}
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-gray-2">
            This badge rests on the verification of your own business. Checking another
            company does not change it.
          </p>
        </div>
      ) : (
        <div
          className="mb-4 rounded-2xl border p-6"
          style={{ background: "rgba(232,160,32,0.08)", borderColor: "rgba(232,160,32,0.35)" }}
        >
          <p className="flex items-center gap-2 text-[11px] uppercase text-gold" style={{ letterSpacing: "0.16em" }}>
            <ShieldAlert className="h-4 w-4" /> Not verified yet
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-cream">
            Your business is not verified yet. Verifying the business you represent is what
            earns your Business checked badge and lets you publish an opportunity and
            receive an introduction. Checking another company does not verify you.
          </p>
          <Link href="/verify?for=business" className="btn-gold mt-5 inline-flex">
            Verify my business <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Marketplace listings */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-6 mt-12">
        <div className="num-italic">02 / Marketplace</div>
        <h2
          className="serif text-white"
          style={{ fontSize: 28, fontWeight: 500 }}
        >
          Your listings
        </h2>
      </div>
      {(myListings ?? []).length === 0 ? (
        <p className="text-[13px] text-gray-2 mb-4">
          Nothing submitted yet. Offers and requirements you submit are
          reviewed by the Ponte desk before they are published.
        </p>
      ) : (
        <ul className="glass divide-y divide-white/10 mb-4">
          {(myListings ?? []).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-[14px]">
              <span className="mono text-[12px] text-gold">{l.ref}</span>
              <span className="badge uppercase">{l.type}</span>
              <span className="flex-1 text-cream">{l.product}</span>
              <span className="text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.14em" }}>
                {l.status === "submitted" ? "in vetting" : l.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/marketplace" className="btn-gold mb-12 inline-flex">
        Go to the marketplace
      </Link>

    </section>
  );
}
