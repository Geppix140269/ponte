// Pure fraud-detection helpers: normalization for duplicate detection and
// severity mapping. No I/O — the service layer does the DB lookups.

const LEGAL_SUFFIXES = new Set([
  "ltd", "limited", "llc", "llp", "inc", "incorporated", "co", "corp",
  "corporation", "company", "plc", "bv", "sa", "sas", "gmbh", "srl", "ag",
  "oy", "ab", "as", "pte", "pty", "nv", "spa", "sl", "kg", "ug",
]);

// Lowercase, strip punctuation, drop trailing legal-form tokens, collapse space.
export function normalizeCompanyName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/\./g, "")                                  // drop dots: "B.V." -> "bv", "Co." -> "co"
    .replace(/[,/#!$%^&*;:{}=\-_`~()'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

// Bare registrable domain: no scheme, no www, no path.
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

export function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return normalizeDomain(email.slice(at + 1));
}

export type DuplicateKind = "name" | "domain";
export function severityForDuplicate(kind: DuplicateKind): "low" | "medium" | "high" {
  // A shared domain is a stronger signal than a shared name.
  return kind === "domain" ? "high" : "medium";
}

// Free / disposable email domains are weak signals for company identity.
const FREEMAIL = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com",
  "proton.me", "protonmail.com", "gmx.com", "mail.com", "yandex.com",
]);
export function isFreemailDomain(domain: string): boolean {
  return FREEMAIL.has(normalizeDomain(domain));
}
