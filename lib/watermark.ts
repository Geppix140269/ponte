import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

// =============================================================
// Watermark ID
// =============================================================

/**
 * Generate the formal watermark ID per dev brief v1.
 * Format: PONTE-YYYY-MM-XXXX where XXXX is the first 4 chars of the order
 * UUID, uppercased and stripped of dashes. Stable, human-readable, and
 * unique per order per month.
 *
 * Example: PONTE-2026-05-A1B2
 */
export function formatWatermarkId(orderId: string, createdAt: Date): string {
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  const short = orderId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `PONTE-${year}-${month}-${short}`;
}

// =============================================================
// Per-page footer watermark
// =============================================================

/**
 * Stamp a per-buyer licence line at the foot of every page of a report PDF.
 * Called AFTER the cover page is prepended so the cover also gets stamped.
 */
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

/**
 * Per-page footer text. Includes the formal watermark ID so each page
 * is independently traceable to the order.
 */
export function watermarkText(opts: {
  buyer: string;
  watermarkId: string;
  date: string;
}): string {
  return `Ponte Trade · Licensed to ${opts.buyer} · ${opts.watermarkId} · ${opts.date} · ponte.trade`;
}

// =============================================================
// Cover page
// =============================================================

export interface CoverPageData {
  /** Customer organisation or, if not supplied, customer name/email */
  licensedTo: string;
  /** Senior reviewer initials, e.g. "GF" */
  reviewerInitials: string;
  /** Report title (e.g. product title), optional */
  reportTitle?: string;
  /** Issue date, formatted "DD MMM YYYY" */
  issuedDate: string;
  /** Formal watermark ID PONTE-YYYY-MM-XXXX */
  watermarkId: string;
}

/**
 * Prepend a Ponte Trade cover page to the report PDF. The cover carries
 * the brand mark + report title at the top and the standard footer block
 * (Author, Senior Reviewer, Issued, Licensed to, Licence, Watermark ID)
 * at the bottom, matching the brief.
 *
 * Returns the bytes of the new PDF with the cover at page 0.
 */
export async function prependCoverPage(
  bytes: ArrayBuffer | Uint8Array,
  data: CoverPageData,
): Promise<Uint8Array> {
  const original = await PDFDocument.load(bytes);
  const output = await PDFDocument.create();

  const helv = await output.embedFont(StandardFonts.Helvetica);
  const helvBold = await output.embedFont(StandardFonts.HelveticaBold);
  const times = await output.embedFont(StandardFonts.TimesRoman);
  const timesItalic = await output.embedFont(StandardFonts.TimesRomanItalic);

  // A4 cover page
  const [pageWidth, pageHeight] = PageSizes.A4;
  const cover = output.addPage([pageWidth, pageHeight]);

  // Brand colours (matching site brand: navy + gold)
  const navy = rgb(0.059, 0.118, 0.235); // #0F1E3C
  const gold = rgb(0.788, 0.561, 0.094); // #C9973A
  const ink = rgb(0.18, 0.18, 0.22);
  const muted = rgb(0.42, 0.45, 0.5);
  const hairline = rgb(0.85, 0.85, 0.88);

  // Wordmark at top
  cover.drawText("PONTE TRADE", {
    x: 56,
    y: pageHeight - 80,
    size: 18,
    font: helvBold,
    color: navy,
    characterSpacing: 3,
  });
  cover.drawText("Trade intelligence. Delivered.", {
    x: 56,
    y: pageHeight - 100,
    size: 9,
    font: helv,
    color: gold,
    characterSpacing: 1.2,
  });

  // Report title block (middle)
  const titleY = pageHeight / 2 + 40;
  cover.drawText("REPORT", {
    x: 56,
    y: titleY + 60,
    size: 9,
    font: helvBold,
    color: muted,
    characterSpacing: 3,
  });
  const title = data.reportTitle ?? "Senior-analyst research brief";
  // Wrap title manually if long. Max width ~ pageWidth - 112
  const titleMaxWidth = pageWidth - 112;
  const titleSize = 28;
  const titleLines = wrapText(title, times, titleSize, titleMaxWidth);
  let titleCursor = titleY + 20;
  for (const line of titleLines.slice(0, 3)) {
    cover.drawText(line, {
      x: 56,
      y: titleCursor,
      size: titleSize,
      font: times,
      color: navy,
    });
    titleCursor -= titleSize * 1.1;
  }

  // Italic gold mark line
  cover.drawText("Curated. Cited. Licensed.", {
    x: 56,
    y: titleCursor - 20,
    size: 14,
    font: timesItalic,
    color: gold,
  });

  // Footer block (the standard cover footer per dev brief v1)
  const footerTop = 220;
  const lineHeight = 16;
  const labelSize = 8;
  const valueSize = 10;
  const labelX = 56;
  const valueX = 170;

  // Hairline above the block
  cover.drawLine({
    start: { x: 56, y: footerTop + 24 },
    end: { x: pageWidth - 56, y: footerTop + 24 },
    thickness: 0.5,
    color: hairline,
  });

  const rows: [string, string][] = [
    ["AUTHOR", "ICTTM Research Team"],
    ["SENIOR REVIEWER", data.reviewerInitials || "GF"],
    ["ISSUED", data.issuedDate],
    ["LICENSED TO", data.licensedTo],
    ["LICENCE", "Single-organisation use. No redistribution."],
    ["WATERMARK ID", data.watermarkId],
  ];

  rows.forEach(([label, value], i) => {
    const y = footerTop - i * lineHeight;
    cover.drawText(label, {
      x: labelX,
      y,
      size: labelSize,
      font: helvBold,
      color: muted,
      characterSpacing: 1.5,
    });
    cover.drawText(value, {
      x: valueX,
      y,
      size: valueSize,
      font: helv,
      color: ink,
    });
  });

  // Bottom-of-page anchor: ponte.trade + ICTTM line
  cover.drawText("Ponte Trade — An ICTTM Company — ponte.trade", {
    x: 56,
    y: 40,
    size: 8,
    font: helv,
    color: muted,
    characterSpacing: 0.8,
  });

  // Append all original pages after the cover
  const originalPageCount = original.getPageCount();
  const copiedPages = await output.copyPages(
    original,
    Array.from({ length: originalPageCount }, (_, i) => i),
  );
  for (const p of copiedPages) output.addPage(p);

  return output.save();
}

// Greedy text wrapping using pdf-lib's widthOfTextAtSize.
function wrapText(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? current + " " + word : word;
    const w = font.widthOfTextAtSize(trial, size);
    if (w <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// =============================================================
// Convenience helper
// =============================================================

/**
 * Format an issue date as "DD MMM YYYY" (e.g. "27 May 2026") for the cover.
 */
export function formatIssuedDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
