import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import type { VerificationLevel, RiskCategory, AccountType } from "@/lib/types/network";
import { verifiedTraderLabel } from "@/lib/network/verification-levels";

const LEVEL_LABEL: Record<VerificationLevel, string> = {
  unverified: "Unverified",
  email_verified: "Email verified",
  phone_verified: "Phone verified",
  company_verified: "Company verified",
  fully_verified: "Fully verified",
};

export function TrustBadge({
  trustScore, level, risk, verifiedTrader, accountType,
}: {
  trustScore: number;
  level: VerificationLevel;
  risk: RiskCategory;
  verifiedTrader?: boolean;
  accountType?: AccountType | null;
}) {
  const Icon = level === "fully_verified" || level === "company_verified" ? ShieldCheck
    : risk === "high" || risk === "blocked" ? ShieldAlert : Shield;
  const tone = trustScore >= 75 ? "text-positive" : trustScore >= 50 ? "text-gold" : "text-gray-2";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tone}`} />
        <span className={`serif text-2xl ${tone}`} style={{ fontWeight: 500 }}>{trustScore}</span>
        <span className="mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.18em" }}>/ 100 trust</span>
      </div>
      <span className="badge">{LEVEL_LABEL[level]}</span>
      {verifiedTrader && <span className="badge-gold">{verifiedTraderLabel(accountType ?? null)}</span>}
    </div>
  );
}
