import {
  PDFDocument,
  PDFFont,
  PageSizes,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";

// Extend pdf-lib types to include characterSpacing (present at runtime in >=1.17
// but missing from some pinned type-definition versions).
declare module "pdf-lib" {
  interface PDFPageDrawTextOptions {
    characterSpacing?: number;
  }
}

// Shared separator for footer + diagonal text so the look stays consistent.
const DOT = " · ";

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

/**
 * Format an issue date as "DD MMM YYYY" (e.g. "27 May 2026") for the cover.
 */
export function formatIssuedDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

// =============================================================
// Per-page footer + diagonal watermark
// =============================================================

export interface WatermarkOptions {
  /** Footer text stamped at the bottom of every page (including cover). */
  footerText: string;
  /** Top line of the diagonal stamp. Skipped if omitted. */
  diagonalLine1?: string;
  /** Bottom line of the diagonal stamp. Skipped if omitted. */
  diagonalLine2?: string;
}

/**
 * Stamp a per-buyer licence line at the foot of every page, plus an
 * optional diagonal watermark across every content page (page 1 and
 * beyond — the cover page on page 0 stays clean).
 *
 * The diagonal text auto-fits the page width so it never clips, sits
 * centered, and renders at low opacity in pale gold so report content
 * underneath remains legible.
 */
export async function watermarkPdf(
  bytes: ArrayBuffer | Uint8Array,
  opts: WatermarkOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();

    // Footer line on every page — 9pt, darker grey, readable.
    page.drawText(opts.footerText, {
      x: 24,
      y: 18,
      size: 9,
      font,
      color: rgb(0.3, 0.32, 0.38),
    });

    // Skip the diagonal on the cover (idx 0) so the cover stays clean.
    if (idx === 0) return;
    if (!opts.diagonalLine1 && !opts.diagonalLine2) return;

    // Horizontal width budget along the rotated baseline at 30° rotation.
    const horizontalBudget = (width - 80) / Math.cos(Math.PI / 6);

    const line1 = opts.diagonalLine1 ?? "";
    const line2 = opts.diagonalLine2 ?? "";

    const fit1 = line1
      ? autoFitSize(line1, fontBold, horizontalBudget, 48, 24)
      : null;
    const fit2 = line2
      ? autoFitSize(line2, fontBold, horizontalBudget, 22, 12)
      : null;

    const theta = Math.PI / 6; // 30 deg
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const cx = width / 2;
    const cy = height / 2;
    const goldFaint = rgb(0.85, 0.78, 0.62);
    const opacity = 0.1;
    const gap = 10; // pt perpendicular between the two lines

    function drawRotatedCentered(
      text: string,
      fit: { size: number; width: number },
      perpOffset: number,
    ) {
      const w = fit.width;
      const h = fit.size;
      const x = cx - (w / 2) * cos - perpOffset * sin - (h / 2) * sin;
      const y = cy - (w / 2) * sin + perpOffset * cos - (h / 2) * cos;
      page.drawText(text, {
        x,
        y,
        size: fit.size,
        font: fontBold,
        color: goldFaint,
        rotate: degrees(30),
        opacity,
      });
    }

    if (fit1 && fit2) {
      drawRotatedCentered(line1, fit1, fit2.size / 2 + gap / 2);
      drawRotatedCentered(line2, fit2, -(fit1.size / 2 + gap / 2));
    } else if (fit1) {
      drawRotatedCentered(line1, fit1, 0);
    } else if (fit2) {
      drawRotatedCentered(line2, fit2, 0);
    }
  });

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
  return `Ponte Trade${DOT}Licensed to ${opts.buyer}${DOT}${opts.watermarkId}${DOT}${opts.date}${DOT}ponte.trade`;
}

/**
 * Build the two-line diagonal watermark text from the watermark ID.
 * Returns the strings that should be passed to watermarkPdf's
 * diagonalLine1 / diagonalLine2 options.
 */
export function watermarkDiagonal(watermarkId: string): {
  line1: string;
  line2: string;
} {
  return {
    line1: "PONTE TRADE",
    line2: `LICENSED${DOT}${watermarkId}`,
  };
}

// Auto-fit a text string into a target on-page width, returning {size, width}.
function autoFitSize(
  text: string,
  font: PDFFont,
  targetWidth: number,
  maxSize: number,
  minSize: number,
): { size: number; width: number } {
  for (let size = maxSize; size >= minSize; size -= 1) {
    const w = font.widthOfTextAtSize(text, size);
    if (w <= targetWidth) return { size, width: w };
  }
  return {
    size: minSize,
    width: font.widthOfTextAtSize(text, minSize),
  };
}

// =============================================================
// Cover page
// =============================================================

export interface CoverPageData {
  /** Customer organisation or, if not supplied, customer name/email */
  licensedTo: string;
  /** Senior reviewer initials, e.g. "GF" */
  reviewerInitials: string;
  /** Report title, e.g. the product title */
  reportTitle: string;
  /** Optional secondary line under the title (e.g. "Worldwide · HS 080810") */
  subtitle?: string;
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

  // Report title (middle)
  const titleY = pageHeight / 2 + 40;
  cover.drawText("REPORT", {
    x: 56,
    y: titleY + 60,
    size: 9,
    font: helvBold,
    color: muted,
    characterSpacing: 3,
  });
  const titleMaxWidth = pageWidth - 112;
  const titleSize = 28;
  const titleLines = wrapText(data.reportTitle, times, titleSize, titleMaxWidth);
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

  // Optional subtitle (e.g. "Worldwide · HS 080810")
  if (data.subtitle) {
    cover.drawText(data.subtitle, {
      x: 56,
      y: titleCursor - 6,
      size: 12,
      font: helv,
      color: muted,
    });
    titleCursor -= 20;
  }

  // Italic gold tagline
  cover.drawText("Curated. Cited. Licensed.", {
    x: 56,
    y: titleCursor - 20,
    size: 14,
    font: timesItalic,
    color: gold,
  });

  // Standard footer block (per dev brief v1)
  const footerTop = 220;
  const lineHeight = 16;
  const labelSize = 8;
  const valueSize = 10;
  const labelX = 56;
  const valueX = 170;

  cover.drawLine({
    start: { x: 56, y: footerTop + 24 },
    end: { x: pageWidth - 56, y: footerTop + 24 },
    thickness: 0.5,
    color: hairline,
  });

  const rows: [string, string][] = [
    ["AUTHOR", "Ponte Trade Research Team"],
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

  // Bottom anchor
  cover.drawText(`Ponte Trade${DOT}ponte.trade`, {
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
  font: PDFFont,
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
