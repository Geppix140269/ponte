import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Icon,
  IconTile,
  PROFILE_ICON_LABELS,
  PROFILE_ICON_NAMES,
  SYSTEM_ICON_LABELS,
  SYSTEM_ICON_NAMES,
} from "@/components/icons";
import { AppIcon, BridgeMark, Wordmark } from "@/components/Logo";
import TradeRouteMap from "@/components/home/TradeRouteMap";
import LiveDealsStrip from "@/components/home/LiveDealsStrip";
import LiveDealCard, { type DealLabels } from "@/components/home/LiveDealCard";
import type { LiveDeal } from "@/lib/board/live-deals";
import { COLOR, PROFILE_CATEGORY_OF, TIER } from "@/lib/design-tokens";

/**
 * U0 sample page: every token, every glyph, every primitive on one screen so
 * the design system can be checked against the handoff bundle by eye.
 *
 * Development only. It is not translated, not linked, and not indexed, and it
 * 404s in production rather than shipping an internal reference page to the
 * public.
 */

export const metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const PALETTE = [
  { name: "Obsidian", hex: COLOR.obsidian, use: "canvas" },
  { name: "Surface", hex: COLOR.surface, use: "cards" },
  { name: "Lime", hex: COLOR.lime, use: "go / primary" },
  { name: "Violet", hex: COLOR.violet, use: "trust / AI" },
  { name: "Cyan", hex: COLOR.cyan, use: "verified" },
  { name: "Gold", hex: COLOR.gold, use: "L4 institutional" },
  { name: "Coral", hex: COLOR.coral, use: "alert only" },
];

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass mt-[18px] p-[22px]">
      <p className="display text-[12px] font-bold tracking-[0.12em] text-lime">{n}</p>
      <h2 className="display mb-4 mt-1 text-[23px]">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage({
  params,
}: {
  params: { locale: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  return (
    <div className="mx-auto max-w-[1000px] px-[18px] py-12 pb-24">
      {/* ===== Masthead ===== */}
      <div className="glass relative overflow-hidden p-11">
        <p className="display text-[12px] font-bold tracking-[0.12em] text-lime">
          PONTE DESIGN SYSTEM · U0
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <BridgeMark className="h-[86px] w-auto" title="Ponte" />
          <div>
            <Wordmark className="text-[60px] leading-none tracking-hero" />
            <p className="mt-1.5 text-[14px] text-muted">
              The verified network for cross-border trade.
            </p>
          </div>
        </div>
      </div>

      {/* ===== 01 Logo ===== */}
      <Section n="01" title="Logo">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {[
            { label: "App icon", node: <AppIcon size={88} /> },
            { label: "Mark", node: <BridgeMark className="h-[58px] w-auto" /> },
            {
              label: "Monochrome",
              node: <BridgeMark className="h-[58px] w-auto" variant="mono" />,
            },
          ].map((v) => (
            <div key={v.label}>
              <p className="label mb-2.5">{v.label}</p>
              <div className="flex h-[104px] items-center justify-center rounded-glass border border-hairline-soft bg-white/[0.03]">
                {v.node}
              </div>
            </div>
          ))}
          <div>
            <p className="label mb-2.5">On light</p>
            <div className="flex h-[104px] items-center justify-center rounded-glass bg-[#f0eee9]">
              <BridgeMark className="h-[58px] w-auto" variant="on-light" />
            </div>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          The lime pier always leads. Clear space equals one pier diameter. Do
          not recolour the piers, rotate the mark, stretch it, or place the
          gradient mark on a busy photo: use monochrome.
        </p>
      </Section>

      {/* ===== 02 Colour ===== */}
      <Section n="02" title="Colour">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {PALETTE.map((c) => (
            <div key={c.name}>
              <div
                className="h-16 rounded-xl border border-hairline"
                style={{ background: c.hex }}
              />
              <p className="mt-1.5 text-[11px] font-semibold">{c.name}</p>
              <p className="text-[10px] text-muted">{c.hex}</p>
              <p className="text-[9.5px] text-muted">{c.use}</p>
            </div>
          ))}
          <div>
            <div className="h-16 rounded-xl bg-bridge" />
            <p className="mt-1.5 text-[11px] font-semibold">Bridge grad</p>
            <p className="text-[10px] text-muted">lime / violet / cyan</p>
          </div>
        </div>

        <p className="label mt-5">Verification tier ramp</p>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4] as const).map((lvl) => (
            <span key={lvl} className={`tier tier-${lvl}`}>
              L{lvl} {TIER[lvl].label}
            </span>
          ))}
        </div>
      </Section>

      {/* ===== 03 Typography ===== */}
      <Section n="03" title="Typography">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="label mb-2.5">Space Grotesk · display</p>
            <p className="display text-[40px] leading-none">Trade without borders</p>
            <p className="mt-1.5 text-[11px] text-muted">
              Headings, hero numbers, wordmark. 500 / 600 / 700.
            </p>
          </div>
          <div>
            <p className="label mb-2.5">Inter · interface &amp; data</p>
            <p className="text-[17px] font-semibold">The quick brown fox jumps</p>
            <p className="mt-1.5 text-[20px] font-bold text-lime">
              25,000 MT · $612 · 94% · 1,240
            </p>
            <p className="mt-1.5 text-[11px] text-muted">
              Body, UI, and every figure in tabular-nums. Layout tolerates +30%
              string length for i18n.
            </p>
          </div>
        </div>
      </Section>

      {/* ===== 04 Iconography ===== */}
      <Section n="04" title="Iconography">
        <p className="label">System · 1.8px stroke, round caps, 24px grid</p>
        <div className="grid grid-cols-6 gap-x-2 gap-y-3.5 sm:grid-cols-9 lg:grid-cols-12">
          {SYSTEM_ICON_NAMES.map((name) => (
            <div key={name} className="flex flex-col items-center gap-1.5">
              <Icon name={name} size={23} className="text-lime" />
              <span className="text-center text-[8px] font-semibold leading-tight text-muted">
                {SYSTEM_ICON_LABELS[name]}
              </span>
            </div>
          ))}
        </div>

        <p className="label mt-6">Trade profiles · category-coloured</p>
        <div className="grid grid-cols-5 gap-x-2 gap-y-3.5 sm:grid-cols-9">
          {PROFILE_ICON_NAMES.map((name) => (
            <div key={name} className="flex flex-col items-center gap-1.5">
              <IconTile name={name} size={38} />
              <span className="text-center text-[8px] font-semibold leading-tight text-muted">
                {PROFILE_ICON_LABELS[name]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted">
          Principals lime · intermediaries violet · services cyan ·
          institutions gold. Category is derived from the profile, never passed
          by hand:{" "}
          <span className="text-slate">
            broker → {PROFILE_CATEGORY_OF.broker}
          </span>
          .
        </p>
      </Section>

      {/* ===== 05 Components ===== */}
      <Section n="05" title="Components">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="label mb-2.5">Buttons · credit price inline (C8)</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary">Explore board</button>
              <button className="btn-premium">
                Run check <span className="btn-credit">2 credits</span>
              </button>
              <button className="btn-ghost">Post, free</button>
            </div>
          </div>

          <div>
            <p className="label mb-2.5">Chips &amp; tiers (C2, C3)</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-navy">Offers</span>
              <span className="tier tier-2">L2 verified</span>
              <span className="tier tier-4">L4</span>
              <span className="flag-chip">BR</span>
            </div>
          </div>

          <div>
            <p className="label mb-2.5">Flexibility · Fixed / Neg / Open (C19)</p>
            <div className="flex gap-1.5">
              <span className="fx fx-fixed">FIXED</span>
              <span className="fx fx-neg">NEGOTIABLE</span>
              <span className="fx fx-open">OPEN</span>
            </div>
          </div>

          <div>
            <p className="label mb-2.5">Provenance chip (C18)</p>
            <span className="prov">
              <Icon name="ai" size={13} />
              AI-drafted · desk-reviewed
            </span>
          </div>

          <div>
            <p className="label mb-2.5">Completeness meter (C17)</p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: "82%",
                  background: "linear-gradient(90deg,#8B6BFF,#3FE0C5)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] text-muted">
              Strong listing. Two open points remain.
            </p>
          </div>

          <div>
            <p className="label mb-2.5">Chain line (C20)</p>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate">
              <Icon name="agency" size={15} className="text-violet-ink" />
              Chain: declared · mandate holder
              <span className="text-cyan">✓ desk-sighted</span>
            </p>
          </div>
        </div>

        <p className="label mt-5">Trust dial (C4) · live pulse</p>
        <div className="flex flex-wrap items-center gap-6">
          <TrustDial score={79} />
          <span className="pill">Live board</span>
          <span className="inline-flex items-center gap-2 text-[12px] text-muted">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime" />
            pulse ring, 1800ms
          </span>
        </div>
      </Section>

      {/* ===== 07 Live deals showcase =====
          Sample rows, never seeded anywhere near production. The real
          homepage reads `getLiveDeals()` and renders nothing at all when the
          board is empty; this section exists so the components can be checked
          by eye before there is inventory to check them against. It lives on
          a route that 404s in production. */}
      <Section n="07" title="Live deals showcase (sample rows)">
        <p className="mb-4 text-[11.5px] leading-relaxed text-coral">
          Sample data, for layout only. The homepage never renders a deal it
          did not read from the board.
        </p>

        <p className="label">Trade route map</p>
        <TradeRouteMap
          routes={[
            { from: "BR", to: "NL", id: "BR-NL" },
            { from: "EG", to: "BR", id: "EG-BR" },
            { from: "AE", to: "TR", id: "AE-TR" },
            { from: "IN", to: "GB", id: "IN-GB" },
            { from: "ZA", to: "CN", id: "ZA-CN" },
            { from: "US", to: "JP", id: "US-JP" },
          ]}
          className="w-full"
        />

        <p className="label mt-6">Live deals strip, member and radar</p>
        <LiveDealsStrip
          deals={SAMPLE_DEALS}
          labels={SAMPLE_LABELS}
          locale="en"
        />

        <p className="label mt-6">Cards, side by side</p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_DEALS.slice(0, 3).map((d) => (
            <LiveDealCard key={d.id} deal={d} labels={SAMPLE_LABELS} locale="en" />
          ))}
        </div>
      </Section>

      {/* ===== 06 Motion ===== */}
      <Section n="06" title="Motion">
        <dl className="grid gap-x-6 text-[12.5px] md:grid-cols-2">
          {[
            ["Entrance rise (stagger)", "translateY 18→0, fade · 600ms ease"],
            ["Bridge route draw", "stroke-dashoffset · 1500ms ease"],
            ["Trust dial sweep", "stroke-dashoffset · 1500ms ease-out"],
            ["Live pulse dot", "box-shadow ring · 1800ms loop"],
            ["Write-up regenerate", "block shimmer, layout never jumps"],
            ["Ambient glow", "static (perf) · no infinite blur loops"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-hairline-soft py-1.5"
            >
              <dt>{k}</dt>
              <dd className="text-right text-muted">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[11px] text-muted">
          All of it drops under prefers-reduced-motion.
        </p>
      </Section>
    </div>
  );
}

/**
 * Layout fixtures for section 07. Deliberately in this file and nowhere near
 * `lib/`, so there is no path by which a sample deal reaches a real surface.
 */
const SAMPLE_LABELS: DealLabels = {
  offer: "offer",
  requirement: "requirement",
  service: "service",
  notStated: "not stated",
  deskSourced: "Desk-sourced opportunity",
  tier: {
    1: "Identity verified",
    2: "Business verified",
    3: "Activity verified",
    4: "Institutional",
  },
};

const SAMPLE_DEALS: LiveDeal[] = [
  ["Refined white sugar, ICUMSA 45", "25,000", "MT", "CIF", "BR", "NL", "1701.99", 2, "offer", "member"],
  ["Urea 46% granular", "12,000", "MT", "FOB", "EG", "BR", "3102.10", 0, "requirement", "member"],
  ["Aluminium ingot A7, 99.7%", "1,000", "MT", "FOB", "AE", "TR", "7601.10", 4, "offer", "member"],
  ["Copper cathode grade A", "500", "MT", "CIF", "ZA", "CN", "7403.11", 0, "offer", "radar"],
  ["Basmati rice, 1121 sella", "8,000", "MT", "FOB", "IN", "GB", "1006.30", 3, "offer", "member"],
  ["HMS 1&2 metal scrap", "20,000", "MT", "CFR", "US", "JP", "7204.49", 0, "requirement", "radar"],
].map(
  ([product, quantity, unit, incoterm, from, to, hs, level, type, source], i) => ({
    id: `sample-${i}`,
    ref: source === "member" ? `PT-${1000 + i}` : null,
    source: source as LiveDeal["source"],
    type: type as string,
    product: product as string,
    hsCode: hs as string,
    chapter: (hs as string).slice(0, 2),
    chapterTitle: null,
    quantity: quantity as string,
    unit: unit as string,
    incoterm: incoterm as string,
    originText: from as string,
    destinationText: to as string,
    originCode: from as string,
    destinationCode: to as string,
    postedAt: `2026-07-${String(22 - i).padStart(2, "0")}T09:00:00Z`,
    verificationLevel: (level as number) || null,
    href: null,
  }),
);

/** C4, at the bundle's r=18 geometry: circumference 113. */
function TrustDial({ score }: { score: number }) {
  const offset = 113 - (113 * score) / 100;
  return (
    <div className="text-center">
      <svg width="96" height="96" viewBox="0 0 44 44">
        <defs>
          <linearGradient id="dial-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#CBFB5E" />
            <stop offset="0.5" stopColor="#8B6BFF" />
            <stop offset="1" stopColor="#3FE0C5" />
          </linearGradient>
        </defs>
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth="3.4"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="url(#dial-arc)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray="113"
          strokeDashoffset={offset}
          transform="rotate(-90 22 22)"
          className="dial-sweep"
        />
        <text
          x="22"
          y="24"
          textAnchor="middle"
          fill="#EEF1F5"
          className="display"
          style={{ font: "700 11px var(--font-space-grotesk)" }}
        >
          {score}
        </text>
      </svg>
      <p className="mt-1.5 text-[10px] text-muted">Trust score dial</p>
    </div>
  );
}
