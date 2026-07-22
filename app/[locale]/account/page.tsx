import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <section className="container-px py-20">
        <div className="glass p-12 max-w-xl mx-auto text-center">
          <UserCircle2 className="mx-auto h-10 w-10 text-gold" />
          <h1
            className="serif text-white mt-5"
            style={{ fontSize: 32, fontWeight: 500 }}
          >
            Your account
          </h1>
          <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">
            Sign-in activates once Supabase Auth is connected. Add your
            Supabase keys to enable accounts.
          </p>
          <Link href="/pricing" className="btn-gold mt-8">
            See what the desk offers
          </Link>
        </div>
      </section>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: myListings } = await supabase
    .from("listings")
    .select("id, ref, type, product, status")
    .order("created_at", { ascending: false })
    .limit(10);

  // The report-era "delivered files" section is gone with the shop. The
  // orders table was checked before deletion: zero rows, so there is no
  // account anywhere with a file this section could have shown.

  return (
    <section className="container-px py-14 lg:py-20">
      <header className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <span className="pill">Account</span>
          <h1
            className="serif text-white mt-5"
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
            }}
          >
            Your account
          </h1>
          <p className="mono text-[12px] text-gray-2 mt-2">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-ghost-light">
            Sign out
          </button>
        </form>
      </header>

      {/* Marketplace listings */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-6">
        <div className="num-italic">â€” 01 / Marketplace</div>
        <h2
          className="serif text-white"
          style={{ fontSize: 28, fontWeight: 500 }}
        >
          Your listings
        </h2>
      </div>
      {(myListings ?? []).length === 0 ? (
        <p className="text-[13px] text-gray-2 mb-4">
          Nothing submitted yet. Offers and requirements you submit are
          vetted by the desk before anything is circulated.
        </p>
      ) : (
        <ul className="glass divide-y divide-white/10 mb-4">
          {(myListings ?? []).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-[14px]">
              <span className="mono text-[12px] text-gold">{l.ref}</span>
              <span className="badge uppercase">{l.type}</span>
              <span className="flex-1 text-cream">{l.product}</span>
              <span className="text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.14em" }}>
                {l.status === "submitted" ? "in vetting" : l.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/marketplace" className="btn-gold mb-12 inline-flex">
        Go to the marketplace
      </Link>

    </section>
  );
}
