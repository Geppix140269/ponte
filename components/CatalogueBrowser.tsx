"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Category, Product } from "@/lib/types";

type Sort = "relevance" | "price-asc" | "price-desc";

// Delivery is intentionally NOT a customer-side filter.
// Customers order; ops confirms the delivery date inside 24h.
// Filtering by SLA would imply we commit to one upfront, which we don't.
export default function CatalogueBrowser({
  products,
  categories,
  initialCategory = "all",
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<Sort>("relevance");

  const results = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== "all" && p.categorySlug !== category) return false;
      return true;
    });
    if (sort === "price-asc")
      list = [...list].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "price-desc")
      list = [...list].sort((a, b) => b.priceCents - a.priceCents);
    return list;
  }, [products, category, sort]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      {/* Filters */}
      <aside className="glass p-6 space-y-6 self-start lg:sticky lg:top-24">
        <div>
          <label className="field-label">Category</label>
          <select
            className="field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all" className="bg-navy">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-navy">
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Sort</label>
          <select
            className="field"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="relevance" className="bg-navy">Relevance</option>
            <option value="price-asc" className="bg-navy">Price: low to high</option>
            <option value="price-desc" className="bg-navy">Price: high to low</option>
          </select>
        </div>
        <p className="mt-4 text-[11px] text-gray-2 leading-relaxed">
          Delivery date is confirmed by our team within 24 hours of order.
          No upfront SLA, no hard commitment until we&apos;ve reviewed feasibility.
        </p>
      </aside>

      {/* Results */}
      <div>
        <p
          className="mb-5 mono text-[11px] uppercase text-gray-2"
          style={{ letterSpacing: "0.18em" }}
        >
          {results.length} {results.length === 1 ? "product" : "products"}
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
        {results.length === 0 && (
          <p className="py-16 text-center text-[14px] text-gray-2">
            No products match these filters.
          </p>
        )}
      </div>
    </div>
  );
}
