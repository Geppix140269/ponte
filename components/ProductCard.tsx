import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice, DELIVERY_LABEL } from "@/lib/format";
import { getCategory } from "@/lib/catalogue";

export default function ProductCard({ product }: { product: Product }) {
  const category = getCategory(product.categorySlug);
  return (
    <Link href={`/product/${product.slug}`} className="card group p-7">
      <div className="flex items-center justify-between mb-4">
        <span className="badge-gold">{category?.name ?? product.categorySlug}</span>
        <span
          className="mono text-[10px] text-gray-2 uppercase"
          style={{ letterSpacing: "0.18em" }}
        >
          {DELIVERY_LABEL[product.deliveryType]}
        </span>
      </div>

      <h3
        className="serif text-white text-xl leading-snug"
        style={{ fontWeight: 500 }}
      >
        {product.title}
      </h3>
      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-gray-2">
        {product.shortDescription}
      </p>

      <div className="mt-6 pt-4 border-t border-white/10 flex items-end justify-between">
        <span className="serif text-white text-[22px]" style={{ fontWeight: 500 }}>
          {displayPrice(product)}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] uppercase text-gold transition-colors group-hover:text-cream"
          style={{ letterSpacing: "0.18em" }}
        >
          Preview &amp; Buy
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
