// Pure detection + masking of direct contact details. Used to hide contact info
// in public listings, and to mask messages in a deal room until both sides
// accept (contact_unlocked). No I/O.

export type ContactType = "email" | "phone" | "url" | "whatsapp" | "telegram";

const PATTERNS: { type: ContactType; re: RegExp }[] = [
  { type: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { type: "whatsapp", re: /\b(whats\s?app|wa\.me\/\S+)\b/gi },
  { type: "telegram", re: /\b(telegram|t\.me\/\S+)\b/gi },
  { type: "url", re: /\b(?:https?:\/\/|www\.)[^\s]+/gi },
  // Phone: 8+ digits allowing spaces, dashes, parens, optional leading +.
  { type: "phone", re: /\+?\d(?:[\d\s().-]{7,})\d/g },
];

export function detectContactTypes(text: string): ContactType[] {
  const found = new Set<ContactType>();
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text || "")) found.add(type);
  }
  return Array.from(found);
}

export function hasContactInfo(text: string): boolean {
  return detectContactTypes(text).length > 0;
}

export interface MaskResult { masked: string; found: boolean; types: ContactType[] }

// Replace any detected contact detail with a placeholder.
export function maskContactInfo(text: string, placeholder = "[contact hidden]"): MaskResult {
  let out = text || "";
  const types: ContactType[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(out)) {
      types.push(type);
      re.lastIndex = 0;
      out = out.replace(re, placeholder);
    }
  }
  return { masked: out, found: types.length > 0, types };
}
