/**
 * Draft the message the member receives, from what the sources actually said.
 *
 * WHY THIS IS NOT A MODEL CALL.
 *
 * The entire argument of the review screen is that the desk's words can be
 * checked against the stored evidence sitting next to them. A model asked to
 * "write a nice rejection" will produce a fluent sentence about a register it
 * never read, and that sentence goes out over Ponte's name to a member who has
 * no way to tell. So the drafts are built by interpolation: every sentence
 * below is either derived from a stored field or is not written at all. A
 * template cannot invent a registration number.
 *
 * The drafts are a starting point, never a decision. They are rendered as the
 * default value of an editable box, the reviewer reads them against the
 * sources, and whatever they leave in the box is what the member reads. Silence
 * is a valid edit: an empty box still sends the generic decision email.
 *
 * WHAT THE MEMBER ALREADY SEES. The decision email carries its own heading and
 * a paragraph explaining what the decision means, and the note is quoted under
 * it. So these drafts carry the particulars, not the pleasantries: dates, names,
 * numbers, and the one thing the member has to do next.
 */

// ---------------------------------------------------------------------------
// The shape of a stored case
// ---------------------------------------------------------------------------
// Loose on purpose. This reads a row that came back out of jsonb columns, where
// a field can be missing because the check never ran, because the source was
// down, or because the row predates the field. Every read below tolerates all
// three and falls silent rather than guessing.

type Candidate = {
  companyName?: string;
  regNumber?: string;
  status?: string;
  incorporationDate?: string;
  address?: string;
};

export type RegistryJson = {
  source?: string;
  available?: boolean;
  reason?: string;
  companyName?: string;
  regNumber?: string;
  status?: string;
  incorporationDate?: string;
  address?: string;
  candidates?: Candidate[];
  candidateTotal?: number;
  checkedAt?: string;
};

export type ViesJson = {
  available?: boolean;
  reason?: string;
  valid?: boolean;
  name?: string;
  vatNumber?: string;
  checkedAt?: string;
};

export type GleifJson = {
  available?: boolean;
  reason?: string;
  lei?: string;
  legalName?: string;
  status?: string;
  registrationStatus?: string;
  checkedAt?: string;
};

export type SanctionsJson = {
  clean?: boolean;
  strongCount?: number;
  screened?: string[];
  results?: { candidates?: { primary_name?: string; source_list?: string; strong?: boolean }[] }[];
};

export type VerificationCase = {
  subject_name: string;
  subject_country?: string | null;
  subject_reg_number?: string | null;
  subject_vat?: string | null;
  subject_lei?: string | null;
  level_requested?: number | null;
  registry?: RegistryJson | null;
  vies?: ViesJson | null;
  gleif?: GleifJson | null;
  sanctions_hits?: SanctionsJson | null;
  verdict_reason?: string | null;
};

export type DecisionDrafts = {
  approve: string;
  reject: string;
  documents: string;
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Human names for the machine identifiers stored in `source`. */
const SOURCE_NAMES: Record<string, string> = {
  companies_house: "Companies House",
  opencorporates: "OpenCorporates",
  VIES: "the EU VIES service",
  GLEIF: "GLEIF",
};

function sourceName(source?: string): string {
  if (!source) return "the company register";
  return SOURCE_NAMES[source] ?? source.replace(/_/g, " ");
}

/** "2026-07-21T14:57:46.562Z" becomes "21 July 2026". An unusable value is dropped. */
function day(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "on 21 July 2026", or nothing at all rather than "on undefined". */
function on(iso?: string | null): string {
  const d = day(iso);
  return d ? ` on ${d}` : "";
}

/** Join the lines that survived. Blank lines separate paragraphs in the email. */
function paragraphs(lines: (string | null)[]): string {
  return lines.filter((l): l is string => Boolean(l && l.trim())).join("\n\n");
}

/** A sentence ends in a full stop, whatever the stored fragment did. */
function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// ---------------------------------------------------------------------------
// The facts, stated once
// ---------------------------------------------------------------------------

/** "not_found" is a machine word. Nobody should receive it in an email. */
function statusWords(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

/** A register standing that clears a check, as opposed to one that merely exists. */
function isGoodStanding(status?: string): boolean {
  if (!status) return true; // The source returned a record and offered no standing.
  return /active|registered/i.test(status);
}

/**
 * What the register returned, in one sentence, or null when it returned
 * nothing that supports a confirmation. Shared by all three drafts so an
 * approval and a rejection cannot end up describing the same lookup
 * differently.
 *
 * A record that came back dissolved, struck off or not found is NOT a
 * confirmation, whatever `available` says. The first version of this function
 * checked `available` alone and drafted "Confirmed against Companies House:
 * Screedworkd, status not found", which is a sentence that contradicts itself
 * inside its own clause and would have gone out over Ponte's name.
 */
function registryLine(c: VerificationCase): string | null {
  const r = c.registry ?? {};
  if (r.available !== true || !isGoodStanding(r.status)) return null;

  const bits: string[] = [];
  if (r.companyName) bits.push(r.companyName);
  if (r.regNumber) bits.push(`registration ${r.regNumber}`);
  if (r.status) bits.push(`status ${statusWords(r.status)}`);
  const inc = day(r.incorporationDate);
  if (inc) bits.push(`incorporated ${inc}`);
  if (bits.length === 0) return null;

  return sentence(
    `Confirmed against ${sourceName(r.source)}${on(r.checkedAt)}: ${bits.join(", ")}`,
  );
}

/** Why the register could not settle it. Null when it did settle it. */
function registryProblem(c: VerificationCase): string | null {
  const r = c.registry ?? {};
  if (r.available === true) return null;

  const many = (r.candidates?.length ?? 0) > 1;
  const total = r.candidateTotal ?? r.candidates?.length ?? 0;

  if (many) {
    return sentence(
      `${sourceName(r.source)} holds ${total} companies under the name "${c.subject_name}"` +
        `${on(r.checkedAt)}, and no registration number was supplied, so we cannot tell ` +
        `which one is yours`,
    );
  }
  // The stored reason usually names the source itself, so naming it again here
  // produces "Companies House did not confirm the subject: 20 companies match
  // that name in Companies House". Say it once.
  if (r.reason) {
    return sentence(`The subject could not be confirmed${on(r.checkedAt)}: ${r.reason}`);
  }
  return sentence(`${sourceName(r.source)} did not confirm the subject${on(r.checkedAt)}`);
}

/** The register answered, but the answer is not one that clears a check. */
function registryStatusProblem(c: VerificationCase): string | null {
  const r = c.registry ?? {};
  if (r.available !== true || isGoodStanding(r.status)) return null;
  return sentence(
    `${sourceName(r.source)} shows "${c.subject_name}" as ${statusWords(r.status!)}` +
      `${on(r.checkedAt)}, which is not a standing we can verify against`,
  );
}

/** The five lists, named, because "we screened you" is not checkable and this is. */
const LIST_NAMES =
  "the OFAC SDN and consolidated lists, the EU consolidated list, the UN list " +
  "and the UK sanctions list";

/** Human names for the machine identifiers stored on a sanctions candidate. */
const LIST_LABELS: Record<string, string> = {
  OFAC_SDN: "the OFAC SDN list",
  OFAC_CONS: "the OFAC consolidated list",
  EU_CFSL: "the EU consolidated list",
  UN: "the UN list",
  UK_OFSI: "the UK sanctions list",
};

function sanctionsClean(c: VerificationCase): boolean {
  const s = c.sanctions_hits ?? {};
  return s.clean === true && !s.strongCount;
}

/** How many names went through screening, described rather than counted at. */
function screenedScope(c: VerificationCase): string {
  const names = c.sanctions_hits?.screened?.length ?? 0;
  if (names > 1) return `the company and its officers, ${names} names in all,`;
  if (names === 1) return "the company name";
  return "the subject";
}

/** Which lists produced a candidate. Empty when screening was clean. */
function candidateLists(c: VerificationCase): string[] {
  const seen = new Set<string>();
  for (const result of c.sanctions_hits?.results ?? []) {
    for (const cand of result.candidates ?? []) {
      if (cand.source_list) seen.add(LIST_LABELS[cand.source_list] ?? cand.source_list);
    }
  }
  return Array.from(seen);
}

/**
 * What screening did, said plainly, including when it did nothing.
 *
 * `resolved` is the difference between a rejection and an approval on the same
 * evidence. Candidates are proposed by name similarity, so a company can be
 * flagged against a list it has nothing to do with. Approving such a case means
 * a person looked at the candidates and ruled them out, and the member is
 * entitled to be told that in those words rather than left to wonder why they
 * were screened at all.
 */
function sanctionsLine(c: VerificationCase, resolved = false): string | null {
  const s = c.sanctions_hits ?? {};
  const names = s.screened?.length ?? 0;
  if (names === 0 && s.clean === undefined) return null;

  if (sanctionsClean(c)) {
    return sentence(
      `Sanctions screening covered ${screenedScope(c)} against ${LIST_NAMES}, and returned ` +
        `no candidates`,
    );
  }

  // Name the lists. A member told only "we found something" cannot do anything
  // with that; a member told which list can.
  const lists = candidateLists(c);
  const where = lists.length ? ` on ${lists.join(" and ")}` : "";
  const strong = s.strongCount ?? 0;
  const found =
    `Sanctions screening of ${screenedScope(c)} returned ` +
    `${strong > 0 ? `${strong} strong ` : ""}candidate${strong === 1 ? "" : "s"}${where}`;

  return resolved
    ? sentence(
        `${found}. Candidates are proposed by name similarity, and the desk reviewed each of ` +
          `them against this case and ruled them out`,
      )
    : sentence(`${found}, and that has to be settled before the check can pass`);
}

/** VAT, only where there is something to say. */
function vatLine(c: VerificationCase): string | null {
  const v = c.vies ?? {};
  if (v.available === true && v.valid === true) {
    return sentence(
      `VAT number ${v.vatNumber ?? c.subject_vat ?? ""} was validated against VIES${on(v.checkedAt)}${
        v.name ? `, registered to ${v.name}` : ""
      }`.replace(/\s+/g, " "),
    );
  }
  if (v.available === true && v.valid === false) {
    return sentence(`VIES reports the VAT number as not valid${on(v.checkedAt)}`);
  }
  return null;
}

/** LEI, only where there is something to say. */
function leiLine(c: VerificationCase): string | null {
  const g = c.gleif ?? {};
  if (g.available !== true) return null;
  const bits = [g.legalName, g.status ? `status ${g.status.toLowerCase()}` : null].filter(Boolean);
  return sentence(
    `LEI ${g.lei ?? c.subject_lei ?? ""} was resolved against GLEIF${on(g.checkedAt)}${
      bits.length ? `: ${bits.join(", ")}` : ""
    }`.replace(/\s+/g, " "),
  );
}

/**
 * What was not checked, and why. This is the paragraph that keeps an approval
 * honest: a member who supplied no VAT number should not be able to read the
 * email and believe their VAT was verified.
 */
function notCheckedLine(c: VerificationCase): string | null {
  const missing: string[] = [];
  if (c.vies?.available !== true && !c.subject_vat) missing.push("VAT");
  if (c.gleif?.available !== true && !c.subject_lei) missing.push("LEI");
  if (missing.length === 0) return null;
  return sentence(
    `${missing.join(" and ")} ${missing.length > 1 ? "were" : "was"} not checked, because ` +
      `no ${missing.length > 1 ? "numbers were" : "number was"} supplied`,
  );
}

/**
 * The single thing the member has to hand over for the case to move.
 *
 * One ask, never a list. A member sent three requests answers the easiest one
 * and the case comes back no further forward, so this returns the obstacle that
 * is actually blocking the check and nothing else.
 */
function whatIsMissing(c: VerificationCase): string {
  const r = c.registry ?? {};
  const many = (r.candidates?.length ?? 0) > 1;

  if (many || (r.available !== true && !c.subject_reg_number)) {
    return `the company registration number for "${c.subject_name}"`;
  }
  if (r.available !== true) {
    return (
      `a certificate of incorporation, or any official document showing the registered ` +
      `name and number of "${c.subject_name}"`
    );
  }
  if (!isGoodStanding(r.status)) {
    return (
      `the registration details of the entity that is trading now, since the register shows ` +
      `"${c.subject_name}" as ${statusWords(r.status!)}`
    );
  }
  if (!sanctionsClean(c)) {
    return (
      "the full legal names and dates of birth of the directors, so the screening candidates " +
      "can be ruled in or out"
    );
  }
  // Nothing in the stored evidence points at a specific gap, so do not invent
  // one. The reviewer knows what they want and this box is editable.
  return `supporting documents for "${c.subject_name}"`;
}

// ---------------------------------------------------------------------------
// The three drafts
// ---------------------------------------------------------------------------

export function draftVerificationNotes(c: VerificationCase): DecisionDrafts {
  const level = c.level_requested ?? 2;

  const confirmed = registryLine(c);
  const problem = registryProblem(c);
  const statusProblem = registryStatusProblem(c);
  const clean = sanctionsClean(c);
  const vat = vatLine(c);
  const lei = leiLine(c);
  const notChecked = notCheckedLine(c);

  /*
   * Approve. Says what was confirmed and, just as important, what was not.
   *
   * When the register never confirmed the subject, the draft does not pretend
   * it did: it says the desk settled it by hand, which is the only thing that
   * can be true of an approval on such a case. Screening is written in its
   * resolved form for the same reason, since approving over a candidate means
   * a person ruled that candidate out.
   */
  const approve = paragraphs([
    confirmed ??
      sentence(
        `The register could not confirm this automatically, so the desk read the sources ` +
          `and settled it by hand`,
      ),
    sanctionsLine(c, true),
    vat,
    lei,
    notChecked,
    sentence(`Level ${level} verification is now shown on your account`),
  ]);

  /*
   * Reject. The obstacle leads, and it is whichever obstacle actually blocked
   * the check: a sanctions candidate outranks a registry problem, because a
   * member who reads "we could not identify your company" and later discovers
   * the real reason was a screening hit has been misled.
   *
   * Then the sting comes out where the evidence allows it. Most rejections here
   * are about an identity that could not be pinned down rather than anything
   * wrong with the company, and a member who cannot tell the difference will
   * assume the worst.
   */
  const reject = paragraphs([
    !clean
      ? sanctionsLine(c)
      : (problem ??
        statusProblem ??
        sentence("The sources did not confirm the record as submitted")),
    !clean ? (problem ?? statusProblem) : null,
    clean
      ? sentence(
          "Sanctions screening returned no candidates, so nothing in this decision points to a " +
            "problem with the company itself",
        )
      : null,
    sentence(
      `You can open a new check once you can supply ${whatIsMissing(c)}, and we will look again`,
    ),
  ]);

  /*
   * Request documents. One ask, stated first, because a member who has to hunt
   * for the request in the third paragraph will reply with the wrong thing.
   */
  const documents = paragraphs([
    sentence(`To finish this check we need ${whatIsMissing(c)}`),
    !clean ? sanctionsLine(c) : (problem ?? statusProblem),
    sentence("Reply to this email with it and the case stays open in the queue in the meantime"),
  ]);

  return { approve, reject, documents };
}
