/**
 * Text out of a .docx or .xlsx, without adding a document-parsing dependency.
 *
 * An OOXML file is a zip. The words in a Word document are the text nodes of
 * `word/document.xml`; the words in a workbook are the shared string table plus
 * whatever the sheets hold inline. Neither needs a full parser to read as
 * *text*, and the alternative was pulling in a mammoth/xlsx pair for a job that
 * is a hundred lines.
 *
 * `adm-zip` was already vendored here (it is what `scripts/backup.mjs` uses) and
 * is promoted from a devDependency to a dependency by this change, because it
 * now runs in a request rather than only in a script.
 *
 * ## What this deliberately does not do
 *
 * It does not preserve formatting, tables as tables, cell addresses or reading
 * order across floating objects. It extracts the words in document order and
 * nothing else. That is the right level: what happens next is a model reading
 * prose for commercial terms, and a faithful visual reconstruction would buy it
 * nothing. Where reading order genuinely matters, the member can upload the PDF
 * instead, which the model reads natively.
 *
 * Legacy binary `.doc` and `.xls` are NOT handled. They are a different format
 * with no zip container, and guessing at them would produce plausible rubbish.
 * `lib/documents/read.ts` blocks them by name and says why.
 */

import AdmZip from "adm-zip";

/** Everything between XML tags, in document order, with entities decoded. */
function textFromXml(xml: string): string[] {
  const out: string[] = [];
  // Word marks a paragraph break with </w:p> and a tab with <w:tab/>; both are
  // whitespace here, which is enough to keep sentences from running together.
  const normalised = xml
    .replace(/<w:p[ >]/g, "\n<w:p ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\b[^>]*\/?>/g, " ")
    .replace(/<w:br\b[^>]*\/?>/g, "\n");

  const re = /<([a-zA-Z0-9:]+)[^>]*>([^<]*)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalised)) !== null) {
    const raw = m[2];
    if (!raw) continue;
    const text = decode(raw);
    if (text.trim()) out.push(text);
  }
  return out;
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** True when the bytes start with the local file header every zip begins with. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/**
 * The readable text of an OOXML document.
 *
 * Throws on a file that is not a zip or holds no recognised part, so the caller
 * renders the extraction-failure state rather than sending an empty string to a
 * model and calling the empty answer a result.
 */
export function textFromOoxml(bytes: Uint8Array): string {
  if (!looksLikeZip(bytes)) throw new Error("not an OOXML container");

  const zip = new AdmZip(Buffer.from(bytes));
  const entries = zip.getEntries();
  const read = (name: string): string | null => {
    const entry = entries.find((e) => e.entryName === name);
    return entry ? entry.getData().toString("utf8") : null;
  };

  // Word.
  const document = read("word/document.xml");
  if (document) {
    const parts = textFromXml(document);
    const footnotes = read("word/footnotes.xml");
    if (footnotes) parts.push(...textFromXml(footnotes));
    return joined(parts);
  }

  // Excel. The shared string table holds most cell text; sheets carry the rest
  // inline, plus every number, which is where quantities and prices live.
  const shared = read("xl/sharedStrings.xml");
  const sheets = entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.entryName));
  if (shared || sheets.length > 0) {
    const parts: string[] = [];
    if (shared) parts.push(...textFromXml(shared));
    for (const sheet of sheets) parts.push(...textFromXml(sheet.getData().toString("utf8")));
    return joined(parts);
  }

  throw new Error("no readable OOXML part");
}

function joined(parts: string[]): string {
  const text = parts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new Error("OOXML document contained no text");
  return text;
}
