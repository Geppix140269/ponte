"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Load the pdf.js worker from CDN matching the bundled version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({
  url,
  pages = 5,
}: {
  url: string;
  pages?: number;
}) {
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [containerWidth, setContainerWidth] = useState(680);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width so the page always fills the available space.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = Math.min(pages, numPages || pages);

  const prev = () => setCurrent((p) => Math.max(1, p - 1));
  const next = () => setCurrent((p) => Math.min(shown, p + 1));

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div ref={containerRef} className="w-full select-none">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <div className="aspect-[1/1.414] w-full animate-pulse rounded-xl bg-mist" />
        }
        error={
          <p className="py-8 text-center text-sm text-navy/50">
            Preview unavailable.
          </p>
        }
      >
        {/* Wrap in relative container so the fade overlay can sit on top */}
        <div className="relative overflow-hidden rounded-xl border border-line shadow-md">
          <Page
            key={current}
            pageNumber={current}
            width={containerWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="aspect-[1/1.414] w-full animate-pulse bg-mist" />
            }
          />
          {/* Gradient fade — hides the left ~70% of every preview page */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-[70%] rounded-l-xl"
            style={{
              background:
                "linear-gradient(to left, transparent 0%, rgba(255,255,255,0.85) 30%, #ffffff 100%)",
            }}
          />
        </div>
      </Document>

      {/* Navigation bar */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={prev}
          disabled={current === 1}
          aria-label="Previous page"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-white text-navy shadow-sm transition-colors hover:bg-mist disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page dots — click to jump */}
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {Array.from({ length: shown }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i + 1)}
              aria-label={`Go to page ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-200 ${
                current === i + 1
                  ? "w-6 bg-gold"
                  : "w-2 bg-navy/20 hover:bg-navy/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={current === shown}
          aria-label="Next page"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-white text-navy shadow-sm transition-colors hover:bg-mist disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-navy/40">
        Page {current} of {shown} · sample preview
      </p>
    </div>
  );
}
