import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import AdminDeliverForm from "@/components/AdminDeliverForm";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_cents, currency, created_at, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <p className="mt-2 text-sm text-navy/55">
        {(orders ?? []).length} most recent orders. SLA items needing manual
        delivery are flagged below.
      </p>

      {(orders ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-navy/65">
          No orders yet. Paid Stripe checkouts will appear here once Stripe and
          the webhook are configured.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {(orders ?? []).map((o: any) => (
            <li key={o.id} className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-navy/50">#{o.id.slice(0, 8)}</span>
                <div className="flex items-center gap-3">
                  <span className="badge-navy capitalize">{o.status}</span>
                  <span className="text-sm font-semibold">
                    {formatPrice(o.total_cents ?? 0, o.currency ?? "EUR")}
                  </span>
                </div>
              </div>
              <ul className="mt-3 space-y-3 text-sm text-navy/70">
                {(o.order_items ?? []).map((it: any) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      {it.config_values?.sku ?? "Item"}
                      <span className="ml-2 text-xs text-navy/45">
                        {Object.entries(it.config_values ?? {})
                          .filter(([k]) => k !== "sku")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      {it.delivery_status === "processing" && (
                        <AdminDeliverForm itemId={it.id} orderId={o.id} />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          it.delivery_status === "delivered"
                            ? "text-emerald-700"
                            : "text-gold-600"
                        }`}
                      >
                        {it.delivery_status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
