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
      <h1
        className="serif text-white mb-2"
        style={{ fontSize: 32, fontWeight: 500 }}
      >
        Orders
      </h1>
      <p className="text-[13px] text-gray-2">
        {(orders ?? []).length} most recent orders. SLA items needing manual
        delivery are flagged below.
      </p>

      {(orders ?? []).length === 0 ? (
        <div className="mt-6 glass p-6 text-[13px] text-gray-2">
          No orders yet. Paid Stripe checkouts will appear here once Stripe and
          the webhook are configured.
        </div>
      ) : (
        <ul className="mt-7 space-y-4">
          {(orders ?? []).map((o: any) => (
            <li key={o.id} className="glass p-6">
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] text-gray-2">
                  #{o.id.slice(0, 8)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="badge-navy capitalize">{o.status}</span>
                  <span
                    className="serif text-white text-lg"
                    style={{ fontWeight: 500 }}
                  >
                    {formatPrice(o.total_cents ?? 0, o.currency ?? "USD")}
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-2">
                {(o.order_items ?? []).map((it: any) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-2 border-t border-white/10 pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="text-cream">
                        {it.config_values?.sku ?? "Item"}
                      </span>
                      <span className="ml-2 mono text-[11px] text-gray-2">
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
                        className={`text-[11px] uppercase ${
                          it.delivery_status === "delivered"
                            ? "text-positive"
                            : "text-gold"
                        }`}
                        style={{ letterSpacing: "0.22em" }}
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
