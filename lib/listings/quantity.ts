// The commercial quantity on a listing.
//
// A traded quantity is not one whole number. "500-1,000 MT", "approximately
// 2,500 MT per month", "minimum 20 pallets" and "on request" are all real
// commercial positions, and a model that can only hold a single integer forces
// every one of them into a number that was never stated. Worse, it makes the
// difference between "exactly 1,250 kg" and "around 1,250 kg" unrepresentable,
// which is the difference between a firm offer and an indication.
//
// So a quantity carries a MODE alongside its numbers. The mode is the member's
// commercial stance; the numbers are what that stance is about. Some modes
// carry no number at all, and that is a stated answer rather than a gap.
//
// Pure and import-free, so it runs under the standalone tsx test runner and can
// be shared by the composer, the submit route, the eligibility validator and the
// email templates without dragging a server dependency into any of them.

/**
 * The member's commercial stance on quantity.
 *
 *   exact       — this quantity, as stated.
 *   approximate — around this quantity; the number is indicative.
 *   minimum     — this much or more (a floor: minimum order, minimum lot).
 *   maximum     — this much or less (a ceiling: available capacity).
 *   range       — between two stated quantities.
 *   negotiable  — open to agreement; an indicative number may be given.
 *   on_request  — deliberately not stated here; ask.
 */
export type QuantityMode =
  | "exact"
  | "approximate"
  | "minimum"
  | "maximum"
  | "range"
  | "negotiable"
  | "on_request";

export const QUANTITY_MODES: readonly QuantityMode[] = [
  "exact", "approximate", "minimum", "maximum", "range", "negotiable", "on_request",
];

export function isQuantityMode(v: unknown): v is QuantityMode {
  return typeof v === "string" && (QUANTITY_MODES as readonly string[]).includes(v);
}

/** How often the quantity recurs. `one_off` is a single shipment or lot. */
export type QuantityFrequency =
  | "one_off" | "weekly" | "monthly" | "quarterly" | "annual";

export const QUANTITY_FREQUENCIES: readonly QuantityFrequency[] = [
  "one_off", "weekly", "monthly", "quarterly", "annual",
];

export function isQuantityFrequency(v: unknown): v is QuantityFrequency {
  return typeof v === "string" && (QUANTITY_FREQUENCIES as readonly string[]).includes(v);
}

/**
 * Read the stored `frequency` column, which is free text.
 *
 * That column predates this model and holds the English labels the composer
 * wrote — "One-off", "Monthly", "Per quarter". It is NOT migrated to the enum:
 * it is a member-visible string on live listings, and rewriting it would change
 * what those listings say in order to tidy a type. So it is normalised on read
 * and left alone on write, and an unrecognised label reads as no frequency
 * rather than as a guess.
 */
export function normaliseFrequency(v: unknown): QuantityFrequency | null {
  if (isQuantityFrequency(v)) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("one") || s.includes("single") || s.includes("spot")) return "one_off";
  if (s.includes("week")) return "weekly";
  if (s.includes("month")) return "monthly";
  if (s.includes("quarter")) return "quarterly";
  if (s.includes("annual") || s.includes("year")) return "annual";
  return null;
}

/**
 * The stored quantity.
 *
 * `value` is the single number for the modes that have one. `minValue` and
 * `maxValue` are the two ends of a range. A mode never reads a field it does
 * not own, so a leftover number from an earlier mode is inert rather than
 * silently meaningful.
 */
export type ListingQuantity = {
  mode: QuantityMode;
  value?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string | null;
  frequency?: QuantityFrequency | null;
};

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Read a member-entered number without corrupting it.
 *
 * Two separator conventions collide in international trade: "1,250.5" (en) and
 * "1.250,5" (much of Europe). Guessing between them is how 1.25 MT becomes
 * 1,250 MT, so the rule is structural rather than locale-guessing:
 *
 *   - the LAST separator that is followed by 1-2 digits and is the only one of
 *     its kind is a decimal point;
 *   - a separator followed by exactly 3 digits, or repeated, is a thousands
 *     grouping and is removed;
 *   - anything genuinely ambiguous ("1,250") is read as a thousands grouping,
 *     which is the overwhelmingly more common intent for a trade quantity.
 *
 * Returns null for anything that is not a finite number. It never rounds and
 * never returns a value the member did not type.
 */
export function parseQuantityInput(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;

  const s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  // Reject anything carrying characters a number cannot have, rather than
  // stripping them: "12abc" is a typo, not the quantity 12.
  if (!/^[+-]?[\d.,]+$/.test(s)) return null;

  const sign = s.startsWith("-") ? -1 : 1;
  const body = s.replace(/^[+-]/, "");
  if (!body) return null;

  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");
  const lastSep = Math.max(lastComma, lastDot);

  let normalised: string;
  if (lastSep < 0) {
    normalised = body;
  } else {
    const sepChar = body[lastSep];
    const tail = body.slice(lastSep + 1);
    const occurrences = body.split(sepChar).length - 1;
    const otherSepPresent = sepChar === "," ? lastDot >= 0 : lastComma >= 0;

    // A decimal point: appears once, is the rightmost separator, and is
    // followed by 1-2 digits. Three trailing digits with no other separator
    // stays a thousands grouping ("1,250" is 1250, not 1.25).
    const isDecimal =
      occurrences === 1 && tail.length >= 1 && tail.length <= 2 && /^\d+$/.test(tail);

    if (isDecimal && !(otherSepPresent && lastSep < Math.max(lastComma, lastDot))) {
      normalised = body.slice(0, lastSep).replace(/[.,]/g, "") + "." + tail;
    } else {
      normalised = body.replace(/[.,]/g, "");
    }
  }

  if (!/^\d*\.?\d*$/.test(normalised) || normalised === "" || normalised === ".") return null;
  const n = Number(normalised) * sign;
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type QuantityIssue =
  | "mode_invalid"
  | "value_required"
  | "value_not_positive"
  | "range_bounds_required"
  | "range_min_not_below_max"
  | "unit_required"
  | "frequency_invalid";

/** Which modes require a single positive `value`. */
const NEEDS_VALUE = new Set<QuantityMode>(["exact", "approximate", "minimum", "maximum"]);
/** Which modes require a unit, once they carry a number at all. */
const NEEDS_UNIT = new Set<QuantityMode>([
  "exact", "approximate", "minimum", "maximum", "range",
]);

/**
 * Validate a quantity against its own mode.
 *
 * Returns every issue rather than the first, so a composer can show the whole
 * gap at once. An empty array means the quantity is coherent — which includes
 * `on_request`, a complete answer that carries no number.
 */
export function validateQuantity(q: ListingQuantity | null | undefined): QuantityIssue[] {
  const issues: QuantityIssue[] = [];
  if (!q || !isQuantityMode(q.mode)) return ["mode_invalid"];

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  if (NEEDS_VALUE.has(q.mode)) {
    const v = num(q.value);
    if (v === null) issues.push("value_required");
    else if (v <= 0) issues.push("value_not_positive");
  }

  if (q.mode === "range") {
    const lo = num(q.minValue);
    const hi = num(q.maxValue);
    if (lo === null || hi === null) issues.push("range_bounds_required");
    else {
      if (lo <= 0 || hi <= 0) issues.push("value_not_positive");
      // Equal bounds are not a range; that is an exact quantity wearing the
      // wrong mode, and letting it through prints "500 to 500 MT".
      if (lo >= hi) issues.push("range_min_not_below_max");
    }
  }

  // `negotiable` may carry an indicative number. If it does, that number still
  // has to be a real positive quantity.
  if (q.mode === "negotiable" && q.value !== null && q.value !== undefined) {
    const v = num(q.value);
    if (v === null || v <= 0) issues.push("value_not_positive");
  }

  // A number without a unit is not a quantity. `on_request` and a bare
  // `negotiable` carry no number, so they need no unit.
  const carriesNumber =
    NEEDS_VALUE.has(q.mode) || q.mode === "range" ||
    (q.mode === "negotiable" && num(q.value) !== null);
  if (carriesNumber && NEEDS_UNIT.has(q.mode) && !String(q.unit ?? "").trim()) {
    issues.push("unit_required");
  }
  if (carriesNumber && q.mode === "negotiable" && !String(q.unit ?? "").trim()) {
    issues.push("unit_required");
  }

  if (q.frequency !== null && q.frequency !== undefined && !isQuantityFrequency(q.frequency)) {
    issues.push("frequency_invalid");
  }

  return issues;
}

/** Whether a quantity is coherent enough to publish. */
export function isQuantityPublishable(q: ListingQuantity | null | undefined): boolean {
  return validateQuantity(q).length === 0;
}

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

/**
 * Format a number for display without inventing precision.
 *
 * A whole number prints whole. A decimal keeps exactly the digits it has, up to
 * three, because a trade quantity written as 1.25 MT must not render as 1.250
 * or 1.3.
 */
export function formatQuantityNumber(n: number, locale = "en"): string {
  const decimals = (() => {
    const s = String(n);
    const dot = s.indexOf(".");
    return dot < 0 ? 0 : Math.min(3, s.length - dot - 1);
  })();
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const FREQUENCY_LABEL: Record<QuantityFrequency, string> = {
  one_off: "",
  weekly: "per week",
  monthly: "per month",
  quarterly: "per quarter",
  annual: "per year",
};

/**
 * The quantity in words, exactly as stated and never more precisely.
 *
 * The mode is carried into the sentence rather than dropped: "approximately
 * 2,500 MT per month" and "2,500 MT per month" are different commercial
 * claims, and printing the second for the first overstates the member.
 */
export function formatQuantity(
  q: ListingQuantity | null | undefined,
  locale = "en",
): string | null {
  if (!q || !isQuantityMode(q.mode)) return null;
  const unit = String(q.unit ?? "").trim();
  const freq = q.frequency && q.frequency !== "one_off"
    ? ` ${FREQUENCY_LABEL[q.frequency]}`
    : "";
  const withUnit = (n: number) =>
    `${formatQuantityNumber(n, locale)}${unit ? ` ${unit}` : ""}`;

  switch (q.mode) {
    case "on_request":
      return "Quantity on request";
    case "range": {
      if (typeof q.minValue !== "number" || typeof q.maxValue !== "number") return null;
      return `${formatQuantityNumber(q.minValue, locale)}–${withUnit(q.maxValue)}${freq}`;
    }
    case "negotiable":
      return typeof q.value === "number"
        ? `${withUnit(q.value)}${freq}, negotiable`
        : "Quantity negotiable";
    default: {
      if (typeof q.value !== "number") return null;
      const prefix =
        q.mode === "approximate" ? "Approximately " :
        q.mode === "minimum" ? "Minimum " :
        q.mode === "maximum" ? "Maximum " : "";
      return `${prefix}${withUnit(q.value)}${freq}`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Storage bridge                                                      */
/* ------------------------------------------------------------------ */

/**
 * Read a stored listing row back into a quantity.
 *
 * The legacy `quantity` column holds a single number and predates the mode, so
 * a row with a number and no mode is read as `exact`: that is what it always
 * meant, and inventing `approximate` for it would soften a claim the member
 * made firmly. A row with neither carries no quantity at all.
 */
export function quantityFromRow(row: {
  quantity_mode?: string | null;
  quantity?: number | string | null;
  quantity_min?: number | string | null;
  quantity_max?: number | string | null;
  unit?: string | null;
  frequency?: string | null;
}): ListingQuantity | null {
  // Postgres numeric arrives as a string over the wire; it is a stored value,
  // not member input, so it is read directly rather than through the
  // separator-guessing parser.
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const mode = isQuantityMode(row.quantity_mode) ? row.quantity_mode : null;
  const value = num(row.quantity);
  const minValue = num(row.quantity_min);
  const maxValue = num(row.quantity_max);

  if (!mode) {
    if (value === null) return null;
    return {
      mode: "exact",
      value,
      unit: row.unit ?? null,
      frequency: normaliseFrequency(row.frequency),
    };
  }

  return {
    mode,
    value,
    minValue,
    maxValue,
    unit: row.unit ?? null,
    frequency: normaliseFrequency(row.frequency),
  };
}

/**
 * The columns a quantity writes. Fields its mode does not own are nulled.
 *
 * `frequency` is deliberately absent. It is a free-text, member-visible column
 * that predates this model, and the writer keeps it as the member wrote it —
 * see `normaliseFrequency`.
 */
export function quantityToColumns(q: ListingQuantity | null | undefined): {
  quantity_mode: QuantityMode | null;
  quantity: number | null;
  quantity_min: number | null;
  quantity_max: number | null;
  unit: string | null;
} {
  if (!q || !isQuantityMode(q.mode)) {
    return {
      quantity_mode: null, quantity: null, quantity_min: null,
      quantity_max: null, unit: null,
    };
  }
  const isRange = q.mode === "range";
  const holdsValue = NEEDS_VALUE.has(q.mode) || q.mode === "negotiable";
  return {
    quantity_mode: q.mode,
    quantity: holdsValue && typeof q.value === "number" ? q.value : null,
    quantity_min: isRange && typeof q.minValue === "number" ? q.minValue : null,
    quantity_max: isRange && typeof q.maxValue === "number" ? q.maxValue : null,
    unit: String(q.unit ?? "").trim() || null,
  };
}
