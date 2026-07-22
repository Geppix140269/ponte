/**
 * Draft the message a member receives about their listing.
 *
 * Same principle as lib/verification/decision-notes: built by interpolation
 * from what is actually stored on the listing, never generated fresh. See that
 * file for the full argument. The short version is that a fluent sentence about
 * a document nobody uploaded is worse than no sentence at all, and a template
 * cannot invent an incoterm.
 *
 * WHAT THIS DOES USE THE MODEL FOR. The AI vetting co-pilot has already read
 * the listing and written `missing_info`, `red_flags` and `compliance_notes`.
 * Those are the model's findings, they are on the screen next to the draft, and
 * they are quoted here rather than re-derived. Quoting a finding the reviewer
 * can see is not the same as inventing one they cannot.
 */

export type ListingReview = {
  score?: number;
  verdict?: "looks_solid" | "needs_info" | "caution";
  summary?: string;
  missing_info?: string[];
  red_flags?: string[];
  compliance_notes?: string[];
};

export type ListingCase = {
  ref: string;
  type?: string | null;
  product: string;
  origin?: string | null;
  destination?: string | null;
  volume?: string | null;
  incoterm?: string | null;
  hs_code?: string | null;
  indicative_value_usd?: number | null;
  ai_review?: ListingReview | null;
};

export type ListingDrafts = {
  approve: string;
  reject: string;
};

function paragraphs(lines: (string | null)[]): string {
  return lines.filter((l): l is string => Boolean(l && l.trim())).join("\n\n");
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** "an offer" / "a requirement" / "a service", falling back to the neutral word. */
function kind(type?: string | null): string {
  switch ((type ?? "").toLowerCase()) {
    case "offer":
      return "offer";
    case "requirement":
      return "requirement";
    case "service":
      return "service";
    default:
      return "listing";
  }
}

/** The route, where enough of it is known to be worth stating back. */
function routeLine(l: ListingCase): string | null {
  const bits: string[] = [];
  if (l.origin && l.destination) bits.push(`${l.origin} to ${l.destination}`);
  else if (l.origin) bits.push(`out of ${l.origin}`);
  else if (l.destination) bits.push(`into ${l.destination}`);
  if (l.volume) bits.push(l.volume);
  if (l.incoterm) bits.push(l.incoterm);
  if (bits.length === 0) return null;
  return sentence(`It is listed as ${bits.join(", ")}`);
}

/**
 * A list of gaps, as one readable sentence rather than a bulleted dump. The
 * member has to act on this, and a wall of bullets is read as an obstacle.
 */
function asList(items: string[]): string {
  const clean = items.map((i) => i.trim().replace(/\.$/, "")).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join("; ")}; and ${clean[clean.length - 1]}`;
}

export function draftListingNotes(l: ListingCase): ListingDrafts {
  const r = l.ai_review ?? {};
  const missing = (r.missing_info ?? []).filter(Boolean);
  const flags = (r.red_flags ?? []).filter(Boolean);
  const compliance = (r.compliance_notes ?? []).filter(Boolean);
  const noun = kind(l.type);

  /*
   * Approve. Says what is live and, where the vetting left open questions,
   * says those too. A listing can be good enough to circulate and still have
   * gaps, and a buyer who asks about one the desk already knew about makes the
   * member look unprepared. Better they hear it from us first.
   */
  const approve = paragraphs([
    sentence(`Your ${noun} ${l.ref}, ${l.product}, has been vetted and is now live on the board`),
    routeLine(l),
    missing.length
      ? sentence(
          `${missing.length === 1 ? "One thing is" : "Some things are"} worth adding, because ` +
            `counterparties will ask: ${asList(missing)}`,
        )
      : null,
    sentence(
      "Your identity stays off the board. Interested counterparties reach the desk, and " +
        "nothing is shared with either side until both agree to be introduced",
    ),
  ]);

  /*
   * Reject. Leads with the reason, and the reason is the strongest thing the
   * vetting actually found: a compliance problem outranks a red flag, which
   * outranks a missing field. Where nothing specific was found, the draft says
   * so plainly rather than manufacturing a justification.
   */
  const reasonLine = compliance.length
    ? sentence(`We cannot circulate this as submitted: ${asList(compliance)}`)
    : flags.length
      ? sentence(`We cannot circulate this as submitted: ${asList(flags)}`)
      : missing.length
        ? sentence(
            `We cannot circulate this as submitted, because too much of it is still open: ` +
              `${asList(missing)}`,
          )
        : sentence(
            "We cannot circulate this as submitted. The desk was not able to establish enough " +
              "about it to put it in front of a counterparty",
          );

  const reject = paragraphs([
    sentence(`Your ${noun} ${l.ref}, ${l.product}, has not passed vetting`),
    reasonLine,
    sentence(
      "This is not a permanent decision. Post it again with those points covered and it goes " +
        "back into the queue, at no cost",
    ),
  ]);

  return { approve, reject };
}
