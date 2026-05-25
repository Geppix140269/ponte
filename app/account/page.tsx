import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Clock, UserCircle2 } from "lucide-react";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

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
            Sign-in and your download centre activate once Supabase Auth is
            connected. Add your Supabase keys to enable accounts.
          </p>
          <Link href="/catalogue" className="btn-gold mt-8">
            Browse the Catalogue
          </Link>
        </div>
      </section>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_cents, currency, created_at, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allItems = (orders ?? []).flatMap((o: any) => o.order_items ?? []);
  const downloads = allItems.filter(
    (it: any) => it.delivery_status === "delivered" && it.report_path
  );

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

      {/* Downloads */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-6">
        <div className="num-italic">— 01 / Downloads</div>
        <h2
          className="serif text-white"
          style={{ fontSize: 28, fontWeight: 500 }}
        >
          Delivered reports
        </h2>
      </div>
      {downloads.length === 0 ? (
        <p className="text-[13px] text-gray-2 mb-12">
          No reports ready to download yet. Delivered reports appear here.
        </p>
      ) : (
        <ul className="glass divide-y divide-white/10 mb-12">
          {downloads.map((it: any) => (
            <li
              key={it.id}
              className="flex items-center justify-between p-5 first:rounded-t-[18px] last:rounded-b-[18px]"
            >
              <span className="text-sm text-cream">
                <span className="serif" style={{ fontWeight: 500 }}>
                  {it.config_values?.sku ?? "Report"}
                </span>
                {it.download_count != null && (
                  <span
                    className="ml-3 mono text-[10px] uppercase text-gray-2"
                    style={{ letterSpacing: "0.18em" }}
                  >
                    {Math.max(
                      0,
                      (it.max_downloads ?? 5) - (it.download_count ?? 0)
                    )}{" "}
                    downloads left
                  </span>
                )}
              </span>
              <a href={`/api/download/${it.id}`} className="btn-gold">
                <Download className="h-4 w-4" /> Download
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Orders */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-6">
        <div className="num-italic">— 02 / Orders</div>
        <h2
          className="serif text-white"
          style={{ fontSize: 28, fontWeight: 500 }}
        >
          History
        </h2>
      </div>
      {(orders ?? []).length === 0 ? (
        <p className="text-[13px] text-gray-2">
          You haven&apos;t placed any orders yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {(orders ?? []).map((o: any) => (
            <li key={o.id} className="glass p-6">
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] text-gray-2">
                  #{o.id.slice(0, 8)}
                </span>
                <span className="badge-navy capitalize">{o.status}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-2">
                {(o.order_items ?? []).map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-cream">
                      {it.config_values?.sku ?? "Item"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase" style={{ letterSpacing: "0.18em" }}>
                      {it.delivery_status !== "delivered" && (
                        <Clock className="h-3 w-3" />
                      )}
                      {it.delivery_status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-white/10 pt-3 text-right">
                <span className="serif text-white text-lg" style={{ fontWeight: 500 }}>
                  {formatPrice(o.total_cents ?? 0, o.currency ?? "USD")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
