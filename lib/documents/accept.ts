/**
 * What the upload control offers, and what the reader enforces.
 *
 * Split out of `./read.ts` for the same reason `lib/products/terms.ts` is split
 * out of the extraction: `read.ts` unzips OOXML through `adm-zip`, which is a
 * Node module, and importing it from a client component put `fs` in the browser
 * bundle and failed the build. The file input needs three constants and none of
 * the reading.
 *
 * They stay in one file with the limit they describe, so the control cannot
 * advertise a format the reader rejects or a size the route refuses.
 */

/** Ten megabytes. Above this a member is better served pasting the terms. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The formats a member may be told about, for the upload control's own copy. */
export const ACCEPTED_UPLOAD_HINT = "PDF, Word, spreadsheet, image, plain text or email export";

/** The `accept` attribute for the file input. */
export const ACCEPT_ATTRIBUTE = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".txt",
  ".csv",
  ".eml",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
].join(",");
