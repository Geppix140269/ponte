"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import AccountGate from "@/components/AccountGate";
import CountryPicker from "@/components/CountryPicker";
import { COUNTRIES as ISO_COUNTRIES } from "@/lib/countries";
import { HsCategoryGrid, chapterInCategory, type HsCategory } from "@/components/hs/hsCategories";
import ProductIntake from "@/components/products/intake/ProductIntake";
import type { CommercialTerms } from "@/lib/products/terms";
import type { ResolvedProduct } from "@/lib/products/model";
import {
  emptyDraft,
  openGaps,
  asksFor,
  bucketize,
  blockers as computeBlockers,
  toSubmitPayload,
  draftQuantity,
  submitPayloads,
  type StructureDraft,
  type DraftResolution,
  type Intent,
  type CompletionField,
} from "@/lib/structure/draft";
import {
  parseQuantityInput,
  formatQuantity,
  QUANTITY_MODES,
  type QuantityMode,
} from "@/lib/listings/quantity";
import {
  INCOTERM_GROUPS,
  INCOTERM_MEANING,
  PAYMENT_GROUPS,
  ROLE_GROUPS,
  VALIDITY_DAYS,
  UNITS,
  FREQUENCIES,
  type TapGroup,
} from "@/lib/structure/vocabulary";
import { legacyTypeForIntent, needsHsCode, subjectFor } from "@/lib/structure/draft";
import type { MarketFamily, MarketIntent } from "@/lib/taxonomy/market";
import { MARKET_INTENTS, PRODUCT_SECTORS } from "@/lib/taxonomy/market";
import { serviceCategory, serviceSubcategory } from "@/lib/taxonomy/services";
import { partnerType, relationshipTerm, coverageScope } from "@/lib/taxonomy/distribution";
import { journeyFor } from "@/lib/taxonomy/journey";
import ClassifyStep from "./ClassifyStep";
// The stylesheet is imported by the route, not here, matching find.css and
// structure.css: a component that pulls CSS cannot be mounted by the unit
// tests, which run under tsx and have no CSS loader.
import type { CategoryIconMap } from "@/components/ponte/category/CategoryIcons";

// Origin/destination are stored as country NAMES (they display in the
// opportunity and ride into the submit payload), so the searchable picker,
// which works in ISO codes, is bridged both ways over the full ISO list.
const nameForCode = (code: string): string =>
  ISO_COUNTRIES.find((c) => c.code === code)?.name ?? code;
const codeForName = (name: string | null): string =>
  ISO_COUNTRIES.find((c) => c.name === name)?.code ?? "";

type Step = "intent" | "structuring" | "facts" | "complete" | "preview" | "submit" | "received" | "error";
type Chapter = { chapter: string; chapter_title: string };
type Heading = { heading: string; heading_title: string };
/**
 * An HS row as the catalogue returns it. `display` is the DOTTED CODE
 * ("1005.90"), not a description, which is why nothing here may fall back to
 * it for a label: doing so printed a code where the product name belongs and
 * stored "1005.90" as the product on the listing.
 */
type Hit = {
  code: string;
  display: string;
  description: string;
  short_title: string | null;
  chapter_title?: string;
};

/**
 * What this code IS, in words. The WCO writes "Family; the specific thing", and
 * the specific thing is the half that tells two neighbouring codes apart:
 * 1005.10 and 1005.90 are both "Cereals", and are "maize (corn), seed" and
 * "maize (corn), other than seed". Leading with the family would print the same
 * name twice and pick the wrong product as easily as the right one.
 *
 * The friendly short title wins when the catalogue has one; most rows have
 * none, which is why this fallback carries the weight.
 */
function hsName(h: Hit): string {
  const short = h.short_title?.trim();
  if (short) return short;
  const full = (h.description ?? "").trim();
  const cut = full.indexOf(";");
  const specific = cut >= 0 ? full.slice(cut + 1).trim() : "";
  const name = specific || full;
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : h.code;
}

/** The full official wording, when it says more than the name already did. */
function hsDetail(h: Hit): string | null {
  const full = (h.description ?? "").trim();
  if (!full || full === hsName(h)) return null;
  return full;
}

const STEP_MARK: Partial<Record<Step, string>> = {
  intent: "S01", facts: "S02", complete: "S03", preview: "S04", submit: "S05", received: "S06",
};

export default function StructureComposer({
  entrance = null,
  icons = {},
}: {
  /**
   * The canonical family and intent a landing entrance carried in, already
   * validated against the taxonomy. When present the composer skips its own
   * intent picker: the member has already said what they are doing, and asking
   * again in a smaller vocabulary would lose the answer.
   */
  entrance?: { family: MarketFamily; intent: MarketIntent } | null;
  /**
   * Category icons, rendered on the server and handed down as nodes.
   *
   * `PonteIcon` is a server component so the whole registry's markup stays out
   * of the browser bundle. The pickers are client components, so the icons come
   * in as props rather than by import. One renderer, one registry.
   */
  icons?: CategoryIconMap;
} = {}) {
  const t = useTranslations("structure");
  const router = useRouter();
  const [draft, setDraft] = useState<StructureDraft>(() => {
    const base = emptyDraft();
    if (!entrance) return base;
    return {
      ...base,
      canonical: { family: entrance.family, intent: entrance.intent },
      // The legacy value the schema can store. The canonical pair above stays
      // the authority; this is the shadow the constraint casts.
      intent: legacyTypeForIntent(entrance.intent) ?? null,
    };
  });
  const [stack, setStack] = useState<Step[]>(["intent"]);
  const step = stack[stack.length - 1];
  const set = (patch: Partial<StructureDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const go = (s: Step) => setStack((st) => [...st, s]);
  const replace = (s: Step) => setStack((st) => [...st.slice(0, -1), s]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));

  /**
   * Editing one fact, rather than walking the whole record.
   *
   * Without this there was no way back INTO a fact once it had been passed:
   * the preview printed "not stated" with no control on it, and Resolve on the
   * submit screen popped one step to the same preview, which resolved nothing.
   * A non-null queue means the completion step is open on exactly these fields
   * and returns to wherever it was opened from.
   */
  const [editing, setEditing] = useState<CompletionField[] | null>(null);
  const editField = useCallback((field: CompletionField) => {
    setEditing([field]);
    setStack((st) => [...st, "complete"]);
  }, []);
  const runCompletion = useCallback(() => {
    setEditing(null);
    setStack((st) => [...st, "complete"]);
  }, []);

  // Submit + gate
  const [gateOpen, setGateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultRef, setResultRef] = useState("");
  const [savedDraft, setSavedDraft] = useState(false);
  /** What the validator decided, when the submission was not a draft. */
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const pending = useRef<boolean | null>(null);
  const ran = useRef(false);

  const doSend = useCallback(async (asDraft: boolean) => {
    setSubmitting(true);
    try {
      // One payload, except for a multi-product document where the member chose
      // separate drafts. The first response decides the gate and the error
      // branch, so a 401 on the first record still preserves the whole intake
      // rather than half-submitting it.
      const payloads = submitPayloads(draft, { draft: asDraft, nowIso: new Date().toISOString() });
      const refs: string[] = [];
      // The outcome reported below is the last response's. Declared out here
      // because it is read after the loop; inside it, it died with the iteration.
      let body: Record<string, unknown> = {};
      for (const payload of payloads) {
        const res = await fetch("/api/marketplace/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          pending.current = asDraft;
          setGateOpen(true);
          return;
        }
        body = await res.json().catch(() => ({}));
        if (!res.ok) {
          replace("error");
          return;
        }
        if (typeof body.ref === "string") refs.push(body.ref);
      }
      setResultRef(refs.join(", "));
      setSavedDraft(asDraft);
      // The outcome is already decided by the time this resolves: automated
      // publication runs inside the request. So the member is told what
      // actually happened rather than "submitted for review", which under this
      // model would be untrue for the ordinary case.
      setOutcome(
        asDraft
          ? null
          : {
              status: typeof body.status === "string" ? body.status : "submitted",
              blockingIssues: Array.isArray(body.blockingIssues) ? body.blockingIssues : [],
              completenessScore:
                typeof body.completenessScore === "number" ? body.completenessScore : null,
            },
      );
      replace("received");
    } finally {
      setSubmitting(false);
    }
  }, [draft]);

  const onGateComplete = useCallback(async () => {
    if (ran.current) return;
    ran.current = true;
    setGateOpen(false);
    await doSend(pending.current ?? false);
  }, [doSend]);

  return (
    <div className="ponte-find" style={{ minHeight: "100dvh" }}>
      <div className="sbar">
        {stack.length > 1 && step !== "received" ? (
          <button className="sbar__back" onClick={back} aria-label={t("bar.back")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : (
          // A link, not a label. Until now the composer's first step showed the
          // wordmark as plain text and every later step replaced it with Back,
          // so there was no way out of Start a Deal to the home page at all.
          <Link className="sbar__title serif" href="/" aria-label={t("bar.home")}>
            Ponte<span style={{ color: "var(--ink-3)", fontFamily: "var(--f-mono)", fontSize: 12 }}>.trade</span>
          </Link>
        )}
        {STEP_MARK[step] && <span className="sbar__step">{STEP_MARK[step]}</span>}
      </div>

      <div className="fmain">
        {step === "intent" && <IntentStep draft={draft} set={set} icons={icons} onNext={() => go("structuring")} t={t} />}
        {step === "structuring" && <Structuring onDone={() => replace("facts")} t={t} />}
        {step === "facts" && <FactsStep draft={draft} onComplete={runCompletion} onAdd={editField} t={t} />}
        {step === "complete" && (
          <CompleteStep
            draft={draft}
            set={set}
            fields={editing}
            // The walk through every gap ends at the preview; a single edit
            // returns to the screen that asked for it.
            onDone={() => (editing ? back() : go("preview"))}
            t={t}
          />
        )}
        {step === "preview" && <PreviewStep draft={draft} onNext={() => go("submit")} onEdit={editField} t={t} />}
        {step === "submit" && (
          <SubmitStep
            draft={draft}
            submitting={submitting}
            onSubmit={() => doSend(false)}
            onSaveDraft={() => doSend(true)}
            onResolve={editField}
            onVerify={() => router.push("/verify")}
            t={t}
          />
        )}
        {step === "received" && (
          <ReceivedStep
            savedDraft={savedDraft}
            resultRef={resultRef}
            outcome={outcome}
            onWorkspace={() => router.push("/workspace")}
            onListing={() => router.push(`/marketplace/l/${resultRef}`)}
            onEdit={() => router.push("/marketplace")}
            t={t}
          />
        )}
        {step === "error" && <ErrorStep onRetry={() => replace("submit")} t={t} />}
      </div>

      <footer className="ffoot">{t("trust")}</footer>

      <AccountGate open={gateOpen} context="publish" onClose={() => setGateOpen(false)} onComplete={onGateComplete} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

// ---- S01 intent -> product -------------------------------------------------
function IntentStep({ draft, set, icons, onNext, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; icons: CategoryIconMap; onNext: () => void; t: T }) {
  const intents: { key: Intent; label: string; desc: string }[] = [
    { key: "requirement", label: t("intent.buy"), desc: t("intent.buyDesc") },
    { key: "offer", label: t("intent.sell"), desc: t("intent.sellDesc") },
    { key: "service", label: t("intent.service"), desc: t("intent.serviceDesc") },
  ];
  const ready = !!draft.intent && !!draft.product;

  // A member who arrived through a family entrance has already said what they
  // are doing. The canonical label is stated back to them rather than asking
  // the same question again in the smaller legacy vocabulary, which cannot
  // express distribution at all and cannot tell a service request from a
  // service offer.
  //
  // Where the journey supplies its own heading, that heading already states
  // the intent in the member's own words ("What trade service do you need?"),
  // and printing "Seek a trade service" underneath it says the same thing
  // twice in a smaller voice.
  const journey = journeyFor(draft.canonical?.family as MarketFamily, draft.canonical?.intent);
  const canonicalLabel =
    draft.canonical && !journey
      ? MARKET_INTENTS.find((i) => i.key === draft.canonical!.intent)?.label ?? null
      : null;

  // Only a product record is classified. A trade service and a distribution
  // arrangement have no HS code, and pushing either through a six-digit
  // drill-down would put a false classification on a real record.
  const classify = needsHsCode(draft);

  // The product intake carries its own principal heading, and it is the one the
  // Constitution's editorial emphasis belongs to. Printing the composer's
  // heading above it would put two h1s and two propositions on one screen.
  const intakeOwnsHeading = classify && !draft.product;

  return (
    <section className="sstep reveal">
      {intakeOwnsHeading ? null : (
        <>
          <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("intent.eyebrow")}</span></div>
          <h1 className="fphead__h serif">{journey?.heading ?? t("intent.title")}</h1>
        </>
      )}

      {/* The legacy three-option picker is for a member who arrived with no
          canonical entrance at all. A member who chose a family already
          answered this, and re-asking in a vocabulary that cannot express
          distribution would lose their answer. */}
      {draft.canonical ? (
        canonicalLabel ? (
          <p className="orpick__t" style={{ marginBottom: 18 }}>
            {canonicalLabel}
          </p>
        ) : null
      ) : (
        <div className="tapopts" role="group" aria-label={t("intent.title")}>
          {intents.map((it) => (
            <button key={it.key} className="tapopt" aria-pressed={draft.intent === it.key} onClick={() => set({ intent: it.key })}>
              <span className="tapopt__t serif">{it.label}</span>
              <span className="tapopt__d">{it.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className={`prodblock${draft.intent ? " on" : ""}`}>
        {/* The family boundary, in one branch.
            Ponte asks a product member what they trade and works the
            classification out (ADR-0012); it asks a services or distribution
            member which category their work sits in (ADR-0011). These are the
            two accepted journeys, and neither is a fallback for the other. */}
        {classify ? (
          draft.product ? (
            <>
              <p className="orpick__t" style={{ marginTop: 16 }}>
                {t("intent.chosen")}: <b style={{ color: "var(--ink)" }}>{draft.product}</b>
                {draft.hsCode ? ` · HS ${draft.hsCode}` : ""}
              </p>
              <div style={{ marginTop: 24 }}>
                <button className="fbtn fbtn--lg" disabled={!ready} onClick={onNext}>{t("intent.cta")} →</button>
              </div>
            </>
          ) : (
            // The AI product intake: describe, upload or browse. Browse is the
            // same HS drill-down it always was, passed in rather than forked,
            // so a member who prefers the catalogue loses nothing. There is no
            // Continue underneath it: the intake has its own confirmation, and
            // a second one would be a weaker confirmation of the same thing.
            <ProductIntake
              intent={draft.canonical?.intent === "source_product" ? "source_product" : "offer_product"}
              renderBrowse={() => <HsDrill draft={draft} set={set} t={t} />}
              onResolved={(result) => {
                set(applyResolution(draft, result));
                onNext();
              }}
            />
          )
        ) : (
          // Trade services and Distribution open on their own structured
          // categories rather than a blank line, and the step owns its own
          // Continue because it walks several questions before it is done.
          <ClassifyStep draft={draft} set={set} icons={icons} onNext={onNext} t={t} />
        )}
      </div>
    </section>
  );
}

/**
 * The confirmed intake, folded onto the draft.
 *
 * Every value here was confirmed by the member on the review screen, which is
 * why it may be written onto the record at all. Nothing arrives from the model
 * unseen: a term the document did not state reached the review as `missing`,
 * and a term the member did not fill is still missing here.
 *
 * The terms with no field on the draft (pricing basis, contract term,
 * availability, validity dates, counterparties, signatories) are appended to
 * the note as labelled lines rather than dropped. `listings` cannot store them
 * and losing them would be worse than carrying them as words.
 */
function applyResolution(
  draft: StructureDraft,
  result: {
    products: ResolvedProduct[];
    terms: CommercialTerms;
    plan: string | null;
    documentName: string | null;
  },
): Partial<StructureDraft> {
  const [first, ...rest] = result.products;
  if (!first) return {};

  const value = (key: keyof CommercialTerms): string | null => result.terms[key].value;
  const quantityText = value("quantity");
  const quantityNumber = quantityText ? Number(quantityText.replace(/[^\d]/g, "")) : NaN;

  const carried: [keyof CommercialTerms, string][] = [
    ["pricingBasis", "Pricing basis"],
    ["contractTerm", "Contract term"],
    ["availability", "Availability"],
    ["validity", "Validity"],
    ["counterparties", "Named counterparties"],
    ["signatories", "Signatories"],
  ];
  const extra = carried
    .map(([key, label]) => (value(key) ? `${label}: ${value(key)}.` : null))
    .filter((line): line is string => line !== null);

  const toDraftResolution = (product: ResolvedProduct): DraftResolution => ({
    originalWording: product.originalWording,
    normalised: product.normalised,
    productKey: product.productKey,
    synonyms: product.synonyms,
    categoryPath: product.categoryPath,
    sector: product.sector,
    attributes: product.attributes,
    candidateHs: product.candidateHs,
    searchText: product.searchText,
    searchTerms: product.searchTerms,
  });

  return {
    product: first.normalised,
    // The one place the two accepted decisions meet on the data.
    //
    // ADR-0011 asks every record for a `productSector` key so a market can be
    // filtered and counted; ADR-0012 already derived that sector, from the
    // customs chapter the identification survived. Writing it here answers
    // ADR-0011's question from ADR-0012's work rather than asking the member a
    // second time. Empty stays empty: an underivable sector is a gap, and the
    // ClassifyStep sector picker is still there for a member who wants to say.
    productSector: first.sector || draft.productSector,
    // Suggested, unconfirmed, and carried as such. It is not a gate and never
    // was one on this route.
    hsCode: first.candidateHs?.code ?? null,
    resolution: toDraftResolution(first),
    siblings: rest.map(toDraftResolution),
    programme: result.plan === "programme",
    documentName: result.documentName,
    quantity: Number.isFinite(quantityNumber) && quantityNumber > 0 ? quantityNumber : draft.quantity,
    unit: value("unit") ?? draft.unit,
    frequency: value("recurrence") ?? draft.frequency,
    origin: value("origin") ?? draft.origin,
    destination: value("destination") ?? draft.destination,
    incoterm: value("incoterm") ?? draft.incoterm,
    payment: value("paymentStructure") ?? draft.payment,
    note: [draft.note, ...extra].filter(Boolean).join(" ") || null,
  };
}
/**
 * The heading each canonical entrance opens with now lives in
 * `lib/taxonomy/journey.ts`, alongside the ordered questions it introduces, so
 * a heading and the questions under it cannot drift apart.
 *
 * The blank "State it in one line" field that used to stand here is gone. It
 * was the only classification a trade service or a distribution arrangement
 * ever received, and a sentence is not a classification: it cannot be
 * filtered, matched, counted or searched, and it asked the member to guess
 * Ponte's vocabulary. `ClassifyStep` asks the structured question instead.
 */

// The HS drill-down (chapter -> heading -> six-digit) with a search fallback.
function HsDrill({ draft, set, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; t: T }) {
  const [mode, setMode] = useState<"browse" | "search">("browse");
  const [level, setLevel] = useState<"categories" | "chapters" | "headings" | "codes">("categories");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [codes, setCodes] = useState<Hit[]>([]);
  const [chosen, setChosen] = useState<{ category?: HsCategory; chapter?: Chapter; heading?: Heading }>({});
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const deb = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/hs/search?chapters=1").then((r) => r.json()).then((d) => setChapters(d?.chapters ?? [])).catch(() => {});
  }, []);

  const pick = useCallback((product: string, code: string) => {
    set({ product, hsCode: code, unit: draft.unit ?? "MT" });
    // Prefill the unit chip from the WCO unit when the code has one.
    fetch(`/api/hs/search?code=${code}`).then((r) => r.json()).then((d) => {
      const u = d?.code?.unit;
      if (typeof u === "string" && u.trim()) set({ unit: u.trim() });
    }).catch(() => {});
  }, [set, draft.unit]);

  useEffect(() => {
    if (deb.current) window.clearTimeout(deb.current);
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    deb.current = window.setTimeout(() => {
      fetch(`/api/hs/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => setHits((d?.codes ?? []).slice(0, 10))).catch(() => setHits([]));
    }, 220);
  }, [query]);

  if (mode === "search") {
    return (
      <div>
        <div className="hscrumb"><button onClick={() => setMode("browse")}>{t("hs.browse")}</button></div>
        <input className="snote hssearch" style={{ minHeight: "auto", padding: "10px 12px" }} value={query} placeholder={t("hs.searchPlaceholder")} aria-label={t("hs.searchPlaceholder")} onChange={(e) => setQuery(e.target.value)} />
        {hits.map((h) => (
          <HsCodeRow key={h.code} hit={h} picked={draft.hsCode === h.code} onPick={pick} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="orpick"><span className="orpick__t">{t("hs.choose")}</span><span className="orpick__n">{t("hs.catalogue")}</span></div>
      <div className="hscrumb">
        <button onClick={() => { setLevel("categories"); setChosen({}); }}>{t("hs.all")}</button>
        {chosen.category && <><span>›</span><button onClick={() => { setLevel("chapters"); setChosen({ category: chosen.category }); }}>{chosen.category.label}</button></>}
        {chosen.chapter && <><span>›</span><button onClick={() => { setLevel("headings"); setChosen({ category: chosen.category, chapter: chosen.chapter }); }}>{chosen.chapter.chapter_title}</button></>}
        {chosen.heading && <><span>›</span><span>{chosen.heading.heading_title}</span></>}
      </div>

      {level === "categories" && (
        <HsCategoryGrid ariaLabel={t("hs.choose")} onPick={(cat) => { setChosen({ category: cat }); setLevel("chapters"); }} />
      )}
      {level === "chapters" && (
        <div className="hsgrid">
          {chapters.filter((c) => !chosen.category || chapterInCategory(c.chapter, chosen.category)).map((c) => (
            <button key={c.chapter} className="hstile" onClick={() => {
              setChosen((prev) => ({ category: prev.category, chapter: c }));
              fetch(`/api/hs/search?chapter=${c.chapter}`).then((r) => r.json()).then((d) => { setHeadings(d?.headings ?? []); setLevel("headings"); }).catch(() => {});
            }}>
              {c.chapter_title}<span className="hstile__n">{c.chapter}</span>
            </button>
          ))}
        </div>
      )}
      {level === "headings" && headings.map((h) => (
        <button key={h.heading} className="hsrow" onClick={() => {
          setChosen((c) => ({ ...c, heading: h }));
          fetch(`/api/hs/search?heading=${h.heading}`).then((r) => r.json()).then((d) => { setCodes(d?.codes ?? []); setLevel("codes"); }).catch(() => {});
        }}>
          <span>{h.heading_title}</span><span className="hsrow__code">{h.heading} ›</span>
        </button>
      ))}
      {level === "codes" && codes.map((c) => (
        <HsCodeRow key={c.code} hit={c} picked={draft.hsCode === c.code} onPick={pick} />
      ))}

      <button className="paste-toggle" onClick={() => setMode("search")}>{t("hs.searchInstead")}</button>
    </div>
  );
}

/**
 * One six-digit code, as a product a trader can recognise.
 *
 * The code alone is not a choice anyone can make: "1005.90" says nothing, and
 * a list of them is a list of numbers. So the row leads with what the code IS,
 * carries the official wording underneath when it adds anything (the WCO
 * qualifier is often the whole distinction between two neighbouring codes), and
 * keeps the number where a number belongs, at the end.
 */
function HsCodeRow({ hit, picked, onPick }: { hit: Hit; picked: boolean; onPick: (product: string, code: string) => void }) {
  const detail = hsDetail(hit);
  return (
    <button
      className={`hsrow leaf hsrow--desc${picked ? " is-picked" : ""}`}
      onClick={() => onPick(hsName(hit), hit.code)}
    >
      <span className="hsrow__b">
        <span className="hsrow__n">{hsName(hit)}</span>
        {detail && <span className="hsrow__d">{detail}</span>}
      </span>
      <span className="hsrow__code">HS {hit.display || hit.code}</span>
    </button>
  );
}

function Structuring({ onDone, t }: { onDone: () => void; t: T }) {
  const [msg, setMsg] = useState(0);
  const lines = [t("structuring.s1"), t("structuring.s2"), t("structuring.s3")];
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { onDone(); return; }
    const a = window.setInterval(() => setMsg((m) => Math.min(m + 1, lines.length - 1)), 620);
    const done = window.setTimeout(onDone, 1900);
    return () => { window.clearInterval(a); window.clearTimeout(done); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="structing sstep">
      <svg width="72" height="60" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M22 78 L22 46 C22 24 98 24 98 46 L98 78" fill="none" stroke="var(--rule-strong)" strokeWidth="8" />
        <circle cx="60" cy="30" r="7" fill="var(--gold)" />
      </svg>
      <p className="structing__s">{lines[msg]}</p>
    </section>
  );
}

// ---- S02 facts & gaps ------------------------------------------------------
function FactsStep({ draft, onComplete, onAdd, t }: { draft: StructureDraft; onComplete: () => void; onAdd: (f: CompletionField) => void; t: T }) {
  const b = bucketize(draft);
  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("facts.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("facts.reward", { facts: b.commercial.length, gaps: b.missing.length })}</h1>

      <Bucket label={t("facts.commercial")}>
        {b.commercial.map((k) => (
          <div className="sfact" key={k}><span className="sfact__k">{t(`field.${k}`)}</span><span className="sval sval--ok">✓ {t("facts.stated")}</span></div>
        ))}
      </Bucket>
      {b.missing.length > 0 && (
        <Bucket label={`${t("facts.missing")} · ${b.missing.length}`}>
          {b.missing.map((k) => (
            <div className="sfact" key={k}><span className="sfact__k">{t(`field.${k}`)}</span><button className="sval sval--add" onClick={() => onAdd(k as CompletionField)}>{t("facts.add")} →</button></div>
          ))}
        </Bucket>
      )}
      <Bucket label={t("facts.evidence")}>
        {b.evidence.map((k) => (
          <div className="sfact" key={k}><span className="sfact__k">{t(`evidence.${k}`)}</span><span className="sval sval--ev">{t("facts.atReview")}</span></div>
        ))}
      </Bucket>
      <Bucket label={t("facts.private")}>
        {b.keptPrivate.map((k) => (
          <div className="sfact" key={k}><span className="sfact__k">{t(`private.${k}`)}</span><span className="sval sval--priv">{t("facts.withheld")}</span></div>
        ))}
      </Bucket>

      <div style={{ marginTop: 24 }}><button className="fbtn fbtn--lg fbtn--block" onClick={onComplete}>{t("facts.cta")}</button></div>
    </section>
  );
}

function Bucket({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bucket reveal-stagger">
      <div className="bucket__l">{label}</div>
      {children}
    </div>
  );
}

// ---- S03 progressive completion -------------------------------------------
/**
 * The one screen that asks for a fact, used two ways: walking every open gap in
 * order (`fields` null), or opened on a named fact to change it (`fields` set).
 * Editing shows no progress bar and no Skip, because there is nothing to skip
 * past: the member came here to answer one question.
 */
function CompleteStep({ draft, set, fields, onDone, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; fields: CompletionField[] | null; onDone: () => void; t: T }) {
  const editing = fields !== null;
  const [queue] = useState<CompletionField[]>(() => fields ?? openGaps(draft));
  const [i, setI] = useState(0);
  const field = queue[i];
  const total = queue.length;
  const next = () => (i + 1 < total ? setI(i + 1) : onDone());

  // Nothing left to ask: leave, without rendering an empty question. The exit
  // is deferred to an effect so it is never a state change during a render.
  useEffect(() => {
    if (!field) onDone();
  }, [field, onDone]);
  if (!field) return null;

  return (
    <section className="sstep">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{editing ? t("complete.editEyebrow") : t("complete.eyebrow")}</span></div>
      {!editing && (
        <div className="readiness" style={{ margin: "12px 0 20px" }}>
          <div className="readiness__track"><div className="readiness__fill" style={{ width: `${(i / total) * 100}%` }} /></div>
          <span className="readiness__label">{t("complete.remaining", { n: total - i })}</span>
        </div>
      )}
      <div className="qwrap">
        <h2 className="q serif">{t(`ask.${field}`)}</h2>
        <QControl field={field} draft={draft} set={set} t={t} />
      </div>
      <div className="qnav">
        {!editing && <button className="fbtn fbtn--ghost" onClick={next}>{t("complete.skip")}</button>}
        <button className="fbtn" onClick={next}>
          {editing ? t("complete.save") : i + 1 < total ? t("complete.next") : t("complete.done")}
        </button>
      </div>
    </section>
  );
}

/** A flat row of chips, for a vocabulary short enough to read at a glance. */
function Chips({ options, value, onPick }: { options: readonly string[]; value: string | null; onPick: (v: string) => void }) {
  return (
    <div className="chiprow">
      {options.map((o) => (
        <button key={o} className="fchip" aria-pressed={value === o} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );
}

/**
 * A grouped vocabulary. Real trade vocabularies are long (eleven incoterms,
 * five families of payment term), and a long undifferentiated chip cloud is
 * as unusable as a list that was cut short. The group heading is what makes
 * the length readable, so it is a heading, not a divider.
 */
function ChipGroups({ groups, value, onPick, meaning }: { groups: readonly TapGroup[]; value: string | null; onPick: (v: string) => void; meaning?: Record<string, string> }) {
  return (
    <div className="tapgroups">
      {groups.map((g, gi) => (
        <div className="tapgroup" key={g.label ?? `g${gi}`}>
          {g.label && <div className="tapgroup__l">{g.label}</div>}
          <div className="chiprow">
            {g.options.map((o) => (
              <button
                key={o}
                className={`fchip${meaning ? " fchip--two" : ""}`}
                aria-pressed={value === o}
                onClick={() => onPick(o)}
              >
                <span className="fchip__t">{o}</span>
                {meaning?.[o] && <span className="fchip__d">{meaning[o]}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The quantity control.
 *
 * The control this replaces rendered `(draft.quantity ?? 10000)`. A member who
 * opened the step saw "10,000", read it as the value they had been given, left
 * it alone and submitted a listing with NO quantity: the fallback lived in the
 * render, and only pressing + or − ever wrote anything to the draft. Changing
 * the number "fixed" it, which is why the bug reproduced as "it only saves if I
 * edit it".
 *
 * Two things prevent it recurring. There is no displayed default: the field is
 * empty until the member acts, and an empty field reads as empty. And the first
 * thing asked for is the BASIS, not a figure, so "on request" and "negotiable"
 * are answers a member can give instead of accepting a number that was never
 * theirs. A pre-filled commercial quantity on a trade platform is not a
 * convenience; it is an accidental offer.
 */
function QuantityControl({ draft, set, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; t: T }) {
  const mode = draft.quantityMode;
  // Free text while typing, so a half-entered "1." or "1,2" is not destroyed by
  // a parse on every keystroke. It is committed as a number on change.
  const [raw, setRaw] = useState<Record<string, string>>({});

  const field = (key: "quantity" | "quantityMin" | "quantityMax", label: string) => {
    const stored = draft[key];
    const shown = raw[key] ?? (stored === null ? "" : String(stored));
    return (
      <label className="qfield" key={key}>
        <span className="qfield__l">{label}</span>
        <input
          className="qfield__i"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          // A decimal quantity is ordinary in trade (1.25 MT, 12.5 tonnes), so
          // the field accepts one. `type="number"` with a step of 1 silently
          // refuses them in several browsers.
          placeholder={t("ask.quantityExample")}
          value={shown}
          onChange={(e) => {
            const v = e.target.value;
            setRaw((r) => ({ ...r, [key]: v }));
            set({ [key]: parseQuantityInput(v) } as Partial<StructureDraft>);
          }}
        />
      </label>
    );
  };

  return (
    <div className="qty">
      <div className="chiprow">
        {QUANTITY_MODES.map((m) => (
          <button
            key={m}
            className="fchip"
            aria-pressed={mode === m}
            onClick={() => {
              // Switching mode clears the figures the new mode does not own, so
              // a leftover number from "range" cannot linger behind "on
              // request" and reappear on the record.
              set({
                quantityMode: m,
                ...(m === "range" ? { quantity: null } : { quantityMin: null, quantityMax: null }),
                ...(m === "on_request" ? { quantity: null, quantityMin: null, quantityMax: null } : {}),
              });
              setRaw({});
            }}
          >
            {t(`ask.quantityMode.${m}`)}
          </button>
        ))}
      </div>

      {mode === "range" && (
        <div className="qrow">
          {field("quantityMin", t("ask.quantityFrom"))}
          {field("quantityMax", t("ask.quantityTo"))}
        </div>
      )}
      {mode && mode !== "range" && mode !== "on_request" && (
        <div className="qrow">
          {field("quantity", mode === "negotiable" ? t("ask.quantityIndicative") : t("ask.quantityAmount"))}
        </div>
      )}

      {mode && mode !== "on_request" && (
        <Chips options={UNITS} value={draft.unit} onPick={(v) => set({ unit: v })} />
      )}
      {mode && mode !== "on_request" && (
        <Chips options={FREQUENCIES} value={draft.frequency} onPick={(v) => set({ frequency: v })} />
      )}
    </div>
  );
}

function QControl({ field, draft, set, t }: { field: CompletionField; draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; t: T }) {
  switch (field) {
    case "quantity":
      return <QuantityControl draft={draft} set={set} t={t} />;
    case "origin":
      return <CountryPicker value={codeForName(draft.origin)} onChange={(code) => set({ origin: nameForCode(code) })} />;
    case "destination":
      return <CountryPicker value={codeForName(draft.destination)} onChange={(code) => set({ destination: nameForCode(code) })} />;
    case "incoterm":
      return <ChipGroups groups={INCOTERM_GROUPS} value={draft.incoterm} onPick={(v) => set({ incoterm: v })} meaning={INCOTERM_MEANING} />;
    case "payment":
      return <ChipGroups groups={PAYMENT_GROUPS} value={draft.payment} onPick={(v) => set({ payment: v })} />;
    case "validity":
      // A horizon, plus the honest answer that there is no end date. Both are
      // declarations; only silence is undeclared.
      return (
        <div className="chiprow">
          {VALIDITY_DAYS.map((d) => (
            <button key={d} className="spill" aria-pressed={draft.validity === d} onClick={() => set({ validity: d })}>{t("complete.days", { n: d })}</button>
          ))}
          <button className="spill" aria-pressed={draft.validity === "standing"} onClick={() => set({ validity: "standing" })}>{t("complete.standing")}</button>
        </div>
      );
    case "role":
      return <ChipGroups groups={ROLE_GROUPS} value={draft.role} onPick={(v) => set({ role: v })} />;
    case "note":
      return <textarea className="snote" placeholder={t("ask.notePlaceholder")} value={draft.note ?? ""} onChange={(e) => set({ note: e.target.value })} />;
  }
}

// ---- S04 public / private / reviewer --------------------------------------
function PreviewStep({ draft, onNext, onEdit, t }: { draft: StructureDraft; onNext: () => void; onEdit: (f: CompletionField) => void; t: T }) {
  const [tab, setTab] = useState<"public" | "private" | "reviewer">("public");
  const ns = t("field.notStated");

  /**
   * A row of the record. Every fact that was tapped can be tapped again here:
   * the preview was previously read-only, so a member who saw "not stated" on
   * their own listing had no way to state it, and the record they were about to
   * submit was the last place they could still fix it.
   */
  const row = (k: string, v: string | null, edit?: CompletionField) => (
    <div className="lrow" key={k}>
      <span className="lrow__k">{k}</span>
      <span className={`lrow__v${v ? "" : " ns"}`}>{v ?? ns}</span>
      {edit && (
        <button className="lrow__e" onClick={() => onEdit(edit)}>
          {v ? t("preview.edit") : t("preview.add")}
        </button>
      )}
    </div>
  );
  const kind = draft.intent === "offer" ? t("intent.sell") : draft.intent === "service" ? t("intent.service") : t("intent.buy");
  // The route reads as the end(s) this member actually decides.
  const routeValue = (): string | null => {
    const from = draft.origin;
    const to = draft.destination;
    if (from && to) return `${from} → ${to}`;
    if (from) return t("preview.shipsFrom", { place: from });
    if (to) return t("preview.deliveredTo", { place: to });
    return null;
  };
  const routeField: CompletionField = asksFor(draft.intent, "origin") ? "origin" : "destination";
  const validityValue =
    draft.validity === "standing"
      ? t("complete.standing")
      : typeof draft.validity === "number"
        ? t("complete.days", { n: draft.validity })
        : null;
  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("preview.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("preview.title")}</h1>
      <div className="tabs2" role="tablist">
        {(["public", "private", "reviewer"] as const).map((x) => (
          <button key={x} className="tab2" role="tab" aria-selected={tab === x} onClick={() => setTab(x)}>{t(`preview.${x}`)}</button>
        ))}
      </div>

      {tab === "public" && (
        <div>
          <p className="pv__note">{t("preview.publicNote")}</p>
          <div className="ledger2">
            {row(t("field.kind"), kind)}
            {/* The subject is composed from the categories the member chose,
                so a record built entirely by tapping still names itself. */}
            {row(t("field.product"), subjectFor(draft))}
            {/* The chosen classification is part of the public record, not
                hidden metadata: it is what a counterparty filters on. */}
            {classificationRows(draft).map((c) => row(t(`field.${c.field}`), c.value))}
            {row(t("field.hsCode"), draft.hsCode ? `HS ${draft.hsCode}` : null)}
            {row(t("field.quantity"), formatQuantity(draftQuantity(draft)), "quantity")}
            {row(t("field.frequency"), draft.frequency, "quantity")}
            {row(t("field.route"), routeValue(), routeField)}
            {row(t("field.incoterm"), draft.incoterm, "incoterm")}
            {row(t("field.validity"), validityValue, "validity")}
          </div>
        </div>
      )}
      {tab === "private" && (
        <div>
          <p className="pv__note">{t("preview.privateNote")}</p>
          <div className="ledger2">
            {row(t("private.identity"), t("preview.reviewerOnly"))}
            {row(t("private.contact"), t("preview.withheld"))}
            {row(t("field.payment"), draft.payment, "payment")}
            {row(t("field.role"), draft.role, "role")}
            {row(t("field.note"), draft.note, "note")}
          </div>
        </div>
      )}
      {tab === "reviewer" && (
        <div>
          <p className="pv__note">{t("preview.reviewerNote")}</p>
          <div className="rev">
            <div className="lrow"><span className="lrow__k">{t("reviewer.facts")}</span><span className={`rev__v ${computeBlockers(draft).some((b) => b.resolve === "complete") ? "wait" : "ok"}`}>{computeBlockers(draft).some((b) => b.resolve === "complete") ? t("reviewer.partial") : t("reviewer.yes")}</span></div>
            <div className="lrow"><span className="lrow__k">{t("reviewer.authority")}</span><span className="rev__v wait">{t("reviewer.evidenceNeeded")}</span></div>
            <div className="lrow"><span className="lrow__k">{t("reviewer.verified")}</span><span className="rev__v wait">{t("reviewer.notYet")}</span></div>
            <div className="lrow"><span className="lrow__k">{t("reviewer.sanctions")}</span><span className="rev__v wait">{t("reviewer.onSubmission")}</span></div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}><button className="fbtn fbtn--secondary fbtn--lg" onClick={onNext}>{t("preview.cta")}</button></div>
    </section>
  );
}

/**
 * The classification rows the preview prints, in journey order.
 *
 * Only what this record actually carries. A products record shows no partner
 * type, a services record shows no coverage, and neither shows an empty row
 * for the other family's questions: a fact that was never this member's to
 * give is not a gap.
 */
function classificationRows(draft: StructureDraft): { field: string; value: string | null }[] {
  const rows: { field: string; value: string | null }[] = [];
  const family = draft.canonical?.family;

  if (family === "services") {
    rows.push({ field: "serviceCategory", value: serviceCategory(draft.serviceCategory)?.label ?? null });
    const subs = draft.serviceSubcategories
      .map((k) => serviceSubcategory(k)?.label)
      .filter((l): l is string => !!l);
    rows.push({ field: "serviceSubcategory", value: subs.length > 0 ? subs.join(", ") : null });
  }

  if (family === "distribution") {
    rows.push({ field: "partnerType", value: partnerType(draft.distributionPartnerType)?.label ?? null });
    const terms = draft.distributionRelationshipTerms
      .map((k) => relationshipTerm(k)?.label)
      .filter((l): l is string => !!l);
    rows.push({ field: "relationship", value: terms.length > 0 ? terms.join(", ") : null });
    const scope = coverageScope(draft.coverageScope)?.label ?? null;
    rows.push({
      field: "coverage",
      value: scope && draft.territoryCodes.length > 0
        ? `${scope} (${draft.territoryCodes.join(", ")})`
        : scope,
    });
  }

  if (family !== "products") {
    rows.push({
      field: "sector",
      value: PRODUCT_SECTORS.find((s) => s.key === draft.productSector)?.label ?? null,
    });
  }

  return rows;
}

// ---- S05 save / submit -----------------------------------------------------
function SubmitStep({ draft, submitting, onSubmit, onSaveDraft, onResolve, onVerify, t }: { draft: StructureDraft; submitting: boolean; onSubmit: () => void; onSaveDraft: () => void; onResolve: (f: CompletionField) => void; onVerify: () => void; t: T }) {
  const blocks = computeBlockers(draft);
  return (
    <section className="sstep">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("submit.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("submit.title")}</h1>
      <p className="fphead__def">{t("submit.sub", { n: blocks.length })}</p>
      <div style={{ marginTop: 16 }}>
        {blocks.map((b) => (
          <div className="block" key={b.key}>
            <div className="block__t">{t(`blocker.${b.key}`)}</div>
            <div className="block__d">{t(`blocker.${b.key}Desc`)}</div>
            {/* Resolve opens the fact itself. It used to step back one screen,
                which landed on the same summary and changed nothing. */}
            {b.resolve === "complete" && (
              <button className="block__r" onClick={() => onResolve(b.key as CompletionField)}>{t("submit.resolve")} →</button>
            )}
            {b.resolve === "verify" && (
              <button className="block__r" onClick={onVerify}>{t("submit.verifyNow")} →</button>
            )}
          </div>
        ))}
      </div>
      <div className="submit-cta">
        <button className="fbtn fbtn--lg fbtn--block" disabled={submitting} onClick={onSubmit}>{t("submit.submit")}</button>
        <button className="fbtn fbtn--ghost fbtn--block" disabled={submitting} onClick={onSaveDraft}>{t("submit.saveDraft")}</button>
      </div>
    </section>
  );
}

// ---- S06 received ----------------------------------------------------------

/** What the submit route reported back. Null for a saved draft. */
export type SubmitOutcome = {
  status: string;
  blockingIssues: string[];
  completenessScore: number | null;
};

/**
 * What the member is told after submitting.
 *
 * This screen used to say "Opportunity submitted for review" and "Under
 * review" for every submission, because that is what always happened. Under
 * automated publication it is untrue for the ordinary case: by the time this
 * renders, a complete listing from a verified member is already live.
 *
 * So the screen reports the OUTCOME. Three of them, each with its own action:
 * published (here is the link), needs information (here are the exact gaps),
 * and held for a check (neutral wording, because an automated flag is not a finding
 * against the member, and saying so on this screen would accuse them of
 * something no check established).
 */
function ReceivedStep({ savedDraft, resultRef, outcome, onWorkspace, onListing, onEdit, t }: {
  savedDraft: boolean;
  resultRef: string;
  outcome: SubmitOutcome | null;
  onWorkspace: () => void;
  onListing: () => void;
  onEdit: () => void;
  t: T;
}) {
  const status = savedDraft ? "draft" : outcome?.status ?? "submitted";
  const published = status === "approved";
  const needsInfo = status === "needs_information";
  const flagged = status === "flagged";

  const title = savedDraft ? t("received.draftTitle")
    : published ? t("received.publishedTitle")
    : needsInfo ? t("received.needsInfoTitle")
    : flagged ? t("received.flaggedTitle")
    : t("received.title");

  const body = savedDraft ? t("received.draftBody")
    : published ? t("received.publishedBody")
    : needsInfo ? t("received.needsInfoBody")
    : flagged ? t("received.flaggedBody")
    : t("received.body");

  const eyebrow = savedDraft ? t("received.savedEyebrow")
    : published ? t("received.publishedEyebrow")
    : needsInfo ? t("received.needsInfoEyebrow")
    : flagged ? t("received.flaggedEyebrow")
    : t("received.eyebrow");

  return (
    <section className="rec">
      <span className="eyebrow">{eyebrow}</span>
      <div className="rec-ack">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          {needsInfo || flagged
            ? <path d="M12 7v6m0 4h.01" strokeLinecap="round" />
            : <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
      <h1 className="rec-title serif">{title}</h1>
      <p className="rec-body">{body}{resultRef ? ` (${resultRef})` : ""}</p>

      {/* The exact gaps, with a route back to the form. A member told only
          that something is missing has been told nothing they can act on. */}
      {needsInfo && outcome?.blockingIssues.length ? (
        <ul className="rec-issues">
          {outcome.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : null}

      {published && outcome?.completenessScore !== null && outcome?.completenessScore !== undefined ? (
        <div className="rec-next">
          <div className="rec-step">
            <span>{t("received.detailLevel")}</span><b>{outcome.completenessScore}%</b>
          </div>
        </div>
      ) : null}

      <div className="rec-actions">
        {published && <button className="fbtn fbtn--lg" onClick={onListing}>{t("received.viewListing")}</button>}
        {(needsInfo || flagged) && <button className="fbtn fbtn--lg" onClick={onEdit}>{t("received.completeListing")}</button>}
        <button className={published || needsInfo || flagged ? "fbtn fbtn--ghost" : "fbtn fbtn--lg"} onClick={onWorkspace}>
          {t("received.cta")}
        </button>
      </div>

      {published && <p className="rec-note">{t("received.publishedDisclaimer")}</p>}
    </section>
  );
}

function ErrorStep({ onRetry, t }: { onRetry: () => void; t: T }) {
  return (
    <section className="sstep">
      <span className="err-badge">{t("error.badge")}</span>
      <h1 className="fphead__h serif" style={{ marginTop: 8 }}>{t("error.title")}</h1>
      <p className="fphead__def">{t("error.body")}</p>
      <div style={{ marginTop: 20 }}><button className="fbtn" onClick={onRetry}>{t("error.retry")}</button></div>
    </section>
  );
}
