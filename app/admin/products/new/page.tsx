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
      <div
        className="mb-7 flex items-center gap-3 text-[11px] uppercase"
        style={{ letterSpacing: "0.18em" }}
      >
        <Link href="/admin/products" className="text-gray-2 hover:text-gold">
          ← Products
        </Link>
        <span className="text-ink/20">/</span>
        <h1
          className="serif text-ink"
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            textTransform: "none",
          }}
        >
          New product
        </h1>
      </div>
      <AdminProductForm categories={categories ?? []} />
    </div>
  );
}
