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
      <section className="bg-white py-20">
        <div className="container-px max-w-xl text-center">
          <UserCircle2 className="mx-auto h-10 w-10 text-gold-600" />
          <h1 className="mt-5 text-3xl font-extrabold">Your account</h1>
          <p className="mt-3 text-navy/65">
            Sign-in and your download centre activate once Supabase Auth is
            connected. Add your Supabase keys to enable accounts.
          </p>
          <Link href="/catalogue" className="btn-gold mt-8">Browse the Catalogue</Link>
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
    (it: any) => it.delivery_status === "delivered" && it.download_url,
  );

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container-px">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Your account</h1>
            <p className="mt-1 text-sm text-navy/55">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-outline">Sign out</button>
          </form>
        </div>

        {/* Downloads */}
        <h2 className="mt-12 text-xl font-bold">Downloads</h2>
        {downloads.length === 0 ? (
          <p className="mt-3 text-sm text-navy/55">
            No reports ready to download yet. Delivered reports appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {downloads.map((it: any) => (
              <li key={it.id} className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-navy">
                  {it.config_values?.sku ?? "Report"}
                </span>
                <a href={it.download_url} className="btn-gold">
                  <Download className="h-4 w-4" /> Download
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* Orders */}
        <h2 className="mt-12 text-xl font-bold">Orders</h2>
        {(orders ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-navy/55">
            You haven&apos;t placed any orders yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {(orders ?? []).map((o: any) => (
              <li key={o.id} className="rounded-xl border border-line p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-navy/50">#{o.id.slice(0, 8)}</span>
                  <span className="badge-navy capitalize">{o.status}</span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-navy/70">
                  {(o.order_items ?? []).map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between">
                      <span>{it.config_values?.sku ?? "Item"}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-navy/50">
                        {it.delivery_status !== "delivered" && <Clock className="h-3 w-3" />}
                        {it.delivery_status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-line pt-3 text-right text-sm font-semibold">
                  {formatPrice(o.total_cents ?? 0, o.currency ?? "EUR")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
