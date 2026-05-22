import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Stamps a per-buyer licence line at the foot of every page of a report PDF.
export async function watermarkPdf(
  bytes: ArrayBuffer | Uint8Array,
  text: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 7;
  for (const page of doc.getPages()) {
    page.drawText(text, {
      x: 24,
      y: 14,
      size,
      font,
      color: rgb(0.42, 0.45, 0.5),
    });
  }
  return doc.save();
}

export function watermarkText(opts: {
  buyer: string;
  orderId: string;
  date: string;
}): string {
  return `Ponte Trade — Licensed to ${opts.buyer} — ${opts.orderId.slice(0, 8)} — ${opts.date} — Powered by ADAMftd — pontetrade.com`;
}
