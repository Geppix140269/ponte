/**
 * Turning an uploaded trade document into something Ponte can read.
 *
 * Three outcomes, and the type makes the caller handle all three:
 *
 *   `text`    the words, extracted here. The deterministic product scan runs on
 *             these, so the three-product acceptance case never depends on a
 *             model call.
 *   `blocks`  a model content block, for a PDF or an image the model reads
 *             natively. Text extraction still happens where possible, and a PDF
 *             carries both so the scan has something to work with.
 *   `blocked` a format this repository cannot read, named, with a reason the
 *             member can act on.
 *
 * ## Why there is no PDF text parser here
 *
 * There was a real choice between adding a PDF text library and sending the PDF
 * to the model as a document block. The block wins on three counts: no new
 * runtime dependency, no second unmetered path (everything still goes through
 * `lib/ai.ts`, which is the file that keeps every model call costed), and it
 * reads scanned PDFs, which a text extractor cannot. The cost is that a PDF's
 * text is not available to the deterministic scan, so a PDF's product
 * identification leans on the model stage. That is recorded rather than hidden:
 * `textAvailable` is false for a PDF, and the extraction records it.
 *
 * ## What is not accepted, and why it is named rather than silently dropped
 *
 * Legacy binary `.doc` and `.xls` need a parser this repository does not have.
 * A format that cannot be read must say so and offer the two intake methods
 * that work, because "nothing happened" is the failure the whole decision was
 * taken to remove.
 */

import type { UserBlock } from "@/lib/ai";
import { MAX_UPLOAD_BYTES } from "./accept";
import { looksLikeZip, textFromOoxml } from "./ooxml";

// Re-exported so a server-side caller still has one import for the whole
// upload contract. A CLIENT component must import from `./accept` instead:
// this module unzips OOXML through adm-zip, and pulling that into a browser
// bundle is a build failure, which is how the split came to exist.
export { ACCEPT_ATTRIBUTE, ACCEPTED_UPLOAD_HINT, MAX_UPLOAD_BYTES } from "./accept";

export type ImageMedia = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

const IMAGE_MEDIA: Record<string, ImageMedia> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Extensions read as UTF-8 prose. `.eml` is an email export; `.msg` is not. */
const TEXT_EXTENSIONS = new Set(["txt", "text", "md", "csv", "tsv", "eml", "mbox", "json", "rtf"]);

const OOXML_EXTENSIONS = new Set(["docx", "xlsx", "docm", "xlsm"]);

/** Named so the blocked state can explain itself instead of shrugging. */
const KNOWN_UNREADABLE: Record<string, string> = {
  doc: "Legacy Word documents are a binary format Ponte cannot read yet.",
  xls: "Legacy Excel workbooks are a binary format Ponte cannot read yet.",
  ppt: "Legacy PowerPoint files are a binary format Ponte cannot read yet.",
  pptx: "Slide decks are not supported for extraction yet.",
  msg: "Outlook .msg files are a proprietary format. Export the email as .eml instead.",
  zip: "Ponte reads one document at a time. Upload the offer itself rather than an archive.",
  rar: "Ponte reads one document at a time. Upload the offer itself rather than an archive.",
  "7z": "Ponte reads one document at a time. Upload the offer itself rather than an archive.",
};

export type ReadResult =
  | {
      kind: "readable";
      filename: string;
      /** The extracted words, empty when only the model can read the file. */
      text: string;
      /** False for a PDF or an image, where the words are not extracted here. */
      textAvailable: boolean;
      /** What to send the model. Always at least one block. */
      blocks: UserBlock[];
      bytes: number;
    }
  | {
      kind: "blocked";
      filename: string;
      /** The extension, so the surface can name it. */
      format: string;
      reason: string;
    }
  | {
      kind: "failed";
      filename: string;
      reason: string;
    };

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Is this UTF-8 prose rather than binary that happens to decode?
 *
 * A binary file read as UTF-8 produces replacement characters and control
 * bytes. Checking for those is what stops a mislabelled upload reaching the
 * model as several thousand tokens of noise.
 */
function looksLikeText(text: string): boolean {
  if (!text.trim()) return false;
  const suspicious = (text.match(/[\u0000-\u0008\u000e-\u001f\ufffd]/g) ?? []).length;
  return suspicious / text.length < 0.01;
}

/**
 * Read an upload.
 *
 * Pure over its inputs and free of Next, so the type routing and every failure
 * branch are unit-testable without a request.
 */
export function readDocument(filename: string, bytes: Uint8Array): ReadResult {
  const name = filename.trim() || "document";
  const ext = extensionOf(name);

  if (bytes.length === 0) {
    return { kind: "failed", filename: name, reason: "The file was empty." };
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return {
      kind: "failed",
      filename: name,
      reason: `The file is larger than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }

  if (KNOWN_UNREADABLE[ext]) {
    return { kind: "blocked", filename: name, format: ext, reason: KNOWN_UNREADABLE[ext] };
  }

  if (ext === "pdf") {
    return {
      kind: "readable",
      filename: name,
      text: "",
      textAvailable: false,
      blocks: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(bytes) } },
      ],
      bytes: bytes.length,
    };
  }

  const image = IMAGE_MEDIA[ext];
  if (image) {
    return {
      kind: "readable",
      filename: name,
      text: "",
      textAvailable: false,
      blocks: [{ type: "image", source: { type: "base64", media_type: image, data: base64(bytes) } }],
      bytes: bytes.length,
    };
  }

  if (OOXML_EXTENSIONS.has(ext) || (ext === "" && looksLikeZip(bytes))) {
    try {
      const text = textFromOoxml(bytes);
      return {
        kind: "readable",
        filename: name,
        text,
        textAvailable: true,
        blocks: [{ type: "text", text }],
        bytes: bytes.length,
      };
    } catch (err) {
      return {
        kind: "failed",
        filename: name,
        reason: `Ponte could not read the document (${(err as Error).message}).`,
      };
    }
  }

  if (TEXT_EXTENSIONS.has(ext) || ext === "") {
    const text = Buffer.from(bytes).toString("utf8");
    if (!looksLikeText(text)) {
      return {
        kind: "blocked",
        filename: name,
        format: ext || "unknown",
        reason: "Ponte could not tell what format this file is. Save it as PDF and try again.",
      };
    }
    return {
      kind: "readable",
      filename: name,
      text,
      textAvailable: true,
      blocks: [{ type: "text", text }],
      bytes: bytes.length,
    };
  }

  return {
    kind: "blocked",
    filename: name,
    format: ext,
    reason: `Ponte does not read .${ext} files yet.`,
  };
}
