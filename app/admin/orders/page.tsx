import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import AdminDeliverForm from "@/components/AdminDeliverForm";
import AdminOrderControls from "@/components/AdminOrderControls";

export const dynamic = "force-dynamic";

interface OrderItem {
  id: string;
  config_values: Record<string, string> | null;
  delivery_status: string | null;
  slot_date: string | null;
}

interface OrderRow {
  id: string;
  status: string | null;
  status_v2: string | null;
  capture_method: string | null;
  confirmed_delivery_at: string | null;
  capture_deadline_at: string | null;
  total_cents: number | null;
  currency: string | null;
  created_at: string;
  email: string | null;
  order_items: OrderItem[] | null;
}

export default async function AdminOrders() {
  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, status_v2, capture_method, confirmed_delivery_at, capture_deadline_at, total_cents, currency, created_at, email, order_items(id, config_values, delivery_status, slot_date)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const orders = (data ?? []) as unknown as OrderRow[];

  // Group: authorized/confirmed at top (need attention), then captured, then voided/delivered
  function priority(o: OrderRow): number {
    switch (o.status_v2) {
      case "authorized":
        return 0;
      case "confirmed":
        return 1;
      case "captured":
        return 2;
      case "delivered":
        return 3;
      case "voided":
        return 4;
      case "refunded":
        return 5;
      default:
        return 6;
    }
  }
  orders.sort((a, b) => priority(a) - priority(b));

  return (
    <div>
      <h1
        className="serif text-ink mb-2"
        style={{ fontSize: 32, fontWeight: 500 }}
      >
        Orders
      </h1>
      <p className="text-[13px] text-gray-2">
        {orders.length} most recent orders. Authorized orders are listed
        first, capture or void each one within its Stripe authorization
        window (typically 7 days).
      </p>

      {orders.length === 0 ? (
        <div className="mt-6 glass p-6 text-[13px] text-gray-2">
          No orders yet. Paid Stripe checkouts will appear here once Stripe
          and the webhook are configured.
        </div>
      ) : (
        <ul className="mt-7 space-y-4">
          {orders.map((o) => {
            const statusV2 = o.status_v2 ?? o.status ?? "unknown";
            const statusColor =
              statusV2 === "authorized"
                ? "text-gold"
                : statusV2 === "confirmed"
                  ? "text-gold"
                  : statusV2 === "captured"
                    ? "text-positive"
                    : statusV2 === "delivered"
                      ? "text-positive"
                      : statusV2 === "voided"
                        ? "text-negative"
                        : "text-gray-2";
            return (
              <li key={o.id} className="glass p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="mono text-[11px] text-gray-2">
                      #{o.id.slice(0, 8)}
                      {o.email && (
                        <span className="ml-2 text-ink">{o.email}</span>
                      )}
                    </span>
                    <span className="mono text-[10px] text-gray-2">
                      {new Date(o.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] uppercase ${statusColor}`}
                      style={{ letterSpacing: "0.22em" }}
                    >
                      {statusV2}
                    </span>
                    <span
                      className="serif text-ink text-lg"
                      style={{ fontWeight: 500 }}
                    >
                      {formatPrice(o.total_cents ?? 0, o.currency ?? "USD")}
                    </span>
                  </div>
                </div>

                <AdminOrderControls
                  orderId={o.id}
                  statusV2={statusV2}
                  captureMethod={o.capture_method}
                  confirmedDeliveryAt={o.confirmed_delivery_at}
                  captureDeadlineAt={o.capture_deadline_at}
                />

                <ul className="mt-4 space-y-3 text-sm text-gray-2">
                  {(o.order_items ?? []).map((it) => (
                    <li
                      key={it.id}
                      className="flex flex-col gap-2 border-t border-rule pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        <span className="text-ink">
                          {it.config_values?.sku ?? "Item"}
                        </span>
                        <span className="ml-2 mono text-[11px] text-gray-2">
                          {Object.entries(it.config_values ?? {})
                            .filter(([k]) => k !== "sku")
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </span>
                        {it.slot_date && (
                          <span className="ml-2 mono text-[11px] text-gold">
                            slot {it.slot_date}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        {it.delivery_status === "processing" &&
                          (statusV2 === "captured" || statusV2 === "delivered") && (
                            <AdminDeliverForm
                              itemId={it.id}
                              orderId={o.id}
                              defaultLicensedTo={o.email ?? ""}
                            />
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
