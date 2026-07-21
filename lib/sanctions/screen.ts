// Sanctions screening.
//
// Two stages. Postgres proposes, using trigram similarity over the normalized
// names and aliases loaded by refresh.ts. The model then triages what Postgres
// proposed, in plain language, so a reviewer reads an argument rather than a
// number.
//
// The rule that governs everything below: the model can add doubt, it can
// never remove it. A subject is clean only when nothing was proposed at all.
// A strong name match stays a strong name match whatever the model says about
// it, and goes to a human. Screening runs against published sanctions lists
// only: no customs data, no third party trade data.

import { callAiJson, MODEL_FAST } from "@/lib/ai";
// From lib/supabase/admin, not lib/supabase/server: the scheduled re-screen
// loads this file outside Next. See the note in lib/supabase/admin.ts.
import { createAdminClient } from "@/lib/supabase/admin";
import { nameVariants, normalizeName } from "./normalize";

/** At or above this, a row is a candidate and goes to triage. */
export const CANDIDATE_THRESHOLD = 0.4;
/** At or above this, a row is strong and no triage verdict can clear it. */
export const STRONG_THRESHOLD = 0.85;

/** Spelling variants queried per subject. Each one is a database round trip. */
const MAX_VARIANTS = 3;
const DEFAULT_LIMIT = 50;
/** Candidates per model call. See the note on triageCandidates. */
const TRIAGE_BATCH = 8;
/**
 * Ceiling on how many candidates are sent to the model at all. A subject whose
 * name is a common word can pull back dozens of weak candidates and there is
 * no point spending tokens on the tail: everything above the threshold already
 * blocks a clean result, triaged or not. Anything past the ceiling is returned
 * as uncertain, which is what it is.
 */
const MAX_TRIAGED = 24;

export type ScreenSubject = {
  name: string;
  country?: string;
  entityType?: string;
};

export type SanctionsCandidate = {
  id: string;
  source_list: string;
  entry_id: string;
  primary_name: string;
  normalized_name: string;
  aliases: string[];
  entity_type: string | null;
  country: string | null;
  programs: string[];
  listed_date: string | null;
  score: number;
  matched_on: string;
  /** score >= STRONG_THRESHOLD. Set here, never by the model. */
  strong: boolean;
  /** Which spelling of the subject brought this row back. */
  matched_variant: string;
};

export type TriageVerdict = {
  candidate_id: string;
  likely_match: boolean | "uncertain";
  reasoning: string;
  sources: string[];
};

export type TriagedCandidate = SanctionsCandidate & {
  triage: TriageVerdict | null;
};

export type ScreenResult = {
  clean: boolean;
  candidates: TriagedCandidate[];
  strongCount: number;
};

export type ScreenOptions = {
  /** Raised above CANDIDATE_THRESHOLD only. It can never be lowered. */
  minScore?: number;
  limit?: number;
  /** Set false to skip the model and return the raw candidates. */
  triage?: boolean;
  /** Who the triage calls are billed to in ai_calls. Null for system jobs. */
  userId?: string | null;
  /** What the triage calls are costed against, normally a verification id. */
  ref?: string | null;
  /**
   * Consider only entries imported at or after this moment, which is how the
   * daily re-screen scopes itself to the lists the latest refresh touched. A
   * refresh restamps every row of a source it loads successfully, so this
   * covers the whole of every list that was rebuilt, not only the rows whose
   * content changed. That is the safe direction: it can re-flag something
   * unchanged, it cannot miss a new designation.
   */
  since?: Date | string | null;
};

type MatchRow = {
  id: string;
  source_list: string;
  entry_id: string;
  primary_name: string;
  normalized_name: string;
  aliases: string[] | null;
  entity_type: string | null;
  country: string | null;
  programs: string[] | null;
  listed_date: string | null;
  score: number;
  matched_on: string;
};

// ---------------------------------------------------------------------------
// Stage one: candidates from Postgres
// ---------------------------------------------------------------------------

/**
 * Fuzzy match a subject name against every loaded sanctions list.
 *
 * The subject's country is deliberately not used to filter. Country data on
 * these lists is patchy, a designated party's listed address is often not
 * where it trades from, and a filter that drops a real hit because two
 * publishers disagree about a country is exactly the kind of quiet failure
 * this engine exists to avoid. Country goes to the triage stage as context
 * instead, where it can inform an argument without silently deleting a row.
 */
export async function screenName(
  subject: ScreenSubject,
  opts: ScreenOptions = {},
): Promise<SanctionsCandidate[]> {
  const normalized = normalizeName(subject.name);
  if (!normalized) return [];

  const since = opts.since
    ? opts.since instanceof Date
      ? opts.since.toISOString()
      : String(opts.since)
    : null;

  // A caller may tighten the threshold, never loosen it. The 0.4 floor is the
  // rule, not a default.
  const threshold = Math.max(
    CANDIDATE_THRESHOLD,
    typeof opts.minScore === "number" ? opts.minScore : CANDIDATE_THRESHOLD,
  );
  const limit = opts.limit && opts.limit > 0 ? opts.limit : DEFAULT_LIMIT;
  const variants = nameVariants(subject.name).slice(0, MAX_VARIANTS);
  const entityType = subject.entityType ? String(subject.entityType) : null;

  const sb = createAdminClient();
  const best: Record<string, SanctionsCandidate> = {};

  for (let v = 0; v < variants.length; v++) {
    const variant = variants[v];
    const { data, error } = await sb.rpc("sanctions_match", {
      p_name: variant,
      p_threshold: threshold,
      p_limit: limit,
      p_entity_type: entityType,
      p_since: since,
    });

    // A screening that cannot reach its lists is a failed screening, never a
    // clean one. Fail loudly.
    if (error) {
      throw new Error(
        `Sanctions match failed for one spelling of the subject: ${error.message}`,
      );
    }

    const rows = (data || []) as MatchRow[];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const score = Number(row.score) || 0;
      const existing = best[row.id];
      if (existing && existing.score >= score) continue;
      best[row.id] = {
        id: row.id,
        source_list: row.source_list,
        entry_id: row.entry_id,
        primary_name: row.primary_name,
        normalized_name: row.normalized_name,
        aliases: row.aliases || [],
        entity_type: row.entity_type,
        country: row.country,
        programs: row.programs || [],
        listed_date: row.listed_date,
        score,
        matched_on: row.matched_on,
        strong: score >= STRONG_THRESHOLD,
        matched_variant: variant,
      };
    }
  }

  return Object.keys(best)
    .map((id) => best[id])
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Stage two: triage
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM = `You are a sanctions analyst at Ponte (ponte.trade),
operated by 1402 Celsius Ltd. A trigram name match has proposed some entries
from published sanctions lists as possible matches for a subject. Your job is
to say, for each proposed entry, whether it is plausibly the same party.

You are given only what is on the published list: names, aliases, entity type,
country, programmes and listing dates. You have no other source. Never invent a
fact about the subject or the listed party.

Judge on:
- how far the two names really are apart once spelling and transliteration are
  allowed for, as against being two different parties that share common words,
- whether the entity types are compatible, a person is not a shipping company,
- whether the countries are compatible, treating a mismatch as weak evidence
  only, because a listed address is often not where a party trades from,
- how common the name is. Two ordinary given names matching is weak. A rare
  distinctive company name matching is strong.

Return a JSON array, one object per candidate, exactly these keys:
[{
  "candidate_id": "<the candidate_id you were given, copied exactly>",
  "likely_match": true | false | "uncertain",
  "reasoning": "<one or two sentences a compliance reviewer can act on>",
  "sources": ["<the sanctions list the entry came from, e.g. OFAC_SDN>"]
}]

Use "uncertain" whenever the list data does not settle it. Do not reach for
false to be helpful: false means you are confident these are different parties.
Nothing you write clears a subject on its own. A human reads all of this.`;

type RawVerdict = {
  candidate_id?: unknown;
  likely_match?: unknown;
  reasoning?: unknown;
  sources?: unknown;
};

function coerceLikely(value: unknown): boolean | "uncertain" {
  if (value === true) return true;
  if (value === false) return false;
  const s = String(value || "").toLowerCase();
  if (s === "true" || s === "yes") return true;
  if (s === "false" || s === "no") return false;
  return "uncertain";
}

function candidateForPrompt(c: SanctionsCandidate): Record<string, unknown> {
  return {
    candidate_id: c.id,
    source_list: c.source_list,
    listed_name: c.primary_name,
    // Aliases are the useful evidence but a long list is mostly tokens. Cap it.
    listed_aliases: c.aliases.slice(0, 12),
    entity_type: c.entity_type,
    country: c.country,
    programs: c.programs.slice(0, 8),
    listed_date: c.listed_date,
    similarity: Number(c.score.toFixed(3)),
    matched_on: c.matched_on,
  };
}

function uncertainVerdict(
  c: SanctionsCandidate,
  reason: string,
): TriageVerdict {
  return {
    candidate_id: c.id,
    likely_match: "uncertain",
    reasoning: reason,
    sources: [c.source_list],
  };
}

/**
 * Ask the model about a set of candidates.
 *
 * Batched, TRIAGE_BATCH candidates per call, rather than one call per
 * candidate. The tradeoff, stated plainly: batching sends the instructions and
 * the subject once instead of once per candidate, which on a subject with
 * twenty weak candidates is most of the input tokens saved and nineteen fewer
 * round trips. What it costs is shared fate, one unparseable response loses
 * the whole batch. That is handled rather than accepted: a batch that fails is
 * returned as uncertain for every candidate in it, which sends them to a human
 * instead of dropping them. Batches stay small so a failure is contained, and
 * one call per candidate remains available by setting TRIAGE_BATCH to 1.
 */
export async function triageCandidates(
  subject: ScreenSubject,
  candidates: SanctionsCandidate[],
  ref?: string | null,
  userId?: string | null,
): Promise<TriageVerdict[]> {
  if (!candidates.length) return [];

  const verdicts: TriageVerdict[] = [];

  for (let i = 0; i < candidates.length; i += TRIAGE_BATCH) {
    const batch = candidates.slice(i, i + TRIAGE_BATCH);

    const user = JSON.stringify({
      subject: {
        name: subject.name,
        normalized_name: normalizeName(subject.name),
        country: subject.country || null,
        entity_type: subject.entityType || null,
      },
      candidates: batch.map(candidateForPrompt),
    });

    let parsed: RawVerdict[] = [];
    try {
      const { data } = await callAiJson<RawVerdict[] | { results?: RawVerdict[] }>({
        feature: "sanctions_triage",
        system: TRIAGE_SYSTEM,
        user,
        model: MODEL_FAST,
        maxTokens: 2000,
        userId: userId ?? null,
        ref: ref ?? null,
      });
      parsed = Array.isArray(data) ? data : data && Array.isArray(data.results) ? data.results : [];
    } catch (err) {
      // The failure text can quote the model's own reply, and the model's reply
      // is about named people. Only the shape of the failure is logged, never
      // the text of it, and never the subject.
      const message = (err as Error).message || "";
      const shape = /unparseable JSON/i.test(message)
        ? "the model returned something that is not JSON"
        : /http \d+/i.test(message)
          ? "the model API returned " + (message.match(/http \d+/i) || [""])[0]
          : "the call did not complete";
      console.error("[ponte] sanctions triage batch failed:", shape);
      parsed = [];
    }

    const byId: Record<string, RawVerdict> = {};
    for (let j = 0; j < parsed.length; j++) {
      const id = String(parsed[j]?.candidate_id || "");
      if (id) byId[id] = parsed[j];
    }

    for (let j = 0; j < batch.length; j++) {
      const c = batch[j];
      const raw = byId[c.id];
      if (!raw) {
        verdicts.push(
          uncertainVerdict(
            c,
            "The triage step returned no verdict for this candidate, so it stands as unresolved and needs a human read.",
          ),
        );
        continue;
      }
      const sources = Array.isArray(raw.sources)
        ? (raw.sources as unknown[]).map((s) => String(s)).filter(Boolean)
        : [];
      verdicts.push({
        candidate_id: c.id,
        likely_match: coerceLikely(raw.likely_match),
        reasoning: String(raw.reasoning || "").slice(0, 600),
        sources: sources.length ? sources : [c.source_list],
      });
    }
  }

  return verdicts;
}

/**
 * A strong candidate can never come back cleared.
 *
 * The model is allowed to argue that a strong name match is a different party,
 * and that argument is kept, because it is useful to the reviewer. It is not
 * allowed to be the answer. A false verdict on a strong candidate becomes
 * uncertain.
 */
function applyStrongRule(
  candidate: SanctionsCandidate,
  verdict: TriageVerdict,
): TriageVerdict {
  if (!candidate.strong || verdict.likely_match !== false) return verdict;
  return {
    candidate_id: verdict.candidate_id,
    likely_match: "uncertain",
    reasoning:
      "Strong name match at " +
      candidate.score.toFixed(2) +
      ", which cannot be cleared automatically and needs a human decision. Triage note, kept for the reviewer: " +
      verdict.reasoning,
    sources: verdict.sources,
  };
}

// ---------------------------------------------------------------------------
// The whole screening
// ---------------------------------------------------------------------------

/**
 * Screen one subject end to end.
 *
 * clean is computed from the candidate set and nothing else. It is true only
 * when the lists proposed nobody at or above 0.4. No triage verdict can turn a
 * candidate into a clean result, which means a triage outage degrades this to
 * "needs a human", never to "clear".
 *
 * opts.ref is what the AI metering in lib/ai.ts costs the triage calls
 * against, normally the verification id, so the real token cost of a screening
 * can be read back per case.
 */
export async function screenSubject(
  subject: ScreenSubject,
  opts: ScreenOptions = {},
): Promise<ScreenResult> {
  const candidates = await screenName(subject, opts);
  const strongCount = candidates.filter((c) => c.strong).length;

  if (!candidates.length) {
    return { clean: true, candidates: [], strongCount: 0 };
  }

  if (opts.triage === false) {
    return {
      clean: false,
      candidates: candidates.map((c) => ({ ...c, triage: null })),
      strongCount,
    };
  }

  // Strong candidates are triaged first, so that if the ceiling bites it bites
  // the weak tail and never the rows that matter most.
  const ordered = candidates.slice().sort((a, b) => {
    if (a.strong !== b.strong) return a.strong ? -1 : 1;
    return b.score - a.score;
  });
  const toTriage = ordered.slice(0, MAX_TRIAGED);

  const verdicts = await triageCandidates(
    subject,
    toTriage,
    opts.ref ?? null,
    opts.userId ?? null,
  );

  const byId: Record<string, TriageVerdict> = {};
  for (let i = 0; i < verdicts.length; i++) {
    byId[verdicts[i].candidate_id] = verdicts[i];
  }

  const triaged: TriagedCandidate[] = candidates.map((c) => {
    const verdict = byId[c.id]
      ? applyStrongRule(c, byId[c.id])
      : uncertainVerdict(
          c,
          "Not triaged: this candidate sits below the triage ceiling for this subject. It still counts against a clean result.",
        );
    return { ...c, triage: verdict };
  });

  return { clean: false, candidates: triaged, strongCount };
}
