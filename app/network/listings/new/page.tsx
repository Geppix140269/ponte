import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/network/profile";
import { ListingForm } from "@/components/network/ListingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New listing", robots: { index: false } };

export default async function NewListingPage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/login");
  const defaultType: "offer" | "request" = profile.account_type === "buyer" ? "request" : "offer";

  return (
    <section className="container-px py-12 max-w-container mx-auto">
      <h1 className="serif text-ink" style={{ fontSize: 30, fontWeight: 500 }}>Publish a listing</h1>
      <p className="mt-2 text-[13px] text-gray-2">Listings are moderated automatically. Banned phrasing is flagged or rejected.</p>
      <div className="mt-6"><ListingForm defaultType={defaultType} /></div>
    </section>
  );
}
