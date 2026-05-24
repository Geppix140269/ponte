import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminProductForm from "@/components/AdminProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("display_order");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-navy/50 hover:text-navy">
          ← Products
        </Link>
        <span className="text-navy/30">/</span>
        <h1 className="text-2xl font-extrabold">New product</h1>
      </div>
      <AdminProductForm categories={categories ?? []} />
    </div>
  );
}
