"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Load the pdf.js worker from CDN matching the bundled version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({
  url,
  pages = 3,
}: {
  url: string;
  pages?: number;
}) {
  const [numPages, setNumPages] = useState(0);
  const shown = Math.min(pages, numPages || pages);

  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      loading={<p className="text-sm text-navy/50">Loading preview…</p>}
      error={<p className="text-sm text-navy/50">Preview unavailable.</p>}
      className="grid grid-cols-2 gap-4 sm:grid-cols-3"
    >
      {Array.from({ length: shown }).map((_, i) => (
        <Page
          key={i}
          pageNumber={i + 1}
          width={240}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="overflow-hidden rounded-md border border-line"
        />
      ))}
    </Document>
  );
}
