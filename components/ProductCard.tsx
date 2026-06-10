import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice } from "@/lib/format";
import { getCategory } from "@/lib/catalogue";

export default function ProductCard({ product }: { product: Product }) {
  const category = getCategory(product.categorySlug);
  return (
    <Link href={`/product/${product.slug}`} className="card group p-7">
      <div className="flex items-center justify-between mb-4">
        <span className="badge-gold">{category?.name ?? product.categorySlug}</span>
        {product.band && (
          <span
            className="mono text-[10px] text-gray-2 uppercase"
            style={{ letterSpacing: "0.18em" }}
          >
            {product.band}
          </span>
        )}
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

      <div className="mt-4 flex items-center gap-2">
        {product.cobrandable && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold/80">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="opacity-70"><circle cx="4" cy="4" r="3"/></svg>
            Your branding
          </span>
        )}
      </div>
      <div className="mt-3 pt-4 border-t border-white/10 flex items-end justify-between">
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
