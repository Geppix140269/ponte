"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, PRODUCTS } from "@/lib/catalogue";
import type { DeliveryType } from "@/lib/types";

const DELIVERY_OPTIONS: { value: DeliveryType | "all"; label: string }[] = [
  { value: "all", label: "Any delivery" },
  { value: "instant", label: "Instant" },
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "custom", label: "Custom" },
];

type Sort = "relevance" | "price-asc" | "price-desc";

export default function CatalogueBrowser({
  initialCategory = "all",
}: {
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [delivery, setDelivery] = useState<DeliveryType | "all">("all");
  const [sort, setSort] = useState<Sort>("relevance");

  const results = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (category !== "all" && p.categorySlug !== category) return false;
      if (delivery !== "all" && p.deliveryType !== delivery) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.priceCents - a.priceCents);
    return list;
  }, [category, delivery, sort]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      {/* Filters */}
      <aside className="space-y-6">
        <div>
          <label className="field-label">Category</label>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Delivery</label>
          <select className="field" value={delivery} onChange={(e) => setDelivery(e.target.value as DeliveryType | "all")}>
            {DELIVERY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Sort</label>
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </aside>

      {/* Results */}
      <div>
        <p className="mb-5 text-sm text-navy/55">{results.length} products</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
        {results.length === 0 && (
          <p className="py-16 text-center text-sm text-navy/50">
            No products match these filters.
          </p>
        )}
      </div>
    </div>
  );
}
