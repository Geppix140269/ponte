import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Share2, ShieldCheck } from "lucide-react";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import InterestButton from "@/components/InterestButton";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ponte.trade";

type Deal = {
  id: string;
  ref: string;
  type: string;
  product: string;
  origin: string | null;
  destination: string | null;
  volume: string | null;
  incoterm: string | null;
  details: string;
};

// Public, shareable page for ONE approved listing. This is the link members
// forward on WhatsApp: OG tags carry the product photo and teaser, and the
// page converts visitors into members. Anything not approved 404s.
async function getDeal(ref: string): Promise<{ deal: Deal; image: string | null } | null> {
  if (!isSupabaseConfigured()) return null;
  const adminSb = createAdminClient();
  const { data } = await adminSb
    .from("listings")
    .select("id, ref, type, product, origin, destination, volume, incoterm, details")
    .eq("ref", ref.toUpperCase())
    .eq("status", "approved")
    .maybeSingle();
  if (!data) return null;

  const { data: media } = await adminSb
    .from("listing_media")
    .select("path, kind")
    .eq("listing_id", data.id)
    .eq("kind", "image")
    .order("created_at", { ascending: true })
    .limit(1);
  const image = media?.[0]
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-media/${media[0].path}`
    : null;
  return { deal: data as Deal, image };
}

function teaser(details: string, max = 160): string {
  return details.length > max ? details.slice(0, max) + "…" : details;
}

export async function generateMetadata({
  params,
}: {
  params: { ref: string };
}): Promise<Metadata> {
  const res = await getDeal(params.ref);
  if (!res) return { title: "Listing not found" };
  const { deal, image } = res;
  const title = `${deal.product} · ${deal.ref}`;
  const description = `Vetted ${deal.type} on Ponte. ${teaser(deal.details, 120)}`;
  return {
    title,
    description,
    alternates: { canonical: `/marketplace/l/${deal.ref}` },
    openGraph: {
      title: `${title} · Ponte`,
      description,
      url: `${APP_URL}/marketplace/l/${deal.ref}`,
      siteName: "Ponte",
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} · Ponte`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function DealPage({ params }: { params: { ref: string } }) {
  const res = await getDeal(params.ref);
  if (!res) notFound();
  const { deal, image } = res;
  const user = await getUser();

  const shareText = `${deal.product} · vetted listing ${deal.ref} on Ponte\n${APP_URL}/marketplace/l/${deal.ref}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <>
      <header className="container-px pt-14 pb-8 md:pt-20">
        <span className="pill">Vetted listing</span>
        <h1
          className="serif text-white mt-6 mb-3 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(32px, 4.5vw, 54px)", lineHeight: 1.05, letterSpacing: "-0.015em" }}
        >
          {deal.product}
        </h1>
        <p className="flex items-center gap-2 text-[13px] text-gray-2">
          <ShieldCheck className="h-4 w-4 text-gold" />
          Reviewed by the Ponte desk before going live. Counterparties stay
          anonymous until NCNDA and fee terms are signed.
        </p>
      </header>

      <section className="container-px pb-24">
        <div className="glass max-w-3xl p-6 md:p-8">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={deal.product}
              className="mb-6 h-64 w-full rounded-xl object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="mono text-[12px] text-gold">{deal.ref}</span>
            <span className="badge uppercase">{deal.type}</span>
          </div>
          <p className="mono mt-3 text-[12px] leading-relaxed text-gray-2">
            {[
              deal.origin && `Origin: ${deal.origin}`,
              deal.destination && `Destination: ${deal.destination}`,
              deal.volume,
              deal.incoterm,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-gray-2">
            {user ? deal.details : teaser(deal.details)}
            {!user && (
              <span className="ml-2 text-gold">Sign in free to read the full listing.</span>
            )}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {user ? (
              <InterestButton refCode={deal.ref} />
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/marketplace/l/${deal.ref}`)}`}
                className="btn-gold"
              >
                I am interested <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost-light"
            >
              <Share2 className="h-4 w-4" /> Share on WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-8 max-w-3xl text-center md:text-left">
          <p className="text-[14px] text-gray-2">
            Have something to sell or source yourself?{" "}
            <Link href="/marketplace/new" className="text-gold hover:text-cream">
              Build your listing in three steps
            </Link>
            , no account needed until you publish.
          </p>
        </div>
      </section>
    </>
  );
}
