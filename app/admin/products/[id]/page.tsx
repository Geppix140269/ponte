import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminProductForm from "@/components/AdminProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("categories")
      .select("id, slug, name")
      .order("display_order"),
  ]);

  if (!product) notFound();

  return (
    <div>
      <div className="mb-7 flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/products"
          className="text-[11px] uppercase text-gray-2 hover:text-gold"
          style={{ letterSpacing: "0.18em" }}
        >
          ← Products
        </Link>
        <span className="text-ink/20">/</span>
        <h1
          className="serif text-ink"
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {product.title}
        </h1>
        <span className="ml-1 mono text-sm text-gray-2">{product.sku}</span>
      </div>
      <AdminProductForm product={product} categories={categories ?? []} />
    </div>
  );
}
