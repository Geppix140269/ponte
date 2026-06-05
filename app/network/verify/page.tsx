import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/network/profile";
import { canRunAdamftdCheck, type Principal } from "@/lib/rbac";
import { VerifyWidget } from "@/components/network/VerifyWidget";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify with ADAMftd", robots: { index: false } };

export default async function VerifyPage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/login?next=/network/verify");
  const principal: Principal = {
    id: profile.id, role: profile.role, account_type: profile.account_type,
    plan: profile.plan, plan_status: (profile as any).plan_status, verified_trader: profile.verified_trader,
  };
  const canRun = canRunAdamftdCheck(principal, 0).allowed;

  return (
    <section className="container-px py-16 max-w-container mx-auto">
      <p className="mono text-[11px] text-gold uppercase" style={{ letterSpacing: "0.22em" }}>Powered by ADAMftd</p>
      <h1 className="serif text-ink mt-3" style={{ fontSize: 34, fontWeight: 500 }}>Verify a counterparty</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-gray-2 leading-relaxed">
        Screen a company against sanctions lists, official registries, and real customs records before
        you commit. Results are grounded in ADAMftd trade intelligence and cached so a counterparty is
        never re-billed within the window.
      </p>
      <div className="mt-8"><VerifyWidget canRun={canRun} /></div>
    </section>
  );
}
