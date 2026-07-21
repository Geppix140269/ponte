// Verification certificate.
//
// One page, watermarked, listing every source and the date it was checked.
// A buyer may rely on this document, so it states plainly what was and was not
// checked, and carries the disclaimer on the same page as the result rather
// than buried elsewhere.
//
// Reuses the brand approach from lib/watermark.ts: navy and gold, serif
// headline, mono metadata.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { VERIFICATION_DISCLAIMER } from "@/lib/verification/pipeline";

const NAVY = rgb(0.059, 0.118, 0.235); // #0F1E3C
const GOLD = rgb(0.910, 0.627, 0.125); // #E8A020
const INK = rgb(0.13, 0.15, 0.19);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.86, 0.88);

const A4 = { w: 595.28, h: 841.89 };
const M = 56; // margin

export type CertificateCheck = {
  check: string;
  result: string;
  source: string;
  note?: string;
};

export type CertificateData = {
  verificationId: string;
  subjectName: string;
  subjectCountry?: string | null;
  subjectRegNumber?: string | null;
  level: number;
  status: string;
  issuedAt: Date;
  checks: CertificateCheck[];
  sources: string[];
  summaryText: string;
  /** Who it is licensed to, printed in the watermark. */
  licensedTo: string;
  /** OpenCorporates free tier requires attribution when its data is used. */
  attribution?: string | null;
};

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; font: PDFFont; size: number; maxWidth: number; color?: ReturnType<typeof rgb>; leading?: number },
): number {
  const leading = opts.leading ?? opts.size * 1.45;
  let y = opts.y;
  for (const line of wrap(text, opts.font, opts.size, opts.maxWidth)) {
    page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color: opts.color ?? INK });
    y -= leading;
  }
  return y;
}

export async function buildCertificate(data: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const contentWidth = A4.w - M * 2;
  const issued = data.issuedAt.toISOString().slice(0, 10);

  // Header band
  page.drawRectangle({ x: 0, y: A4.h - 132, width: A4.w, height: 132, color: NAVY });
  page.drawText("Ponte", { x: M, y: A4.h - 62, size: 26, font: serifBold, color: rgb(1, 1, 1) });
  page.drawText("Verification certificate", {
    x: M,
    y: A4.h - 88,
    size: 11,
    font: sans,
    color: GOLD,
  });
  page.drawText(`Issued ${issued}`, {
    x: A4.w - M - sans.widthOfTextAtSize(`Issued ${issued}`, 9),
    y: A4.h - 62,
    size: 9,
    font: sans,
    color: rgb(0.8, 0.82, 0.86),
  });
  page.drawText(`Reference ${data.verificationId.slice(0, 8).toUpperCase()}`, {
    x: A4.w - M - sans.widthOfTextAtSize(`Reference ${data.verificationId.slice(0, 8).toUpperCase()}`, 9),
    y: A4.h - 76,
    size: 9,
    font: sans,
    color: rgb(0.8, 0.82, 0.86),
  });

  let y = A4.h - 176;

  // Subject
  page.drawText(data.subjectName, { x: M, y, size: 20, font: serifBold, color: NAVY });
  y -= 20;
  const sub = [data.subjectCountry, data.subjectRegNumber && `Reg. ${data.subjectRegNumber}`]
    .filter(Boolean)
    .join("   ");
  if (sub) {
    page.drawText(sub, { x: M, y, size: 10, font: sans, color: MUTED });
    y -= 24;
  } else {
    y -= 8;
  }

  // Outcome
  page.drawRectangle({ x: M, y: y - 34, width: contentWidth, height: 40, color: rgb(0.97, 0.97, 0.95) });
  page.drawRectangle({ x: M, y: y - 34, width: 3, height: 40, color: GOLD });
  page.drawText(`Level ${data.level} verification: ${data.status.replace(/_/g, " ")}`, {
    x: M + 14,
    y: y - 14,
    size: 12,
    font: sansBold,
    color: NAVY,
  });
  y -= 62;

  // Summary
  page.drawText("Summary", { x: M, y, size: 10, font: sansBold, color: NAVY });
  y -= 16;
  y = drawParagraph(page, data.summaryText, {
    x: M,
    y,
    font: sans,
    size: 10,
    maxWidth: contentWidth,
    leading: 15,
  });
  y -= 14;

  // Checks
  page.drawText("Checks performed", { x: M, y, size: 10, font: sansBold, color: NAVY });
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: M + contentWidth, y }, thickness: 0.7, color: LINE });
  y -= 16;

  for (const check of data.checks) {
    if (y < 190) break; // keep room for sources and the disclaimer
    page.drawText(check.check, { x: M, y, size: 9.5, font: sansBold, color: INK });
    const resultText = check.result.replace(/_/g, " ");
    page.drawText(resultText, {
      x: M + contentWidth - sans.widthOfTextAtSize(resultText, 9.5),
      y,
      size: 9.5,
      font: sans,
      color: /pass/i.test(check.result) ? rgb(0.05, 0.45, 0.28) : MUTED,
    });
    y -= 13;
    const detail = [check.source, check.note].filter(Boolean).join(". ");
    if (detail) {
      y = drawParagraph(page, detail, {
        x: M,
        y,
        font: sans,
        size: 8.5,
        maxWidth: contentWidth - 60,
        color: MUTED,
        leading: 11,
      });
    }
    y -= 8;
  }

  // Sources
  y = Math.min(y, 178);
  page.drawLine({ start: { x: M, y }, end: { x: M + contentWidth, y }, thickness: 0.7, color: LINE });
  y -= 14;
  page.drawText("Sources checked", { x: M, y, size: 9, font: sansBold, color: NAVY });
  y -= 12;
  y = drawParagraph(page, data.sources.join(", "), {
    x: M,
    y,
    font: sans,
    size: 8.5,
    maxWidth: contentWidth,
    color: MUTED,
    leading: 11,
  });

  if (data.attribution) {
    y -= 2;
    y = drawParagraph(page, data.attribution, {
      x: M,
      y,
      font: sans,
      size: 7.5,
      maxWidth: contentWidth,
      color: MUTED,
      leading: 10,
    });
  }

  // Disclaimer, on the same page as the result on purpose.
  y -= 10;
  page.drawRectangle({ x: M, y: y - 40, width: contentWidth, height: 44, color: rgb(0.97, 0.97, 0.98) });
  drawParagraph(page, VERIFICATION_DISCLAIMER, {
    x: M + 10,
    y: y - 10,
    font: sans,
    size: 8,
    maxWidth: contentWidth - 20,
    color: MUTED,
    leading: 10.5,
  });

  // Footer and licence line
  const licence = `Licensed to ${data.licensedTo}. Ponte, a trading name of 1402 Celsius Ltd. ponte.trade`;
  page.drawText(licence.slice(0, 120), {
    x: M,
    y: 34,
    size: 7.5,
    font: sans,
    color: MUTED,
  });

  // Diagonal watermark, so a screenshot of the page still carries the licence.
  page.drawText(`${data.licensedTo} · ${issued}`, {
    x: 96,
    y: 300,
    size: 30,
    font: serif,
    color: NAVY,
    opacity: 0.06,
    rotate: { type: "degrees", angle: 32 } as any,
  });

  return pdf.save();
}
