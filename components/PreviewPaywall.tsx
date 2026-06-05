import { Lock } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice } from "@/lib/format";
import PdfPreview from "@/components/PdfPreview";

// Placeholder "report page", shown when no real PDF has been uploaded yet.
function MockPage({ blurred = false }: { blurred?: boolean }) {
  return (
    <div
      className={`aspect-[1/1.414] rounded-md bg-cream/95 p-5 ${
        blurred ? "blur-[6px]" : ""
      }`}
      aria-hidden={blurred}
    >
      <div className="h-2.5 w-1/3 rounded bg-gold/60" />
      <div className="mt-3 h-3 w-3/4 rounded bg-surface/15" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-2 rounded bg-surface/10"
            style={{ width: `${90 - (i % 3) * 12}%` }}
          />
        ))}
      </div>
      <div className="mt-5 h-20 rounded bg-surface/5" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-2 rounded bg-surface/10"
            style={{ width: `${85 - i * 9}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PreviewPaywall({ product }: { product: Product }) {
  const freePages = product.previewPages ?? (product.configFields ? 2 : 3);

  return (
    <div className="glass p-8">
      <h2
        className="serif text-ink text-xl"
        style={{ fontWeight: 500 }}
      >
        Report preview
      </h2>

      {product.previewPdfUrl ? (
        <div className="mt-5">
          <PdfPreview url={product.previewPdfUrl} pages={freePages} />
          <div className="mt-5 glass-tight p-6 flex flex-col items-center text-center">
            <Lock className="h-6 w-6 text-gold" />
            <p
              className="serif text-ink mt-3"
              style={{ fontSize: 18, fontWeight: 500 }}
            >
              Unlock the full report, {displayPrice(product)}
            </p>
            <p className="mt-1 text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.18em" }}>
              Delivered as a watermarked PDF licensed to you
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: Math.min(freePages, 2) }).map((_, i) => (
            <MockPage key={i} />
          ))}
          <div className="relative col-span-2 sm:col-span-1">
            <MockPage blurred />
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-surface/70 p-4 text-center">
              <Lock className="h-6 w-6 text-ink" />
              <p
                className="serif text-ink mt-3"
                style={{ fontSize: 16, fontWeight: 500 }}
              >
                Unlock the full report
              </p>
              <p className="text-[11px] uppercase text-gold mt-1" style={{ letterSpacing: "0.18em" }}>
                {displayPrice(product)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-gray-2">
        Preview pages are watermarked samples. The full report is delivered as
        a watermarked PDF, licensed to the purchaser.
      </p>
    </div>
  );
}
