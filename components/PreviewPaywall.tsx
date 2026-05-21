import { Lock } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice } from "@/lib/format";

// Placeholder "report page" — stands in for a rasterized PDF page until the
// react-pdf integration and real preview assets are wired (Phase: PDF preview).
function MockPage({ blurred = false }: { blurred?: boolean }) {
  return (
    <div
      className={`aspect-[1/1.414] rounded-md border border-line bg-white p-5 shadow-sm ${
        blurred ? "blur-[6px]" : ""
      }`}
      aria-hidden={blurred}
    >
      <div className="h-2.5 w-1/3 rounded bg-gold/60" />
      <div className="mt-3 h-3 w-3/4 rounded bg-navy/15" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-2 rounded bg-navy/10"
            style={{ width: `${90 - (i % 3) * 12}%` }}
          />
        ))}
      </div>
      <div className="mt-5 h-20 rounded bg-mist" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-2 rounded bg-navy/10" style={{ width: `${85 - i * 9}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function PreviewPaywall({ product }: { product: Product }) {
  const freePages = Math.max(1, product.configFields ? 2 : 3);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Report preview</h2>
        <span className="text-xs text-navy/50">
          First {freePages} pages shown · sample
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: freePages }).map((_, i) => (
          <MockPage key={i} />
        ))}

        {/* Locked page with CSS-blur overlay */}
        <div className="relative col-span-2 sm:col-span-1">
          <MockPage blurred />
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-navy/40 p-4 text-center">
            <Lock className="h-6 w-6 text-white" />
            <p className="mt-2 text-sm font-semibold text-white">
              Unlock the full report
            </p>
            <p className="text-xs text-white/80">{displayPrice(product)}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-navy/50">
        Preview pages are watermarked samples. The full report is delivered as a
        watermarked PDF, licensed to the purchaser.
      </p>
    </div>
  );
}
