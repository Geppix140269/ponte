// Reading a listing the way a trader reads it.
//
// The board and the listing page both need the same four facts at a glance:
// quantity, incoterm, corridor and how old the post is. The database keeps
// some of those as one composed string, because ListingForm writes them that
// way, so the helpers here take them apart again. Nothing is invented: when a
// value cannot be recovered the caller is handed null and shows "not stated".

/** Quantity, unit and frequency, recovered from the composed `volume` text. */
export type ParsedVolume = {
  /** The quantity exactly as the member typed it, e.g. "25,000". */
  quantity: string | null;
  /** The same quantity as a number, when it is one. */
  quantityNumeric: number | null;
  /** The unit token as stored, e.g. "MT". Unit codes are never translated. */
  unit: string | null;
  /** The stored frequency, e.g. "per month". Empty for a one-off. */
  frequency: string | null;
  /** The whole string, for when it does not parse at all. */
  raw: string;
};

// ListingForm composes `volume` as "<qty> <unit>[ <frequency lowercased>]".
const VOLUME_RE = /^\s*([0-9][0-9.,' \s]*?)\s+(\S+)(?:\s+(.+))?\s*$/;

export function parseVolume(volume: string | null | undefined): ParsedVolume {
  const raw = (volume ?? "").trim();
  const empty: ParsedVolume = {
    quantity: null,
    quantityNumeric: null,
    unit: null,
    frequency: null,
    raw,
  };
  if (!raw) return empty;

  const m = VOLUME_RE.exec(raw);
  if (!m) return { ...empty, quantity: raw };

  const [, qty, unit, rest] = m;
  const cleaned = qty.replace(/[\s' ]/g, "");
  // "25,000" and "25.000" are both thousands grouping in the wild. A single
  // separator with exactly three digits after it is treated as grouping;
  // anything else is left alone rather than guessed at.
  const grouped = /^\d{1,3}([.,]\d{3})+$/.test(cleaned)
    ? cleaned.replace(/[.,]/g, "")
    : cleaned.replace(/,/g, ".");
  const n = Number(grouped);

  return {
    quantity: qty.trim(),
    quantityNumeric: Number.isFinite(n) && n > 0 ? n : null,
    unit,
    frequency: rest?.trim() || null,
    raw,
  };
}

/**
 * Group digits for the reader's locale but keep Latin figures: a trading
 * board is read in Latin digits everywhere.
 */
export function formatQuantity(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(`${locale}-u-nu-latn`, {
      maximumFractionDigits: 3,
    }).format(n);
  } catch {
    return String(n);
  }
}

/** Posted date, short and unambiguous, in the reader's locale. */
export function formatPosted(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

// ---------------------------------------------------------------------------
// Stored value -> listingForm message key.
//
// These are the exact English values ListingForm sends to Supabase. Reusing
// the keys the member picked from means the board shows them the same words,
// already translated into ten languages, with no second copy to maintain.
// ---------------------------------------------------------------------------

export const UNIT_KEYS: Record<string, string> = {
  MT: "units.mt",
  KG: "units.kg",
  Tons: "units.tons",
  Litres: "units.litres",
  Units: "units.units",
  Pallets: "units.pallets",
  Containers: "units.containers",
  Other: "units.other",
};

export const FREQUENCY_KEYS: Record<string, string> = {
  "one-off": "frequency.oneOff",
  "per month": "frequency.perMonth",
  "per quarter": "frequency.perQuarter",
  "per year": "frequency.perYear",
  ongoing: "frequency.ongoing",
};

export const TIMING_KEYS: Record<string, string> = {
  "ready now": "timing.readyNow",
  "within 30 days": "timing.within30Days",
  "within 90 days": "timing.within90Days",
  seasonal: "timing.seasonal",
  "to be agreed": "timing.toBeAgreed",
  "as soon as possible": "timing.asSoonAsPossible",
  flexible: "timing.flexible",
};

export const ROLE_KEYS: Record<string, string> = {
  "producer / owner of the goods": "roles.offer.producer",
  "trading company holding title": "roles.offer.tradingCo",
  "broker with a seller mandate": "roles.offer.mandatedBroker",
  "end buyer": "roles.requirement.endBuyer",
  "trading company": "roles.requirement.tradingCo",
  "broker with a buyer mandate": "roles.requirement.mandatedBroker",
  "intermediary (no mandate)": "roles.offer.intermediary",
};

export const CHAIN_KEYS: Record<string, string> = {
  "direct to the producer": "chain.directToProducer",
  "direct to the end buyer": "chain.directToEndBuyer",
  "one intermediary between": "chain.oneIntermediary",
  "two or more intermediaries": "chain.twoOrMore",
  "not sure": "chain.notSure",
};

/**
 * Look a stored value up in one of the maps above. An unknown value is
 * returned as it was stored rather than dropped: it is still what the member
 * said, it just predates the option list.
 */
export function labelFor(
  value: string | null | undefined,
  map: Record<string, string>,
  translate: (key: string) => string,
): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const key = map[v] ?? map[v.toLowerCase()];
  if (!key) return v;
  try {
    return translate(key);
  } catch {
    return v;
  }
}

/**
 * Timing is the one term ListingForm folds into the free text rather than a
 * column, as "Availability: Ready now" or "Needed: Within 30 days". Those two
 * prefixes are written by the form in English on every listing, so the
 * original details can be read for them. A line that does not match is left
 * alone: nothing is guessed.
 */
export function extractTiming(details: string | null | undefined): string | null {
  if (!details) return null;
  const m = /^(?:Availability|Needed):\s*(.+)$/m.exec(details);
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Corridor
// ---------------------------------------------------------------------------

// Origin and destination are free text, so a code is only shown when the text
// actually names a country. Everything else falls back to the member's own
// words. Aliases cover the spellings that turn up in trade documents.
const ISO2: Record<string, string> = {
  afghanistan: "AF", albania: "AL", algeria: "DZ", angola: "AO", argentina: "AR",
  armenia: "AM", australia: "AU", austria: "AT", azerbaijan: "AZ", bahrain: "BH",
  bangladesh: "BD", belarus: "BY", belgium: "BE", benin: "BJ", bolivia: "BO",
  bosnia: "BA", "bosnia and herzegovina": "BA", botswana: "BW", brazil: "BR",
  brasil: "BR", bulgaria: "BG", "burkina faso": "BF", cambodia: "KH",
  cameroon: "CM", canada: "CA", chile: "CL", china: "CN", "prc": "CN",
  colombia: "CO", "costa rica": "CR", "cote d'ivoire": "CI", "côte d'ivoire": "CI",
  "ivory coast": "CI", croatia: "HR", cuba: "CU", cyprus: "CY", czechia: "CZ",
  "czech republic": "CZ", denmark: "DK", "dominican republic": "DO", drc: "CD",
  "dr congo": "CD", "democratic republic of the congo": "CD", congo: "CG",
  ecuador: "EC", egypt: "EG", "el salvador": "SV", estonia: "EE", ethiopia: "ET",
  finland: "FI", france: "FR", gabon: "GA", georgia: "GE", germany: "DE",
  deutschland: "DE", ghana: "GH", greece: "GR", guatemala: "GT", guinea: "GN",
  honduras: "HN", "hong kong": "HK", hungary: "HU", iceland: "IS", india: "IN",
  indonesia: "ID", iran: "IR", iraq: "IQ", ireland: "IE", israel: "IL",
  italy: "IT", italia: "IT", jamaica: "JM", japan: "JP", jordan: "JO",
  kazakhstan: "KZ", kenya: "KE", kuwait: "KW", kyrgyzstan: "KG", laos: "LA",
  latvia: "LV", lebanon: "LB", liberia: "LR", libya: "LY", lithuania: "LT",
  luxembourg: "LU", madagascar: "MG", malawi: "MW", malaysia: "MY", mali: "ML",
  malta: "MT", mauritania: "MR", mauritius: "MU", mexico: "MX", méxico: "MX",
  moldova: "MD", mongolia: "MN", montenegro: "ME", morocco: "MA",
  mozambique: "MZ", myanmar: "MM", burma: "MM", namibia: "NA", nepal: "NP",
  netherlands: "NL", holland: "NL", "new zealand": "NZ", nicaragua: "NI",
  niger: "NE", nigeria: "NG", "north macedonia": "MK", norway: "NO", oman: "OM",
  pakistan: "PK", panama: "PA", "papua new guinea": "PG", paraguay: "PY",
  peru: "PE", perú: "PE", philippines: "PH", poland: "PL", portugal: "PT",
  qatar: "QA", romania: "RO", russia: "RU", "russian federation": "RU",
  rwanda: "RW", "saudi arabia": "SA", senegal: "SN", serbia: "RS",
  singapore: "SG", slovakia: "SK", slovenia: "SI", somalia: "SO",
  "south africa": "ZA", "south korea": "KR", korea: "KR",
  "republic of korea": "KR", spain: "ES", españa: "ES", "sri lanka": "LK",
  sudan: "SD", sweden: "SE", switzerland: "CH", syria: "SY", taiwan: "TW",
  tanzania: "TZ", thailand: "TH", togo: "TG", "trinidad and tobago": "TT",
  tunisia: "TN", turkey: "TR", türkiye: "TR", turkmenistan: "TM", uganda: "UG",
  ukraine: "UA", "united arab emirates": "AE", uae: "AE",
  "united kingdom": "GB", uk: "GB", "great britain": "GB", britain: "GB",
  england: "GB", scotland: "GB", "united states": "US",
  "united states of america": "US", usa: "US", us: "US", america: "US",
  uruguay: "UY", uzbekistan: "UZ", venezuela: "VE", vietnam: "VN",
  "viet nam": "VN", yemen: "YE", zambia: "ZM", zimbabwe: "ZW",
};

/**
 * The ISO 3166-1 alpha-2 code for a place, when the text names a country.
 * "Santos, Brazil" resolves; "the Black Sea" does not, and returns null so
 * the caller shows the words the member wrote.
 */
export function isoCode(place: string | null | undefined): string | null {
  const raw = (place ?? "").trim().toLowerCase();
  if (!raw) return null;
  const direct = ISO2[raw];
  if (direct) return direct;
  // "Santos, Brazil" or "Port of Rotterdam, Netherlands": try each part,
  // last first, since the country is usually written last.
  const parts = raw
    .split(/[,/|]|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .reverse();
  for (const part of parts) {
    const hit = ISO2[part] ?? ISO2[part.replace(/^the\s+/, "")];
    if (hit) return hit;
  }
  return null;
}

/** What a corridor end shows: the code where there is one, else the words. */
export function corridorEnd(place: string | null | undefined): {
  code: string | null;
  text: string | null;
} {
  const text = (place ?? "").trim() || null;
  return { code: isoCode(text), text };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** marketplace message key for a profile's verification level. */
export function verificationKey(level: number | null | undefined): string {
  const n = Number(level ?? 0);
  if (n >= 4) return "trust.level4";
  if (n === 3) return "trust.level3";
  if (n === 2) return "trust.level2";
  if (n === 1) return "trust.level1";
  return "trust.none";
}
