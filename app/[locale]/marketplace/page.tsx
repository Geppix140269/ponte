import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, FilePlus2, ShieldCheck, EyeOff, BadgeCheck, Share2, Sparkles } from "lucide-react";
import { accountBrief, isAiConfigured, type AccountBrief } from "@/lib/ai-vet";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import InterestButton from "@/components/InterestButton";
import { submitDraftAction, connectDecisionAction, reconfirmListingAction } from "./actions";
import Reveal from "@/components/Reveal";
import ProcessFlow from "@/components/ProcessFlow";
import { alternatesFor } from "@/lib/seo";
import {
  corridorEnd,
  formatPosted,
  formatQuantity,
  labelFor,
  parseVolume,
  verificationKey,
  FREQUENCY_KEYS,
  UNIT_KEYS,
} from "@/lib/listing-terms";
import { isPubliclyCurrent, reconfirmationLapsed } from "@/lib/listings/validity";
import { eligibleOwnerIds } from "@/lib/listings/public-filter";
import { INTEREST_ROLE_LABELS, type InterestRole } from "@/lib/interest/expression";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "marketplace",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/marketplace", params.locale),
  };
}

const STATUS_STYLE: Record<string, string> = {
  draft: "text-gray-2",
  submitted: "text-gold",
  approved: "text-positive",
  rejected: "text-red-400",
  closed: "text-gray-2",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ponte.trade";

// The share headline is written in the sender's language; the ref and the
// link are data and stay as they are.
function waShareUrl(headline: string, ref: string): string {
  const text = `${headline}\n${APP_URL}/marketplace/l/${encodeURIComponent(ref)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const RULES = [
  { icon: ShieldCheck, key: "vetted" },
  { icon: EyeOff, key: "anonymous" },
  { icon: BadgeCheck, key: "free" },
] as const;

// An offer and a requirement have to be told apart from across the room. The
// rail down the left of the row carries the same signal as the badge.
const TYPE_RAIL: Record<string, string> = {
  offer: "var(--gold)",
  requirement: "rgba(245,240,232,0.55)",
  service: "rgba(255,255,255,0.14)",
};

const TYPE_BADGE: Record<string, React.CSSProperties> = {
  offer: { background: "var(--gold)", color: "#0D1B2A", fontWeight: 600 },
  requirement: {
    border: "1px solid rgba(245,240,232,0.5)",
    color: "#F5F0E8",
  },
  service: { border: "1px solid rgba(255,255,255,0.18)", color: "#9CA3AF" },
};

// One grid, used by the column header and by every row, so the board lines up.
const BOARD_GRID =
  "md:grid md:grid-cols-[10.5rem_6rem_11rem_minmax(0,1fr)_10.5rem] md:gap-x-5";

// A number on the board is data, never decoration.
const COLUMN_LABEL = "text-[10px] uppercase text-gray-2/70";
const COLUMN_LABEL_STYLE = { letterSpacing: "0.18em" } as const;

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { rc?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketplace");
  const locale = await getLocale();
  // Units, frequencies and the rest are the very options the member picked in
  // the listing form. Reading their labels back out of that namespace shows
  // the reader the same words, already translated, with no second copy.
  const tf = await getTranslations("listingForm");

  // Status and type labels come from the message file, with the raw database
  // value as the fallback so an unknown value still renders.
  const STATUS_LABEL: Record<string, string> = {
    draft: t("mine.status.draft"),
    submitted: t("mine.status.submitted"),
    approved: t("mine.status.approved"),
    rejected: t("mine.status.rejected"),
    closed: t("mine.status.closed"),
  };
  const TYPE_LABEL: Record<string, string> = {
    offer: t("type.offer"),
    requirement: t("type.requirement"),
    service: t("type.service"),
  };

  const user = isSupabaseConfigured() ? await getUser() : null;

  let listings: {
    id: string;
    ref: string;
    type: string;
    product: string;
    status: string;
    created_at: string;
    decision_note: string | null;
    reconfirmed_at: string | null;
    valid_until: string | null;
  }[] = [];

  // Pending connection requests on the member's own listings, with the
  // structured expression of interest the requester sent (brief Block D).
  type PendingConnection = {
    id: string;
    interested_business: string | null;
    interest_role: string | null;
    interest_target: string | null;
    interest_geography: string | null;
    interest_reason: string | null;
  };
  const pendingByListing = new Map<string, PendingConnection[]>();
  if (user) {
    const supabase = createClient();
    const { data } = await supabase
      .from("listings")
      .select("id, ref, type, product, status, created_at, decision_note, reconfirmed_at, valid_until")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    listings = data ?? [];

    if (listings.length > 0) {
      const { data: conns } = await supabase
        .from("listing_connections")
        .select(
          "id, listing_id, interested_business, interest_role, interest_target, interest_geography, interest_reason",
        )
        .eq("status", "pending")
        .in("listing_id", listings.map((l) => l.id));
      for (const c of conns ?? []) {
        const arr = pendingByListing.get(c.listing_id) ?? [];
        arr.push({
          id: c.id,
          interested_business: c.interested_business,
          interest_role: c.interest_role,
          interest_target: c.interest_target,
          interest_geography: c.interest_geography,
          interest_reason: c.interest_reason,
        });
        pendingByListing.set(c.listing_id, arr);
      }
    }
  }

  // The AI account manager. One cached brief per member, regenerated at most
  // daily or when the listing count changes.
  //
  // This used to be free on the first listing and then locked behind a $19
  // subscription. That subscription is gone: credits pay for counterparty
  // verification and nothing else is metered, so every member gets the brief.
  // The daily cache is what keeps that affordable, not a paywall.
  let brief: AccountBrief | null = null;
  if (user && listings.length > 0 && isAiConfigured()) {
    const adminSb = createAdminClient();
    const totalPending = Array.from(pendingByListing.values()).reduce(
      (a, b) => a + b.length,
      0,
    );
    const { data: cached } = await adminSb
      .from("account_briefs")
      .select("brief, listing_count, generated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const stale =
      !cached ||
      cached.listing_count !== listings.length ||
      Date.now() - new Date(cached.generated_at).getTime() > 24 * 3600 * 1000;
    if (stale) {
      const fresh = await accountBrief({
        listings: listings.map((l) => ({
          ref: l.ref,
          type: l.type,
          product: l.product,
          status: l.status,
          days_old: Math.floor(
            (Date.now() - new Date(l.created_at).getTime()) / 86400000,
          ),
        })),
        pending_connection_requests: totalPending,
      });
      if (fresh) {
        brief = fresh;
        await adminSb.from("account_briefs").upsert({
          user_id: user.id,
          brief: fresh,
          listing_count: listings.length,
          generated_at: new Date().toISOString(),
        });
      } else if (cached) {
        brief = cached.brief as AccountBrief;
      }
    } else {
      brief = cached.brief as AccountBrief;
    }
  }

  // The live board. Members get the full listing; visitors get a
  // server-rendered teaser only (the browser never receives the rest).
  type BoardItem = {
    id: string;
    user_id: string;
    ref: string;
    type: string;
    product: string;
    hs_code: string | null;
    origin: string | null;
    destination: string | null;
    volume: string | null;
    incoterm: string | null;
    payment_terms: string | null;
    validity_type: string | null;
    valid_until: string | null;
    reconfirmed_at: string | null;
    details: string;
    created_at: string;
    full: boolean;
  };
  const BOARD_COLUMNS =
    "id, user_id, ref, type, product, hs_code, origin, destination, volume, incoterm, payment_terms, validity_type, valid_until, reconfirmed_at, details, created_at";
  // The board stays hidden from EVERYONE until it has real inventory.
  const BOARD_MIN = Number(process.env.BOARD_MIN_LISTINGS ?? 3);
  // A live count is a claim about size. It is only made once the board is
  // genuinely a board. Below this, the heading carries no number at all.
  const COUNT_MIN = 8;
  let board: BoardItem[] = [];
  let approvedCount = 0;
  // Verification level of whoever posted each listing. The level is a fact
  // about the counterparty, and it is the only thing about them the board
  // shows: the member stays anonymous until both sides agree to connect.
  const trustByUser = new Map<string, number>();
  if (isSupabaseConfigured()) {
    if (user) {
      const supabase = createClient();
      const { data } = await supabase
        .from("listings")
        .select(BOARD_COLUMNS)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      board = (data ?? []).map((l) => ({ ...l, full: true }));
    } else {
      const adminSb = createAdminClient();
      const { data } = await adminSb
        .from("listings")
        .select(BOARD_COLUMNS)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      board = (data ?? []).map((l) => ({
        ...l,
        details: l.details.length > 120 ? l.details.slice(0, 120) + "…" : l.details,
        full: false,
      }));
    }
    // Current only, on both axes: the listing (finite validity not passed AND
    // reconfirmation not lapsed) and its owner (member-business verification
    // still passing). Same rules getLiveDeals and the detail page apply, so the
    // three surfaces cannot disagree about what is live.
    board = board.filter((b) => isPubliclyCurrent(b));
    if (board.length > 0) {
      const eligible = await eligibleOwnerIds(
        createAdminClient(),
        board.map((b) => b.user_id),
      );
      board = board.filter((b) => eligible.has(b.user_id));
    }
    approvedCount = board.length;
    if (approvedCount < BOARD_MIN) {
      board = [];
    } else {
      const adminSb = createAdminClient();
      const { data: levels } = await adminSb
        .from("profiles")
        .select("id, verification_level")
        .in("id", Array.from(new Set(board.map((b) => b.user_id))));
      // A level that cannot be read is unknown, not zero. Rows without an
      // answer show no badge rather than claiming "not verified".
      for (const p of levels ?? []) {
        trustByUser.set(p.id, Number(p.verification_level ?? 0));
      }
    }
  }

  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">{t("hero.pill")}</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          {t.rich("hero.heading", {
            em: (chunks) => (
              <em className="text-gold italic" style={{ fontWeight: 400 }}>{chunks}</em>
            ),
          })}
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-2xl">
          {t("hero.intro")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link href="/marketplace/new" className="btn-gold">
              {t("hero.newListing")} <FilePlus2 className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login?next=/marketplace/new" className="btn-gold">
                {t("hero.signIn")} <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Rules */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid gap-5 md:grid-cols-3">
          {RULES.map((r, i) => (
            <Reveal key={r.key} delay={i * 120}>
              <div className="glass p-7 h-full">
                <r.icon className="h-5 w-5 text-gold" />
                <h3 className="serif text-white text-lg mt-4" style={{ fontWeight: 500 }}>{t(`rules.${r.key}.title`)}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{t(`rules.${r.key}.body`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-px py-14 border-t border-white/8">
        <p className="eyebrow text-gold">{t("how.eyebrow")}</p>
        <h2 className="serif text-white mt-3 mb-12" style={{ fontSize: 30, fontWeight: 500 }}>
          {t("how.heading")}
        </h2>
        <ProcessFlow />
      </section>

      {/* Live board */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-gold">{t("board.eyebrow")}</p>
            <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>
              {board.length === 0
                ? t("board.headingEmpty")
                : approvedCount >= COUNT_MIN
                  ? t("board.heading", { count: approvedCount })
                  : t("board.headingLive")}
            </h2>
          </div>
          {!user && board.length > 0 && (
            <Link href="/login?next=/marketplace" className="btn-ghost-light">
              {t("board.signInFull")} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {board.length === 0 ? (
          <div className="glass p-8 text-[14px] text-gray-2">
            {t("board.empty")}
          </div>
        ) : (
          <div className="glass overflow-hidden">
            {/* Column header. The four things a trader scans for, named. */}
            <div
              className={`hidden border-b border-white/10 px-5 py-3 ${BOARD_GRID}`}
            >
              <span className={COLUMN_LABEL} style={COLUMN_LABEL_STYLE}>
                {t("board.columns.quantity")}
              </span>
              <span className={COLUMN_LABEL} style={COLUMN_LABEL_STYLE}>
                {t("board.columns.terms")}
              </span>
              <span className={COLUMN_LABEL} style={COLUMN_LABEL_STYLE}>
                {t("board.columns.corridor")}
              </span>
              <span className={COLUMN_LABEL} style={COLUMN_LABEL_STYLE}>
                {t("board.columns.product")}
              </span>
              <span
                className={`${COLUMN_LABEL} md:text-right`}
                style={COLUMN_LABEL_STYLE}
              >
                {t("board.columns.posted")}
              </span>
            </div>

            <div className="divide-y divide-white/8">
              {board.map((b) => {
                const vol = parseVolume(b.volume);
                const unit = labelFor(vol.unit, UNIT_KEYS, tf);
                const freq = labelFor(vol.frequency, FREQUENCY_KEYS, tf);
                const from = corridorEnd(b.origin);
                const to = corridorEnd(b.destination);
                const level = trustByUser.get(b.user_id);

                return (
                  <div
                    key={b.id}
                    className={`relative px-5 py-4 transition-colors hover:bg-white/[0.035] ${BOARD_GRID} md:items-start`}
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-full w-[3px]"
                      style={{ background: TYPE_RAIL[b.type] ?? TYPE_RAIL.service }}
                    />
                    {/* The whole row opens the listing. Controls sit above it. */}
                    <Link
                      href={`/marketplace/l/${b.ref}`}
                      aria-label={t("board.open", { ref: b.ref })}
                      className="absolute inset-0 z-0"
                    />

                    {/* 1 · Quantity: the first thing the eye hits */}
                    <div className="min-w-0">
                      <span
                        className="badge"
                        style={TYPE_BADGE[b.type] ?? TYPE_BADGE.service}
                      >
                        {TYPE_LABEL[b.type] ?? b.type}
                      </span>
                      <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                        {vol.quantity ? (
                          <>
                            <span
                              className="mono tabular-nums text-cream"
                              style={{ fontSize: 23, letterSpacing: "-0.02em" }}
                            >
                              {vol.quantityNumeric !== null
                                ? formatQuantity(vol.quantityNumeric, locale)
                                : vol.quantity}
                            </span>
                            {unit && (
                              <span className="mono text-[12px] text-gray-2">
                                {unit}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[13px] text-gray-2/55">
                            {t("notStated")}
                          </span>
                        )}
                      </p>
                      {freq && (
                        <p className="mt-0.5 text-[11px] text-gray-2/80">{freq}</p>
                      )}
                    </div>

                    {/* 2 · Incoterm and payment terms */}
                    <div className="mt-3 md:mt-0">
                      {b.incoterm ? (
                        <span
                          className="mono inline-flex items-center rounded-[6px] px-2.5 py-1 text-[12px] text-gold"
                          style={{
                            background: "rgba(201,151,58,0.12)",
                            border: "1px solid rgba(201,151,58,0.4)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {b.incoterm}
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-2/55">
                          {t("notStated")}
                        </span>
                      )}
                      {b.payment_terms && (
                        <p className="mt-1 text-[11px] leading-snug text-gray-2/80">
                          {b.payment_terms}
                        </p>
                      )}
                    </div>

                    {/* 3 · Corridor. Codes are data, so they stay left to right. */}
                    <div
                      dir="ltr"
                      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 md:mt-0"
                      title={[from.text, to.text].filter(Boolean).join(" > ")}
                    >
                      {from.code ? (
                        <span className="mono text-[14px] text-cream">
                          {from.code}
                        </span>
                      ) : from.text ? (
                        <span className="text-[12.5px] text-cream">{from.text}</span>
                      ) : (
                        <span className="text-[11px] text-gray-2/55">
                          {t("notStated")}
                        </span>
                      )}
                      <ArrowRight className="h-3 w-3 shrink-0 text-gold/70" />
                      {to.code ? (
                        <span className="mono text-[14px] text-cream">{to.code}</span>
                      ) : to.text ? (
                        <span className="text-[12.5px] text-cream">{to.text}</span>
                      ) : (
                        <span className="text-[11px] text-gray-2/55">
                          {t("notStated")}
                        </span>
                      )}
                    </div>

                    {/* 4 · What it is, and how to quote it */}
                    <div className="mt-3 min-w-0 md:mt-0">
                      <p className="line-clamp-2 text-[15px] leading-snug text-cream">
                        {b.product}
                      </p>
                      <p className="mono mt-1 flex flex-wrap items-center gap-x-3 text-[11px]">
                        <span className="text-gold">{b.ref}</span>
                        {b.hs_code && (
                          <span className="text-gray-2">HS {b.hs_code}</span>
                        )}
                      </p>
                      <p
                        className={`mt-1.5 line-clamp-1 text-[12px] ${b.full ? "text-gray-2/85" : "text-gray-2/65"}`}
                      >
                        {b.details}
                        {!b.full && (
                          <span className="ml-1.5 text-gold">
                            {t("board.signInToRead")}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* 5 · When it was posted, who posted it, what to do next */}
                    <div className="relative z-10 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 md:mt-0 md:flex-col md:items-end md:gap-1.5">
                      <span className="mono tabular-nums text-[11px] text-gray-2/85">
                        {formatPosted(b.created_at, locale)}
                      </span>
                      {level !== undefined && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase ${level > 0 ? "text-gray-2" : "text-gray-2/55"}`}
                          style={{ letterSpacing: "0.12em" }}
                        >
                          <ShieldCheck
                            className={`h-3 w-3 shrink-0 ${level > 0 ? "text-gold" : "text-gray-2/50"}`}
                          />
                          {t(verificationKey(level))}
                        </span>
                      )}
                      {/*
                        Everyone gets the button, signed in or not. An
                        anonymous visitor presses it and meets the account
                        gate at that moment, which is the trigger map's whole
                        shape: go as deep as possible anonymously, and be
                        asked who you are only at the point of action. The
                        "sign in to respond" link that used to sit here was
                        the wall that rule exists to remove.
                      */}
                      <InterestButton refCode={b.ref} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* My listings */}
      {user && (
        <section className="container-px py-12 border-t border-white/8">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="eyebrow text-gold">{t("mine.eyebrow")}</p>
              <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>
                {listings.length > 0 ? t("mine.heading") : t("mine.headingEmpty")}
              </h2>
            </div>
            <Link href="/marketplace/new" className="btn-ghost-light">
              {t("mine.newListing")} <FilePlus2 className="h-4 w-4" />
            </Link>
          </div>

          {searchParams.rc === "ok" && (
            <div className="mb-4 rounded-xl border border-positive/40 bg-positive/10 p-4 text-[13px] text-cream">
              Reconfirmed. The opportunity is current again and back on the public board.
            </div>
          )}
          {searchParams.rc === "blocked" && (
            <div className="mb-4 rounded-xl border border-negative/40 bg-negative/10 p-4 text-[13px] text-cream">
              It could not be reconfirmed automatically: it no longer meets the publication criteria (for example your business verification is not current). It needs Ponte review.
            </div>
          )}

          {brief && (
            <div className="glass mb-4 p-6" style={{ borderColor: "rgba(232,160,32,0.3)" }}>
              <p className="flex items-center gap-2 text-[10px] uppercase text-gold" style={{ letterSpacing: "0.2em" }}>
                <Sparkles className="h-3.5 w-3.5" /> {t("ai.label")}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-cream">{brief.summary}</p>
              {brief.next_actions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {brief.next_actions.map((a) => (
                    <p key={a} className="flex gap-2 text-[13px] leading-relaxed text-gray-2">
                      <span className="text-gold">→</span> {a}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {listings.length === 0 ? (
            <div className="glass p-8 text-[14px] text-gray-2">
              {t("mine.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((l) => (
                <div key={l.id} className="glass p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="mono text-[12px] text-gold">{l.ref}</span>
                    <span className="badge uppercase">{TYPE_LABEL[l.type] ?? l.type}</span>
                    <span className="flex-1 text-[14px] text-cream">{l.product}</span>
                    <span
                      className={`text-[11px] uppercase ${STATUS_STYLE[l.status] ?? "text-gray-2"}`}
                      style={{ letterSpacing: "0.16em" }}
                    >
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                  {l.status === "rejected" && l.decision_note && (
                    <p className="mt-3 border-l-2 border-gold/40 pl-3 text-[13px] leading-relaxed text-gray-2">
                      {l.decision_note}
                    </p>
                  )}
                  {l.status !== "closed" && (
                    <Link
                      href={`/marketplace/new?edit=${l.id}`}
                      className="mt-3 mr-4 inline-flex items-center gap-2 text-[11px] uppercase text-gray-2 hover:text-gold"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      Edit
                    </Link>
                  )}
                  {l.status === "approved" && (
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-2/70">
                      Editing a live opportunity{"'"}s terms returns it to Ponte for review before it goes public again.
                    </p>
                  )}
                  {l.status === "approved" && reconfirmationLapsed(l.reconfirmed_at) && (
                    <div
                      className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] px-4 py-3"
                      style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.35)" }}
                    >
                      <span className="flex-1 text-[12px] leading-relaxed text-cream">
                        This opportunity is awaiting reconfirmation and is currently hidden from the public board. Reconfirm it if nothing has changed.
                      </span>
                      <form action={reconfirmListingAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="btn-gold !px-4 !py-2 text-[12px]">Reconfirm</button>
                      </form>
                    </div>
                  )}
                  {l.status === "draft" && (
                    <form action={submitDraftAction} className="mt-3">
                      <input type="hidden" name="id" value={l.id} />
                      <button className="text-[11px] uppercase text-gold hover:text-cream" style={{ letterSpacing: "0.16em" }}>
                        {t("mine.submitForVetting")}
                      </button>
                    </form>
                  )}
                  {l.status === "approved" && (
                    <a
                      href={waShareUrl(
                        t("mine.shareText", { product: l.product, ref: l.ref }),
                        l.ref,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase text-gold hover:text-cream"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      <Share2 className="h-3.5 w-3.5" /> {t("mine.shareWhatsApp")}
                    </a>
                  )}
                  {(pendingByListing.get(l.id) ?? []).map((c, i) => {
                    const roleLabel = c.interest_role
                      ? INTEREST_ROLE_LABELS[c.interest_role as InterestRole] ?? c.interest_role
                      : null;
                    // A pre-Block-D row carries none of these; fall back to the
                    // original one-line notice so an old request still reads.
                    const structured =
                      c.interested_business ||
                      c.interest_target ||
                      c.interest_geography ||
                      c.interest_reason;
                    return (
                      <div
                        key={c.id}
                        className="mt-3 rounded-[10px] px-4 py-3"
                        style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.35)" }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {structured ? (
                              <>
                                <p className="text-[13px] text-cream">
                                  <span className="text-gold">{c.interested_business || "A vetted member"}</span>
                                  {roleLabel && (
                                    <span className="text-gray-2"> · {roleLabel}</span>
                                  )}
                                  {" wants to connect."}
                                </p>
                                <dl className="mt-2 grid gap-x-4 gap-y-1 text-[12px] text-gray-2 sm:grid-cols-2">
                                  {c.interest_target && (
                                    <div>
                                      <dt className="inline text-gray-2/60">Target: </dt>
                                      <dd className="inline text-cream/90">{c.interest_target}</dd>
                                    </div>
                                  )}
                                  {c.interest_geography && (
                                    <div>
                                      <dt className="inline text-gray-2/60">Geography: </dt>
                                      <dd className="inline text-cream/90">{c.interest_geography}</dd>
                                    </div>
                                  )}
                                  {c.interest_reason && (
                                    <div className="sm:col-span-2">
                                      <dt className="inline text-gray-2/60">Reason for fit: </dt>
                                      <dd className="inline text-cream/90">{c.interest_reason}</dd>
                                    </div>
                                  )}
                                </dl>
                                <p className="mt-2 text-[11px] text-gray-2/70">
                                  Accept and you both receive each other{"'"}s contact. Free.
                                </p>
                              </>
                            ) : (
                              <span className="text-[13px] text-cream">
                                {(pendingByListing.get(l.id) ?? []).length > 1
                                  ? t("mine.connect.requestNumbered", { n: i + 1 })
                                  : t("mine.connect.request")}
                              </span>
                            )}
                          </div>
                          <form action={connectDecisionAction} className="flex shrink-0 gap-2">
                            <input type="hidden" name="id" value={c.id} />
                            <button name="decision" value="accepted" className="btn-gold !px-4 !py-2 text-[12px]">
                              {t("mine.connect.accept")}
                            </button>
                            <button name="decision" value="declined" className="btn-ghost-light !px-4 !py-2 text-[12px]">
                              {t("mine.connect.decline")}
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CTA */}
      <section className="container-px py-12">
        <div className="glass p-10 text-center">
          <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
            {t("cta.heading")}
          </h2>
          <p className="mt-3 text-[15px] text-gray-2 max-w-xl mx-auto">
            {t("cta.body")}
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/marketplace/new" className="btn-gold">
              {t("cta.start")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-ghost-light">{t("cta.contact")}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
