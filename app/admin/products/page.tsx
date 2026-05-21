import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("sku, title, price_cents, currency, status, delivery_type, featured")
    .order("sku");

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Products</h1>
      <p className="mt-2 text-sm text-navy/55">
        {(products ?? []).length} products in the database.
      </p>

      {(products ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-navy/65">
          No products yet. Run <code className="font-mono">supabase/seed.sql</code>{" "}
          to import the catalogue, then manage status, pricing, and PDFs here.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-navy/50">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(products ?? []).map((p: any) => (
                <tr key={p.sku}>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-navy">{p.title}</td>
                  <td className="px-4 py-3">{formatPrice(p.price_cents, p.currency)}</td>
                  <td className="px-4 py-3">{p.delivery_type}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
