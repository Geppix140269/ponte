"use client";

import dynamic from "next/dynamic";

// react-pdf is heavy and browser-only — load it lazily, client-side only.
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-gray-2">Loading preview…</p>
  ),
});

export default function PdfPreview({
  url,
  pages,
}: {
  url: string;
  pages?: number;
}) {
  return <PdfViewer url={url} pages={pages} />;
}
