"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Category, DeliveryType, Product } from "@/lib/types";

const DELIVERY_OPTIONS: { value: DeliveryType | "all"; label: string }[] = [
  { value: "all", label: "Any delivery" },
  { value: "48h", label: "48 hours" },
  { value: "72h", label: "72 hours" },
  { value: "96h", label: "96 hours" },
  { value: "custom", label: "Custom" },
];

type Sort = "relevance" | "price-asc" | "price-desc";

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
  const [delivery, setDelivery] = useState<DeliveryType | "all">("all");
  const [sort, setSort] = useState<Sort>("relevance");

  const results = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== "all" && p.categorySlug !== category) return false;
      if (delivery !== "all" && p.deliveryType !== delivery) return false;
      return true;
    });
    if (sort === "price-asc")
      list = [...list].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "price-desc")
      list = [...list].sort((a, b) => b.priceCents - a.priceCents);
    return list;
  }, [products, category, delivery, sort]);

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
          <label className="field-label">Delivery</label>
          <select
            className="field"
            value={delivery}
            onChange={(e) =>
              setDelivery(e.target.value as DeliveryType | "all")
            }
          >
            {DELIVERY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-navy">
                {o.label}
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
