import type { VerificationResult } from "@/lib/verification/types";
import { buildVerificationTrail, tierFromResultOnly, tierBadge, type TrailState } from "@/lib/network/verification-tiers";

const TONE: Record<TrailState, string> = {
  pass: "text-positive", clear: "text-positive", active: "text-positive",
  review: "text-gold", partial: "text-gold",
  hit: "text-negative", fail: "text-negative", none: "text-negative",
};
const STATE_LABEL: Record<TrailState, string> = {
  pass: "PASS", clear: "CLEAR", active: "ACTIVE", review: "REVIEW",
  partial: "PARTIAL", hit: "HIT", fail: "FAIL", none: "NONE",
};

export function TierBadge({ tier }: { tier: number }) {
  const b = tierBadge(Math.max(0, Math.min(4, tier)) as 0 | 1 | 2 | 3 | 4);
  return (
    <span className="badge-gold" title={`Tier ${b.roman} · ${b.label}`}>
      Tier {b.roman} · {b.label}
    </span>
  );
}

export function VerificationTrail({ result }: { result: VerificationResult }) {
  const trail = buildVerificationTrail(result);
  const tier = tierFromResultOnly(result);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Verification trail</span>
        <TierBadge tier={tier} />
      </div>
      <ul className="divide-y divide-white/10">
        {trail.map((row) => (
          <li key={row.key} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{row.label}</p>
              <p className="text-[12px] text-gray-2 truncate">{row.detail}</p>
            </div>
            <span className={`mono text-[11px] font-semibold ${TONE[row.state]}`}>{STATE_LABEL[row.state]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
