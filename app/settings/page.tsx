import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/network/profile";
import { ManageBillingButton } from "@/components/network/AccountActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/login?next=/settings");
  return (
    <section className="container-px py-12 max-w-3xl mx-auto space-y-5">
      <h1 className="serif text-ink" style={{ fontSize: 30, fontWeight: 500 }}>Settings</h1>

      <div className="glass p-6">
        <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>Plan</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-ink font-medium capitalize">{profile.plan ?? "free"} <span className="text-gray-2 font-normal">· {(profile as any).plan_status ?? "inactive"}</span></p>
            <p className="text-[12px] text-gray-2">Verification tier {(profile as any).verification_tier ?? 0} · trust {profile.trust_score}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="badge">Change plan</Link>
            <ManageBillingButton />
          </div>
        </div>
      </div>

      <div className="glass p-6">
        <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>Profile</p>
        <div className="flex items-center justify-between">
          <p className="text-gray-2 text-[14px]">{profile.full_name ?? "—"}{profile.company ? ` · ${profile.company}` : ""}</p>
          <Link href="/network/profile/edit" className="badge-gold">Edit profile</Link>
        </div>
      </div>

      <div className="glass p-6">
        <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>Security</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="badge">Sign out</button>
        </form>
      </div>
    </section>
  );
}
