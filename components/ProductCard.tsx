import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice, DELIVERY_LABEL } from "@/lib/format";
import { getCategory } from "@/lib/catalogue";

export default function ProductCard({ product }: { product: Product }) {
  const category = getCategory(product.categorySlug);
  return (
    <Link href={`/product/${product.slug}`} className="card group p-6">
      <div className="flex items-center justify-between">
        <span className="badge-gold">{category?.name ?? product.categorySlug}</span>
        <span className="text-[11px] font-medium text-navy/50">
          {DELIVERY_LABEL[product.deliveryType]}
        </span>
      </div>

      <h3 className="mt-4 text-base font-bold leading-snug text-navy">
        {product.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/60">
        {product.shortDescription}
      </p>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-lg font-extrabold text-navy">
          {displayPrice(product)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 transition-colors group-hover:text-navy">
          Preview &amp; Buy
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
