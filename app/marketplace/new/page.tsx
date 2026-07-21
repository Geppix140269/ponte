import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import ListingForm from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New listing",
  description: "Submit an offer or requirement for vetting by the Ponte desk.",
  alternates: { canonical: "/marketplace/new" },
};

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const t = searchParams.type;
  const initialType = t === "requirement" || t === "service" ? t : "offer";
  if (!isSupabaseConfigured()) redirect("/marketplace");
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/marketplace/new?type=${initialType}`)}`);

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20">
        <span className="pill">New listing</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.02, letterSpacing: "-0.015em" }}
        >
          Three steps. The desk does the rest.
        </h1>
        <p className="text-[16px] text-gray-2 leading-relaxed max-w-2xl">
          One deal per listing, photos included. Vetting usually takes two
          business days.
        </p>
      </header>

      <section className="container-px pb-24">
        <div className="max-w-2xl">
          <ListingForm initialType={initialType} />
        </div>
      </section>
    </>
  );
}
