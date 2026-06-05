import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Building2, Globe2, Boxes } from "lucide-react";
import { getPublicProfile, getApprovedVerifications } from "@/lib/network/profile";
import { computeVerificationLevel, isVerifiedTrader } from "@/lib/network/verification-levels";
import { TrustBadge } from "@/components/network/TrustBadge";
import type { VerificationKind, VerificationLevel } from "@/lib/types/network";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Company profile", robots: { index: false } };

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const profile = await getPublicProfile(params.id);
  if (!profile) notFound();

  const approved = await getApprovedVerifications(params.id);
  const level = (profile.verification_level as VerificationLevel)
    ?? computeVerificationLevel(approved as VerificationKind[]);
  const verified = isVerifiedTrader(level, profile.account_type ?? null);

  return (
    <section className="container-px py-16 max-w-container mx-auto">
      <div className="glass p-8 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="serif text-white" style={{ fontSize: 34, fontWeight: 500 }}>
              {profile.full_name ?? "Unnamed trader"}
            </h1>
            {profile.title && <p className="mt-1 text-[15px] text-gray-2">{profile.title}</p>}
            <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-gray-2">
              {profile.company && <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-gold" />{profile.company}</span>}
              {profile.country && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gold" />{profile.country}</span>}
              {typeof profile.years_active === "number" && <span>{profile.years_active} yrs active</span>}
            </div>
          </div>
          <TrustBadge
            trustScore={profile.trust_score ?? 40}
            level={level}
            risk={(profile.risk_category as any) ?? "low"}
            verifiedTrader={verified}
            accountType={profile.account_type ?? null}
          />
        </div>

        {profile.bio && <p className="mt-8 text-[15px] leading-relaxed text-gray-2 max-w-2xl">{profile.bio}</p>}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field icon={<Boxes className="h-4 w-4 text-gold" />} label="Commodities" values={profile.commodities} />
          <Field icon={<Globe2 className="h-4 w-4 text-gold" />} label="Regions served" values={profile.regions_served} />
          <Field icon={<Globe2 className="h-4 w-4 text-gold" />} label="Languages" values={profile.languages} />
          {profile.typical_deal_size && (
            <div>
              <p className="mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.18em" }}>Typical deal size</p>
              <p className="mt-1 text-[14px] text-white">{profile.typical_deal_size}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ icon, label, values }: { icon: React.ReactNode; label: string; values?: string[] | null }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="mono text-[10px] text-gray-2 uppercase inline-flex items-center gap-1.5" style={{ letterSpacing: "0.18em" }}>{icon}{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => <span key={v} className="badge">{v}</span>)}
      </div>
    </div>
  );
}
