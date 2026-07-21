import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, FilePlus2, ShieldCheck, EyeOff, BadgeCheck, Share2, Sparkles } from "lucide-react";
import { accountBrief, isAiConfigured, type AccountBrief } from "@/lib/ai-vet";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import InterestButton from "@/components/InterestButton";
import { submitDraftAction, connectDecisionAction } from "./actions";
import Reveal from "@/components/Reveal";
import ProcessFlow from "@/components/ProcessFlow";
import { alternatesFor } from "@/lib/seo";
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

export default async function MarketplacePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketplace");

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
  }[] = [];

  // Pending connection requests on the member's own listings.
  const pendingByListing = new Map<string, { id: string }[]>();
  if (user) {
    const supabase = createClient();
    const { data } = await supabase
      .from("listings")
      .select("id, ref, type, product, status, created_at, decision_note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    listings = data ?? [];

    if (listings.length > 0) {
      const { data: conns } = await supabase
        .from("listing_connections")
        .select("id, listing_id")
        .eq("status", "pending")
        .in("listing_id", listings.map((l) => l.id));
      for (const c of conns ?? []) {
        const arr = pendingByListing.get(c.listing_id) ?? [];
        arr.push({ id: c.id });
        pendingByListing.set(c.listing_id, arr);
      }
    }
  }

  // Phase 2: the AI account manager. One cached brief per member,
  // regenerated at most daily or when the listing count changes.
  // Freemium: free on the first listing; Ponte AI after that.
  let brief: AccountBrief | null = null;
  let briefLocked = false;
  if (user && listings.length > 0 && isAiConfigured()) {
    const adminSb = createAdminClient();
    const { data: aiProfile } = await adminSb
      .from("profiles")
      .select("ai_member")
      .eq("id", user.id)
      .maybeSingle();
    if (!aiProfile?.ai_member && listings.length > 1) {
      briefLocked = true;
    }
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
    if (briefLocked) {
      // no generation for locked accounts: the upsell panel shows instead
    } else if (stale) {
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
    ref: string;
    type: string;
    product: string;
    origin: string | null;
    destination: string | null;
    volume: string | null;
    incoterm: string | null;
    details: string;
    full: boolean;
  };
  // The board stays hidden from EVERYONE until it has real inventory.
  const BOARD_MIN = Number(process.env.BOARD_MIN_LISTINGS ?? 3);
  let board: BoardItem[] = [];
  let approvedCount = 0;
  const mediaByListing = new Map<string, string>();
  if (isSupabaseConfigured()) {
    if (user) {
      const supabase = createClient();
      const { data } = await supabase
        .from("listings")
        .select("id, ref, type, product, origin, destination, volume, incoterm, details")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      board = (data ?? []).map((l) => ({ ...l, full: true }));
    } else {
      const adminSb = createAdminClient();
      const { data } = await adminSb
        .from("listings")
        .select("id, ref, type, product, origin, destination, volume, incoterm, details")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      board = (data ?? []).map((l) => ({
        ...l,
        details: l.details.length > 120 ? l.details.slice(0, 120) + "…" : l.details,
        full: false,
      }));
    }
    approvedCount = board.length;
    if (approvedCount < BOARD_MIN) {
      board = [];
    } else {
      const adminSb = createAdminClient();
      const { data: media } = await adminSb
        .from("listing_media")
        .select("listing_id, path, kind")
        .in("listing_id", board.map((b) => b.id))
        .eq("kind", "image")
        .order("created_at", { ascending: true });
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      for (const m of media ?? []) {
        if (!mediaByListing.has(m.listing_id)) {
          mediaByListing.set(
            m.listing_id,
            `${base}/storage/v1/object/public/listing-media/${m.path}`,
          );
        }
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
              {board.length > 0
                ? t("board.heading", { count: board.length })
                : t("board.headingEmpty")}
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
          <div className="space-y-3">
            {board.map((b) => (
              <div key={b.id} className="glass p-5 md:p-6 md:flex md:gap-6">
                {mediaByListing.has(b.id) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaByListing.get(b.id)}
                    alt={b.product}
                    className="mb-4 h-40 w-full rounded-lg object-cover md:mb-0 md:h-32 md:w-48 md:shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="mono text-[12px] text-gold">{b.ref}</span>
                  <span className="badge uppercase">{TYPE_LABEL[b.type] ?? b.type}</span>
                  <span className="flex-1 text-[15px] text-cream">{b.product}</span>
                  {user ? (
                    <InterestButton refCode={b.ref} />
                  ) : (
                    <Link
                      href="/login?next=/marketplace"
                      className="text-[11px] uppercase text-gold hover:text-cream"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      {t("board.signInToRespond")}
                    </Link>
                  )}
                </div>
                <p className="mono mt-3 text-[12px] leading-relaxed text-gray-2">
                  {[b.origin && t("card.origin", { value: b.origin }), b.destination && t("card.destination", { value: b.destination }), b.volume, b.incoterm]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className={`mt-2 text-[13px] leading-relaxed ${b.full ? "text-gray-2" : "text-gray-2/70"}`}>
                  {b.details}
                  {!b.full && (
                    <span className="ml-2 text-gold">{t("board.signInToRead")}</span>
                  )}
                </p>
                </div>
              </div>
            ))}
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

          {briefLocked && (
            <div className="glass mb-4 p-6" style={{ borderColor: "rgba(232,160,32,0.3)" }}>
              <p className="flex items-center gap-2 text-[10px] uppercase text-gold" style={{ letterSpacing: "0.2em" }}>
                <Sparkles className="h-3.5 w-3.5" /> {t("ai.label")}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-gray-2">
                {t("ai.lockedBody")}{" "}
                <span className="text-gold">{t("ai.lockedPrice")}</span>
              </p>
              <a
                href={process.env.NEXT_PUBLIC_AI_PAYMENT_LINK || "/pricing"}
                className="btn-gold mt-4 inline-flex"
              >
                {t("ai.unlock")} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
          {brief && !briefLocked && (
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
                  {(pendingByListing.get(l.id) ?? []).map((c, i) => (
                    <div
                      key={c.id}
                      className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] px-4 py-3"
                      style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.35)" }}
                    >
                      <span className="flex-1 text-[13px] text-cream">
                        {(pendingByListing.get(l.id) ?? []).length > 1
                          ? t("mine.connect.requestNumbered", { n: i + 1 })
                          : t("mine.connect.request")}
                      </span>
                      <form action={connectDecisionAction} className="flex gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <button name="decision" value="accepted" className="btn-gold !px-4 !py-2 text-[12px]">
                          {t("mine.connect.accept")}
                        </button>
                        <button name="decision" value="declined" className="btn-ghost-light !px-4 !py-2 text-[12px]">
                          {t("mine.connect.decline")}
                        </button>
                      </form>
                    </div>
                  ))}
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
