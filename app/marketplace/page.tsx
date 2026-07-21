import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FilePlus2, ShieldCheck, EyeOff, BadgeCheck, Share2 } from "lucide-react";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import InterestButton from "@/components/InterestButton";
import { submitDraftAction, connectDecisionAction } from "./actions";
import Reveal from "@/components/Reveal";
import ProcessFlow from "@/components/ProcessFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Submit offers and requirements to the Ponte marketplace. Every listing is vetted and documents verified before anything is circulated.",
  alternates: { canonical: "/marketplace" },
};

const STATUS_STYLE: Record<string, string> = {
  draft: "text-gray-2",
  submitted: "text-gold",
  approved: "text-positive",
  rejected: "text-red-400",
  closed: "text-gray-2",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft · only you see this",
  submitted: "In vetting",
  approved: "Approved · live with the desk",
  rejected: "Not approved",
  closed: "Closed",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ponte.trade";

function waShareUrl(product: string, ref: string): string {
  const text = `${product} · vetted listing ${ref} on Ponte\n${APP_URL}/marketplace/l/${encodeURIComponent(ref)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const RULES = [
  {
    icon: ShieldCheck,
    title: "Vetted before live",
    body: "Every listing is reviewed by the desk and documents are verified before anything is circulated. No exceptions.",
  },
  {
    icon: EyeOff,
    title: "Anonymized always",
    body: "Counterparties see the deal, never your name, until both sides have signed NCNDA and fee terms.",
  },
  {
    icon: BadgeCheck,
    title: "Free to trade",
    body: "Posting, browsing and connecting cost nothing. Bring in the desk only if you want the deal managed end to end, on a success fee or retainer.",
  },
];

export default async function MarketplacePage() {
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
        <span className="pill">Marketplace</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          Every listing{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>vetted</em>.
          Every deal papered.
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-2xl">
          Post what you sell or what you need, free. AI and the desk verify
          every listing before it goes live, you stay anonymous until both
          sides agree to connect, and connecting costs nothing. Want the deal
          managed end to end? The desk steps in on a success fee or retainer,
          only when you ask.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link href="/marketplace/new" className="btn-gold">
              New listing <FilePlus2 className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login?next=/marketplace/new" className="btn-gold">
                Sign in to submit <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Rules */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="grid gap-5 md:grid-cols-3">
          {RULES.map((r, i) => (
            <Reveal key={r.title} delay={i * 120}>
              <div className="glass p-7 h-full">
                <r.icon className="h-5 w-5 text-gold" />
                <h3 className="serif text-white text-lg mt-4" style={{ fontWeight: 500 }}>{r.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-px py-14 border-t border-white/8">
        <p className="eyebrow text-gold">How it works</p>
        <h2 className="serif text-white mt-3 mb-12" style={{ fontSize: 30, fontWeight: 500 }}>
          Five steps. One rule: papered before introduced.
        </h2>
        <ProcessFlow />
      </section>

      {/* Live board */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-gold">Live now</p>
            <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>
              {board.length > 0
                ? `${board.length} vetted ${board.length === 1 ? "listing" : "listings"} on the board.`
                : "The board opens soon."}
            </h2>
          </div>
          {!user && board.length > 0 && (
            <Link href="/login?next=/marketplace" className="btn-ghost-light">
              Sign in for full listings <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {board.length === 0 ? (
          <div className="glass p-8 text-[14px] text-gray-2">
            The board opens once the first vetted listings clear the desk.
            Submissions are open now, and early listings get the most
            attention when it goes live.
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
                  <span className="badge uppercase">{b.type}</span>
                  <span className="flex-1 text-[15px] text-cream">{b.product}</span>
                  {user ? (
                    <InterestButton refCode={b.ref} />
                  ) : (
                    <Link
                      href="/login?next=/marketplace"
                      className="text-[11px] uppercase text-gold hover:text-cream"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      Sign in to respond
                    </Link>
                  )}
                </div>
                <p className="mono mt-3 text-[12px] leading-relaxed text-gray-2">
                  {[b.origin && `Origin: ${b.origin}`, b.destination && `Destination: ${b.destination}`, b.volume, b.incoterm]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className={`mt-2 text-[13px] leading-relaxed ${b.full ? "text-gray-2" : "text-gray-2/70"}`}>
                  {b.details}
                  {!b.full && (
                    <span className="ml-2 text-gold">Sign in to read the full listing.</span>
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
              <p className="eyebrow text-gold">Your listings</p>
              <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>
                {listings.length > 0 ? "Where things stand." : "Nothing submitted yet."}
              </h2>
            </div>
            <Link href="/marketplace/new" className="btn-ghost-light">
              New listing <FilePlus2 className="h-4 w-4" />
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="glass p-8 text-[14px] text-gray-2">
              Your first listing takes five minutes: the product, the terms,
              and any documents that prove you are serious. The desk takes it
              from there.
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((l) => (
                <div key={l.id} className="glass p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="mono text-[12px] text-gold">{l.ref}</span>
                    <span className="badge uppercase">{l.type}</span>
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
                        Submit for vetting →
                      </button>
                    </form>
                  )}
                  {l.status === "approved" && (
                    <a
                      href={waShareUrl(l.product, l.ref)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase text-gold hover:text-cream"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                    </a>
                  )}
                  {(pendingByListing.get(l.id) ?? []).map((c, i) => (
                    <div
                      key={c.id}
                      className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] px-4 py-3"
                      style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.35)" }}
                    >
                      <span className="flex-1 text-[13px] text-cream">
                        A vetted member wants to connect{(pendingByListing.get(l.id) ?? []).length > 1 ? ` (${i + 1})` : ""}.
                        Accept and you both receive each other&apos;s contact. Free.
                      </span>
                      <form action={connectDecisionAction} className="flex gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <button name="decision" value="accepted" className="btn-gold !px-4 !py-2 text-[12px]">
                          Accept
                        </button>
                        <button name="decision" value="declined" className="btn-ghost-light !px-4 !py-2 text-[12px]">
                          Decline
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
            Prefer to talk it through first?
          </h2>
          <p className="mt-3 text-[15px] text-gray-2 max-w-xl mx-auto">
            Bring the deal to the desk directly and we will scope it with you.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/marketplace/new" className="btn-gold">
              Start a listing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-ghost-light">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
