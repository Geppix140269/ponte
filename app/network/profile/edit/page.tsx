import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOwnProfile } from "@/lib/network/profile";
import { ProfileForm } from "@/components/network/ProfileForm";
import { VerificationPanel } from "@/components/network/VerificationPanel";
import { canRunAdamftdCheck, type Principal } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit profile", robots: { index: false } };

export default async function EditProfilePage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/login");

  // Free plans cannot run ADAMftd checks; gate the button accordingly.
  const principal: Principal = {
    id: profile.id, role: profile.role, account_type: profile.account_type,
    plan: profile.plan, plan_status: (profile as any).plan_status, verified_trader: profile.verified_trader,
  };
  const canRunChecks = canRunAdamftdCheck(principal, 0).allowed;

  return (
    <section className="container-px py-16 max-w-container mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="serif text-ink" style={{ fontSize: 30, fontWeight: 500 }}>Your company profile</h1>
        <Link href={`/network/profile/${profile.id}`} className="text-gold text-sm hover:text-ink">View public profile →</Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <ProfileForm profile={profile} />
        <VerificationPanel canRunChecks={canRunChecks} />
      </div>
    </section>
  );
}
