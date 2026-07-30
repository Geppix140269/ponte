// A strict reader for generated email HTML.
//
// Why this exists, precisely
// --------------------------
// Ponte's email HTML is built by string concatenation, because that is the only
// way to produce a document an email client will render: no custom properties,
// no stylesheet link, no web font, every value a literal inside a style
// attribute. String concatenation has one failure mode that nothing else in the
// codebase has — a lost separator silently fuses two declarations into one:
//
//     padding:24px 32px;border-bottom:1px solid #E5DFD2      correct
//     padding:24px 32border-bottom:1px solid #E5DFD2         one lost "px;"
//
// The second is not a syntax error to any HTML parser. The attribute is still
// quoted, the tag still closes, the document still renders. What happens is that
// the client drops the whole declaration it cannot parse, so the header loses
// its padding and its rule, and the email arrives looking broken with nothing
// anywhere reporting a fault. A build passes. A type check passes. A test that
// only asserts "the subject is present" passes.
//
// So the defect class needs a reader that fails on it, and the reader has to be
// stricter than a browser rather than as forgiving as one. Three properties are
// checked, in order of what they catch:
//
//   1. TAG STRUCTURE — every element that opens is closed, in order. Catches a
//      truncated paste and a dropped closing tag.
//   2. ATTRIBUTES — every attribute is a valid name with a quoted, terminated
//      value. Catches a value that swallowed the markup after it.
//   3. DECLARATIONS — every declaration in every style attribute has one
//      property, a value, and no numeric token wearing something that is not a
//      unit. This is the check that catches the fusion above, and it catches it
//      generically rather than by looking for one known-bad string.
//
// It is deliberately dependency-free. A validator that needs a DOM library is a
// validator that cannot run inside `npm test` next to the thing it validates,
// and the whole point is that it runs every time.
//
// It reads Go template syntax without complaint ({{ .Token }}), because the
// Supabase Auth templates are checked by the same reader as the application
// shell. There is otherwise no reason for those two to be held to different
// standards, and the provider-side templates are the ones a human pastes by
// hand.

export type AuditFinding = {
  /** What went wrong, in one line, naming the offending text. */
  message: string;
  /** Byte offset into the audited source, so a failure is locatable. */
  offset: number;
  /** The source around the offset, for a readable assertion message. */
  excerpt: string;
};

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/** Elements that never take a closing tag. */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Elements whose content is text, not markup. */
const RAWTEXT_ELEMENTS = new Set(["style", "script", "title", "textarea"]);

/**
 * Every CSS unit an email may legitimately use, plus the empty unit.
 *
 * The list is short on purpose. An email works in px, per cent and unitless
 * ratios; the rest are here because a token file could reasonably produce them,
 * not because a template should. A unit that is not on this list is far more
 * likely to be a fused property name than a considered choice, and the finding
 * says which one it saw.
 */
const CSS_UNITS = new Set([
  "", "%", "px", "em", "rem", "pt", "pc", "ex", "ch",
  "cm", "mm", "in", "q",
  "vh", "vw", "vmin", "vmax",
  "s", "ms", "deg", "rad", "turn", "fr", "dpi", "dppx", "x",
]);

const ATTRIBUTE_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/;
const CSS_PROPERTY = /^-{0,2}[A-Za-z][A-Za-z0-9-]*$/;

/**
 * A numeric token: an optional sign, digits with an optional decimal part or a
 * leading decimal point, then whatever it is wearing as a unit.
 *
 * Anchored at both ends so `#E5DFD2` and `Roboto` are not numeric tokens and
 * are never examined. It is the trailing group that carries the whole value of
 * this module: `32px` yields `px`, and `32border-bottom` yields
 * `border-bottom`.
 */
const NUMERIC_TOKEN = /^[+-]?(?:\d+\.?\d*|\.\d+)(.*)$/;

/* ------------------------------------------------------------------ */
/* Style attributes                                                    */
/* ------------------------------------------------------------------ */

/**
 * Split a declaration list on top-level semicolons.
 *
 * Quoted font names are the only place a semicolon could hide in a Ponte email,
 * but splitting naively is how a validator starts reporting on text it has
 * misread, so quotes and parentheses are tracked.
 */
function splitDeclarations(css: string): { text: string; offset: number }[] {
  const out: { text: string; offset: number }[] = [];
  let start = 0;
  let quote: string | null = null;
  let depth = 0;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "(") { depth++; continue; }
    if (ch === ")") { if (depth > 0) depth--; continue; }
    if (ch === ";" && depth === 0) {
      out.push({ text: css.slice(start, i), offset: start });
      start = i + 1;
    }
  }
  out.push({ text: css.slice(start), offset: start });
  return out.filter((d) => d.text.trim() !== "");
}

/** Value tokens, ignoring anything inside quotes or a function call. */
function valueTokens(value: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote: string | null = null;
  let depth = 0;

  const flush = () => { if (current !== "") { out.push(current); current = ""; } };

  for (const ch of value) {
    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === "(") { depth++; current += ch; continue; }
    if (ch === ")") { if (depth > 0) depth--; current += ch; continue; }
    if (depth > 0) { current += ch; continue; }
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === ",") { flush(); continue; }
    current += ch;
  }
  flush();
  // A token that opened a quote or a function is not examined for units: it is
  // a font name or a colour function, and neither is a measurement.
  return out.filter((t) => !/["'()]/.test(t));
}

/**
 * Audit one style attribute value.
 *
 * `base` is the offset of the value inside the whole document, so a finding
 * points at the character rather than at the element.
 */
function auditStyleValue(css: string, base: number, where: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const decl of splitDeclarations(css)) {
    const at = base + decl.offset;
    const raw = decl.text;
    const colon = raw.indexOf(":");

    if (colon === -1) {
      findings.push({
        message: `${where}: declaration "${raw.trim()}" has no property/value separator`,
        offset: at, excerpt: raw.trim(),
      });
      continue;
    }

    const property = raw.slice(0, colon).trim();
    const value = raw.slice(colon + 1).trim();

    if (!CSS_PROPERTY.test(property)) {
      findings.push({
        message: `${where}: "${property}" is not a CSS property name`,
        offset: at, excerpt: raw.trim(),
      });
      continue;
    }

    if (value === "") {
      findings.push({
        message: `${where}: "${property}" has an empty value`,
        offset: at, excerpt: raw.trim(),
      });
      continue;
    }

    // A second colon at the top level of a value means a declaration ran into
    // the one after it. This is the fusion caught directly: the lost separator
    // leaves the next property name and ITS colon inside this value.
    const rest = value.replace(/url\([^)]*\)/gi, "").replace(/(["'])(?:(?!\1).)*\1/g, "");
    if (rest.includes(":")) {
      findings.push({
        message:
          `${where}: "${property}" value contains a second declaration ` +
          `("${value}") — a separator was lost`,
        offset: at, excerpt: raw.trim(),
      });
      continue;
    }

    // And the same fusion caught the other way, which is the way it survives a
    // reader looking only for colons: a number wearing a property name as a
    // unit. "32border-bottom" is a number and a unit that does not exist.
    for (const token of valueTokens(value)) {
      const m = NUMERIC_TOKEN.exec(token);
      if (!m) continue;
      const unit = m[1];
      if (!CSS_UNITS.has(unit.toLowerCase())) {
        findings.push({
          message:
            `${where}: "${property}: ${value}" carries the numeric token ` +
            `"${token}", whose unit "${unit}" is not a CSS unit — two ` +
            `declarations are fused`,
          offset: at, excerpt: raw.trim(),
        });
      }
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

function excerptAt(src: string, offset: number): string {
  return src.slice(Math.max(0, offset - 40), offset + 60).replace(/\s+/g, " ");
}

/**
 * Read an email document strictly and return every finding.
 *
 * An empty array means the document's structure, attributes and declarations
 * are all well formed. It does NOT mean the email is correct — that is what the
 * content assertions in the test suite are for.
 */
export function auditEmailHtml(src: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const stack: { name: string; offset: number }[] = [];
  let i = 0;

  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt === -1) break;

    // Comments, doctype and other declarations carry no structure to check.
    if (src.startsWith("<!--", lt)) {
      const end = src.indexOf("-->", lt + 4);
      if (end === -1) {
        findings.push({ message: "unterminated comment", offset: lt, excerpt: excerptAt(src, lt) });
        break;
      }
      i = end + 3;
      continue;
    }
    if (src.startsWith("<!", lt) || src.startsWith("<?", lt)) {
      const end = src.indexOf(">", lt);
      if (end === -1) {
        findings.push({ message: "unterminated declaration", offset: lt, excerpt: excerptAt(src, lt) });
        break;
      }
      i = end + 1;
      continue;
    }

    // A closing tag.
    if (src[lt + 1] === "/") {
      const end = src.indexOf(">", lt);
      if (end === -1) {
        findings.push({ message: "unterminated closing tag", offset: lt, excerpt: excerptAt(src, lt) });
        break;
      }
      const name = src.slice(lt + 2, end).trim().toLowerCase();
      const top = stack[stack.length - 1];
      if (!top) {
        findings.push({
          message: `</${name}> closes an element that was never opened`,
          offset: lt, excerpt: excerptAt(src, lt),
        });
      } else if (top.name !== name) {
        findings.push({
          message: `</${name}> closes out of order: <${top.name}> is still open`,
          offset: lt, excerpt: excerptAt(src, lt),
        });
        // Recover by unwinding to the named element if it is open at all, so one
        // mistake yields one finding rather than a cascade.
        const idx = stack.map((s) => s.name).lastIndexOf(name);
        if (idx >= 0) stack.length = idx;
        else stack.pop();
      } else {
        stack.pop();
      }
      i = end + 1;
      continue;
    }

    // An opening tag. Read the name, then walk the attributes explicitly rather
    // than looking for the next ">", which is what lets an unterminated
    // attribute value hide a whole element.
    const nameMatch = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(src.slice(lt));
    if (!nameMatch) {
      // A bare "<" in text. Not valid in a generated document, where every
      // member value passes through esc().
      findings.push({
        message: 'unescaped "<" in text — a value reached the document unescaped',
        offset: lt, excerpt: excerptAt(src, lt),
      });
      i = lt + 1;
      continue;
    }

    const tag = nameMatch[1].toLowerCase();
    let p = lt + nameMatch[0].length;
    let selfClosing = false;
    const seen = new Set<string>();
    let broken = false;

    for (;;) {
      while (p < src.length && /\s/.test(src[p])) p++;
      if (p >= src.length) {
        findings.push({ message: `<${tag}> is never terminated`, offset: lt, excerpt: excerptAt(src, lt) });
        broken = true;
        break;
      }
      if (src[p] === ">") { p++; break; }
      if (src.startsWith("/>", p)) { selfClosing = true; p += 2; break; }

      const attrStart = p;
      while (p < src.length && !/[\s=>/]/.test(src[p])) p++;
      const attrName = src.slice(attrStart, p);

      if (!ATTRIBUTE_NAME.test(attrName)) {
        findings.push({
          message: `<${tag}> has a malformed attribute name "${attrName}"`,
          offset: attrStart, excerpt: excerptAt(src, attrStart),
        });
        broken = true;
        break;
      }
      if (seen.has(attrName.toLowerCase())) {
        findings.push({
          message: `<${tag}> repeats the attribute "${attrName}"`,
          offset: attrStart, excerpt: excerptAt(src, attrStart),
        });
      }
      seen.add(attrName.toLowerCase());

      while (p < src.length && /\s/.test(src[p])) p++;
      if (src[p] !== "=") continue; // A valueless attribute, which is valid.
      p++;
      while (p < src.length && /\s/.test(src[p])) p++;

      const quote = src[p];
      if (quote !== '"' && quote !== "'") {
        findings.push({
          message:
            `<${tag}> attribute "${attrName}" has an unquoted value — a ` +
            `truncated or fused value is indistinguishable from markup`,
          offset: p, excerpt: excerptAt(src, p),
        });
        broken = true;
        break;
      }
      const valueStart = p + 1;
      const valueEnd = src.indexOf(quote, valueStart);
      if (valueEnd === -1) {
        findings.push({
          message: `<${tag}> attribute "${attrName}" has an unterminated value`,
          offset: p, excerpt: excerptAt(src, p),
        });
        broken = true;
        break;
      }
      const value = src.slice(valueStart, valueEnd);

      if (value.includes("<")) {
        findings.push({
          message: `<${tag}> attribute "${attrName}" swallowed markup ("<" inside the value)`,
          offset: valueStart, excerpt: excerptAt(src, valueStart),
        });
      }
      if (attrName.toLowerCase() === "style") {
        findings.push(
          ...auditStyleValue(value, valueStart, `<${tag} style>`),
        );
      }
      p = valueEnd + 1;
    }

    if (broken) break;

    if (!selfClosing && !VOID_ELEMENTS.has(tag)) {
      if (RAWTEXT_ELEMENTS.has(tag)) {
        // Content is text. Skip to the matching close so a "<" or a CSS brace
        // inside it is not read as markup.
        const close = src.toLowerCase().indexOf(`</${tag}`, p);
        if (close === -1) {
          findings.push({
            message: `<${tag}> is never closed`,
            offset: lt, excerpt: excerptAt(src, lt),
          });
          break;
        }
        if (tag === "style") {
          findings.push(...auditStyleBlock(src.slice(p, close), p));
        }
        // Past the closing tag, not up to it. The element was never pushed onto
        // the stack, so leaving its `</tag>` in the stream would make it close
        // whatever is genuinely open — which is how a reader reports four
        // cascading faults for a document that has none.
        const closeEnd = src.indexOf(">", close);
        if (closeEnd === -1) {
          findings.push({
            message: `<${tag}> closing tag is never terminated`,
            offset: close, excerpt: excerptAt(src, close),
          });
          break;
        }
        i = closeEnd + 1;
        continue;
      }
      stack.push({ name: tag, offset: lt });
    }

    i = p;
  }

  for (const open of stack) {
    findings.push({
      message: `<${open.name}> is never closed`,
      offset: open.offset, excerpt: excerptAt(src, open.offset),
    });
  }

  return findings;
}

/**
 * Audit a `<style>` block.
 *
 * The shell's only stylesheet is one media query, so this checks brace balance
 * and audits the declarations inside each rule with the same reader that reads
 * the style attributes. A media query whose braces do not balance takes the
 * rest of the document's styling with it in some clients.
 */
export function auditStyleBlock(css: string, base = 0): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));

  let depth = 0;
  let blockStart = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") {
      depth++;
      if (depth === 1 || depth === 2) blockStart = i + 1;
      continue;
    }
    if (stripped[i] === "}") {
      depth--;
      if (depth < 0) {
        findings.push({
          message: "style block closes a brace that was never opened",
          offset: base + i, excerpt: excerptAt(css, i),
        });
        return findings;
      }
      // Only audit the innermost blocks, which are the ones holding
      // declarations rather than nested rules.
      if (blockStart >= 0) {
        const inner = stripped.slice(blockStart, i);
        if (!inner.includes("{")) {
          findings.push(
            ...auditStyleValue(inner.replace(/!important/gi, ""), base + blockStart, "<style>"),
          );
        }
      }
      blockStart = -1;
    }
  }

  if (depth !== 0) {
    findings.push({
      message: `style block leaves ${depth} brace(s) unclosed`,
      offset: base, excerpt: excerptAt(css, 0),
    });
  }

  return findings;
}

/** A one-line report of every finding, for an assertion message. */
export function formatFindings(findings: readonly AuditFinding[]): string {
  if (findings.length === 0) return "no findings";
  return findings
    .map((f, n) => `  ${n + 1}. [offset ${f.offset}] ${f.message}\n     …${f.excerpt}…`)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Sender identity                                                     */
/* ------------------------------------------------------------------ */

/**
 * The one shape a Ponte sender identity may take.
 *
 * `Ponte Trade <hello@ponte.trade>` and not `hello@ponte.trade`. A bare address
 * is not a cosmetic difference: the inbox list shows the local part, so a
 * member's first sight of an operational email is a sender called "hello"
 * rather than a sender called Ponte Trade. The display name is also one of the
 * signals a receiving domain weighs, and Yahoo and Outlook weigh it more than
 * Gmail does.
 */
export const SENDER_IDENTITY = /^(.+?) <([^<>@\s]+@[^<>@\s]+\.[a-z]{2,})>$/;

export function parseSenderIdentity(
  value: string,
): { displayName: string; address: string } | null {
  const m = SENDER_IDENTITY.exec(value.trim());
  if (!m) return null;
  const displayName = m[1].trim();
  if (displayName === "" || displayName.includes("<") || displayName.includes(">")) return null;
  return { displayName, address: m[2] };
}
