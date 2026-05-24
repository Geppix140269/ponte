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
    supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, slug, name")
      .order("display_order"),
  ]);

  if (!product) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-navy/50 hover:text-navy">
          ← Products
        </Link>
        <span className="text-navy/30">/</span>
        <h1 className="text-2xl font-extrabold">{product.title}</h1>
        <span className="ml-2 font-mono text-sm text-navy/40">{product.sku}</span>
      </div>
      <AdminProductForm product={product} categories={categories ?? []} />
    </div>
  );
}
