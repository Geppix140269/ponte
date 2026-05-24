import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, title, price_cents, currency, status, delivery_type, featured")
    .order("sku");

  const statusColor: Record<string, string> = {
    published: "text-emerald-700",
    draft: "text-gold-600",
    archived: "text-navy/40",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Products</h1>
          <p className="mt-1 text-sm text-navy/55">
            {(products ?? []).length} products in the database.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-gold">
          + New product
        </Link>
      </div>

      {/* Status filter hint */}
      <div className="mt-4 flex gap-3 text-xs text-navy/50">
        <span>Filter: all statuses shown — draft products are hidden from the public catalogue.</span>
      </div>

      {(products ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-navy/65">
          No products yet.{" "}
          <span className="font-mono">supabase/migrations/01_catalogue_fields.sql</span>{" "}
          then run <span className="font-mono">seed-from-catalogue</span> to import the catalogue.
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
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(products ?? []).map((p: any) => (
                <tr key={p.sku} className="hover:bg-mist/50">
                  <td className="px-4 py-3 font-mono text-xs text-navy/70">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-navy">{p.title}</td>
                  <td className="px-4 py-3">{formatPrice(p.price_cents, p.currency)}</td>
                  <td className="px-4 py-3">{p.delivery_type}</td>
                  <td className="px-4 py-3">{p.featured ? "★" : ""}</td>
                  <td className={`px-4 py-3 capitalize font-medium ${statusColor[p.status] ?? ""}`}>
                    {p.status}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-xs font-semibold text-gold-600 hover:text-navy"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
