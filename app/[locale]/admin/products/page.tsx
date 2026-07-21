import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select(
      "id, sku, title, price_cents, currency, status, delivery_type, featured"
    )
    .order("sku");

  const statusColor: Record<string, string> = {
    published: "text-positive",
    draft: "text-gold",
    archived: "text-gray-2",
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1
            className="serif text-white"
            style={{ fontSize: 32, fontWeight: 500 }}
          >
            Products
          </h1>
          <p className="mt-1 text-[13px] text-gray-2">
            {(products ?? []).length} products in the database.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-gold">
          + New product
        </Link>
      </div>

      <p className="mt-4 text-[12px] text-gray-2">
        Filter: all statuses shown — draft products are hidden from the public
        catalogue.
      </p>

      {(products ?? []).length === 0 ? (
        <div className="mt-7 glass p-6 text-[13px] text-gray-2">
          No products yet.{" "}
          <span className="mono">
            supabase/migrations/01_catalogue_fields.sql
          </span>{" "}
          then run <span className="mono">seed-from-catalogue</span> to import
          the catalogue.
        </div>
      ) : (
        <div className="mt-7 glass overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              className="border-b border-white/10 text-left text-[10px] uppercase text-gray-2"
              style={{ letterSpacing: "0.22em" }}
            >
              <tr>
                <th className="px-4 py-4">SKU</th>
                <th className="px-4 py-4">Title</th>
                <th className="px-4 py-4">Price</th>
                <th className="px-4 py-4">Delivery</th>
                <th className="px-4 py-4">Featured</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(products ?? []).map((p: any) => (
                <tr key={p.sku} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 mono text-[11px] text-gray-2">
                    {p.sku}
                  </td>
                  <td className="px-4 py-3 text-cream">{p.title}</td>
                  <td className="px-4 py-3 mono text-gold">
                    {formatPrice(p.price_cents, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-cream">{p.delivery_type}</td>
                  <td className="px-4 py-3 text-gold">{p.featured ? "★" : ""}</td>
                  <td
                    className={`px-4 py-3 capitalize ${
                      statusColor[p.status] ?? "text-cream"
                    }`}
                  >
                    {p.status}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[11px] uppercase text-gold hover:text-cream"
                      style={{ letterSpacing: "0.18em" }}
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
