import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/network/profile";
import { OnboardingForm } from "@/components/network/OnboardingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Welcome to ponte", robots: { index: false } };

export default async function OnboardingPage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/login?next=/onboarding");
  return (
    <section className="container-px py-14 max-w-container mx-auto">
      <p className="eyebrow text-gold">Get started</p>
      <h1 className="serif text-ink mt-2" style={{ fontSize: 34, fontWeight: 500 }}>Welcome to ponte.</h1>
      <p className="mt-2 text-[15px] text-gray-2 max-w-xl">Two minutes to set up. Then verify a counterparty or find suppliers from real customs data.</p>
      <div className="mt-8"><OnboardingForm profile={profile} /></div>
    </section>
  );
}
