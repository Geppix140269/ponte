"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import AccountGate from "@/components/AccountGate";
import CountryPicker from "@/components/CountryPicker";
import { COUNTRIES as ISO_COUNTRIES } from "@/lib/countries";
import { HsCategoryGrid, chapterInCategory, type HsCategory } from "@/components/hs/hsCategories";
import ProductIntake from "@/components/products/intake/ProductIntake";
import TaskCompletionBridge from "@/components/ponte/bridge/TaskCompletionBridge";
import { completionValue, completionBandLabel } from "@/lib/structure/completion";
import type { CommercialTerms } from "@/lib/products/terms";
import type { ResolvedProduct } from "@/lib/products/model";
import {
  emptyDraft,
  openGaps,
  bucketize,
  blockers as computeBlockers,
  procedureFor,
  askKeyFor,
  roleGroupsFor,
  statesOwnCapability,
  submitPayloads,
  isStructureDraft,
  type StructureDraft,
  type DraftResolution,
  type Intent,
  type CompletionField,
  type ReviewModel,
  type ReviewSection,
  type ServiceTerms,
  type DistributionTerms,
} from "@/lib/structure/draft";
import {
  parseQuantityInput,
  QUANTITY_MODES,
} from "@/lib/listings/quantity";
import {
  INCOTERM_GROUPS,
  INCOTERM_MEANING,
  PAYMENT_GROUPS,
  VALIDITY_DAYS,
  UNITS,
  FREQUENCIES,
  type TapGroup,
} from "@/lib/structure/vocabulary";
import { legacyTypeForIntent, needsHsCode, sourcingProduct } from "@/lib/structure/draft";
import { DECLARATION_TERMS } from "@/lib/listings/declaration";
import type { MarketFamily, MarketIntent } from "@/lib/taxonomy/market";
import { MARKET_INTENTS } from "@/lib/taxonomy/market";
import type { CategoryOption } from "@/lib/taxonomy/services";
import {
  SERVICE_ENGAGEMENT_TYPES,
  SERVICE_PRICING_BASES,
  SERVICE_AVAILABILITY,
  specialisationGroupsFor,
} from "@/lib/taxonomy/service-terms";
import {
  DISTRIBUTION_CHANNELS,
  DISTRIBUTION_CAPABILITIES,
  DISTRIBUTION_TIMING,
} from "@/lib/taxonomy/distribution-terms";
import { journeyFor } from "@/lib/taxonomy/journey";
import ClassifyStep from "./ClassifyStep";
import JourneyBack from "@/components/ponte/nav/JourneyBack";
import UnsavedChangesDialog from "@/components/ponte/nav/UnsavedChangesDialog";
import { useUnsavedGuard } from "@/components/ponte/nav/useUnsavedGuard";
import { structureDirty } from "@/lib/nav/dirty";
import { forgetDraft, keepDraft, readKeptDraft } from "@/lib/structure/draft-store";
import { DEFAULT_COMPOSER_EXIT, type ComposerExit } from "@/lib/structure/exit";
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

/**
 * The steps this build understands.
 *
 * A kept draft may carry a stack written by an older build. Its FACTS are
 * still worth restoring; its steps are not worth trusting, so they are filtered
 * against this set. Declared beside the type so the two cannot drift.
 */
const KNOWN_STEPS = new Set<Step>([
  "intent", "structuring", "facts", "complete", "preview", "submit", "received", "error",
]);

/**
 * A write to the draft: a patch, or a function of the current draft.
 *
 * Assignable wherever a plain patch setter is expected, so `ClassifyStep` and
 * the product intake keep their narrower signature untouched.
 */
type SetDraft = (
  patch: Partial<StructureDraft> | ((draft: StructureDraft) => Partial<StructureDraft>),
) => void;
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
  initial = null,
  icons = {},
  exit = DEFAULT_COMPOSER_EXIT,
}: {
  /**
   * The canonical family and intent a landing entrance carried in, already
   * validated against the taxonomy. When present the composer skips its own
   * intent picker: the member has already said what they are doing, and asking
   * again in a smaller vocabulary would lose the answer.
   */
  entrance?: { family: MarketFamily; intent: MarketIntent } | null;
  /**
   * A saved draft, read from the member's own listing row on the server.
   *
   * It supersedes `entrance`: a resumed record already knows its family, and
   * the entrance is only a way of stating one that has not been chosen yet.
   */
  initial?: StructureDraft | null;
  /**
   * Category icons, rendered on the server and handed down as nodes.
   *
   * `PonteIcon` is a server component so the whole registry's markup stays out
   * of the browser bundle. The pickers are client components, so the icons come
   * in as props rather than by import. One renderer, one registry.
   */
  icons?: CategoryIconMap;
  /**
   * Where Back goes from the FIRST step, and what it is called.
   *
   * Resolved on the server from `?from=` against an allowlist, so nothing the
   * URL says can become a destination. See `lib/structure/exit.ts`.
   */
  exit?: ComposerExit;
} = {}) {
  const t = useTranslations("structure");
  const tj = useTranslations("journey");
  const router = useRouter();
  const [draft, setDraft] = useState<StructureDraft>(() => {
    // A resumed draft wins. It already carries its family, its classification
    // and the terms belonging to that family; applying an entrance over it
    // would restate a choice the record has already made.
    if (initial) return initial;
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

  /*
    Bringing back what the device kept.
    ----------------------------------
    Until now a part-built record lived only in this component's state, so a
    reload, a restored tab or a phone locking discarded minutes of work.
    `useUnsavedGuard` warns before a navigation it can SEE, and it cannot see
    any of those. The owner found it by pressing back at the end and landing on
    the entrance: "I've lost everything. That is absurd."

    Restored in an effect rather than in the `useState` initialiser on purpose.
    The initialiser runs on the server too, where there is no `localStorage`,
    and a client that started from a different value than the server rendered
    is a hydration mismatch. So the first paint is always the server's, and the
    kept draft arrives immediately after it.

    A SERVER draft wins and nothing is restored over it. `initial` is the row
    the member deliberately saved; the kept copy is only the gap between typing
    something and saving it. An entrance choice does not win: picking a family
    on the way in is not work, and it is exactly what a returning member is
    about to do again.
  */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || initial) return;
    restored.current = true;
    const kept = readKeptDraft<StructureDraft>(undefined, isStructureDraft);
    if (!kept || !structureDirty(kept.draft)) return;
    setDraft(kept.draft);
    // Only steps this build knows. A stack from an older shape is ignored
    // rather than trusted, and the member simply starts at the beginning with
    // their facts intact, which is recoverable; an unknown step is not.
    const steps = kept.stack.filter((v): v is Step => KNOWN_STEPS.has(v as Step));
    if (steps.length > 0 && steps[steps.length - 1] !== "received") setStack(steps);
  }, [initial]);
  /**
   * Write to the draft, from a patch or from the draft itself.
   *
   * The functional form exists because the family terms are NESTED objects. A
   * patch built from the closed-over draft reads the value as it was at render
   * time, so two writes to `serviceTerms` in one tick both start from the same
   * stale copy and the second silently discards the first: tapping four cargo
   * types quickly left one, and typing a scope then tapping an engagement type
   * left the engagement and lost the scope. Every nested write below goes
   * through the updater, which always sees the current draft.
   */
  const set: SetDraft = (patch) =>
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
  const go = (s: Step) => setStack((st) => [...st, s]);
  const replace = (s: Step) => setStack((st) => [...st.slice(0, -1), s]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));

  // Leaving the composer for the home page must not silently discard a part-
  // built record. The draft is "dirty" only once the member has entered
  // something beyond the family/intent they picked on the way in, and never
  // after a successful submit (received) or on the error acknowledgement.
  const dirty = step !== "received" && step !== "error" && structureDirty(draft);

  /*
    Keeping it, as it is built.
    ---------------------------
    Written on every change rather than on a timer: the whole point is to
    survive the events nobody gets a callback for, and a timer loses whatever
    happened since it last ran.

    `received` and `error` clear it instead. On `received` the record is on the
    server and a second copy on the device would be the stale one; on `error`
    the member is about to retry from the same state, which is still in memory.
    A draft that is not dirty is not kept either: a bare family choice is not
    work, and offering it back would be noise.
  */
  useEffect(() => {
    if (step === "received") {
      forgetDraft();
      return;
    }
    if (step === "error") return;
    if (!structureDirty(draft)) return;
    keepDraft(draft, stack);
  }, [draft, stack, step]);
  const { guard, promptOpen, onContinueEditing, leaveNow } = useUnsavedGuard(dirty);

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
      const outcomes: SubmitOutcome[] = [];
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
        // Scoped to the iteration, and only read inside it. The hotfix for
        // PR #74 had to hoist this because the outcome block below read it
        // after the loop; collecting outcomes per response removes that need.
        const body: Record<string, unknown> = await res.json().catch(() => ({}));
        if (!res.ok) {
          // The member is told something reassuring and true, and the reason is
          // put where it can be read. Until now a refusal left NOTHING behind:
          // no status, no field, no message, so a submission that failed for
          // every member for two days looked identical to a dropped connection.
          console.error(
            `[ponte] submit refused (${res.status})`,
            body.error ?? body,
            body.field ? `field: ${body.field}` : "",
          );
          replace("error");
          return;
        }
        if (typeof body.ref === "string") refs.push(body.ref);
        outcomes.push({
          status: typeof body.status === "string" ? body.status : "submitted",
          blockingIssues: Array.isArray(body.blockingIssues) ? body.blockingIssues : [],
          completenessScore:
            typeof body.completenessScore === "number" ? body.completenessScore : null,
          route:
            body.route === "verification" || body.route === "both" ? body.route : "listing",
        });
      }
      setResultRef(refs.join(", "));
      setSavedDraft(asDraft);
      // The outcome is already decided by the time this resolves: automated
      // publication runs inside the request. So the member is told what
      // actually happened rather than "submitted for review", which under this
      // model would be untrue for the ordinary case.
      setOutcome(asDraft ? null : summariseOutcomes(outcomes));
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
          // A labelled control, not a bare arrow: the previous step in words.
          // Back within the composer never loses work, so it is not guarded.
          <JourneyBack onClick={back} label={t("bar.back")} />
        ) : step === "received" && stack.length > 1 ? (
          /*
            The final screen had NO back control, only the wordmark, which goes
            to the entrance. The owner pressed it and said: "it goes back to my
            home page. So I've lost everything. That is absurd. Maybe I want to
            edit. I want to change what I put there."

            Nothing was actually lost - the record is on the server - but
            nothing on the screen said so, and there was no way to look at it
            again. Back returns to the record, which is what the word means
            everywhere else in this composer.
          */
          <JourneyBack onClick={back} label={t("bar.back")} />
        ) : (
          /*
            STEP ONE, and the bar used to be the wordmark alone.

            The wordmark IS a control - a guarded button that goes home - but it
            does not look like one and it does not mean "back". So the intake
            screen read as a room with no door: the design director walked it on
            2 August 2026 and reported that once you are in the flow there is no
            way out except the browser's own control.

            Both are shown now. Back names where it goes, resolved on the server
            from `?from=` against an allowlist, and it is guarded exactly as the
            wordmark is. Nothing is lost by taking it: the composer writes the
            draft to the device on every change and restores it on return, so
            leaving and coming back brings the record with you.
          */
          <>
            <JourneyBack onClick={() => guard(() => router.push(exit.href))} label={exit.label} />
            <button
              type="button"
              className="sbar__title serif"
              aria-label={t("bar.home")}
              onClick={() => guard(() => router.push("/"))}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
            >
              Ponte<span style={{ color: "var(--ink-3)", fontFamily: "var(--f-mono)", fontSize: 12 }}>.trade</span>
            </button>
          </>
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
            set={set}
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
            onListing={() => router.push(`/find/o/${resultRef}`)}
            /* "Complete your listing" goes to the member's OWN records, never
               to the public board. A record that is `needs_information` or
               `flagged` is by definition not published, so /find would not
               contain the very record the button just offered to complete. The
               obsidian board is retired (cutover PR 5) and /opportunities is
               where a member's own records live and are reopened. */
            onEdit={() => router.push("/opportunities")}
            onVerify={() => router.push("/verify?for=business")}
            t={t}
          />
        )}
        {step === "error" && <ErrorStep onRetry={() => replace("submit")} t={t} />}
      </div>

      <footer className="ffoot">{t("trust")}</footer>

      <AccountGate open={gateOpen} context="publish" onClose={() => setGateOpen(false)} onComplete={onGateComplete} />

      <UnsavedChangesDialog
        open={promptOpen}
        onContinueEditing={onContinueEditing}
        onLeave={leaveNow}
        t={tj}
      />
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

// ---- S01 intent -> product -------------------------------------------------
// `set` is the composer's own SetDraft, not the narrow patch-only form. It has
// to be: this step hands it to ClassifyStep, whose specialisation clean-up
// after a category change reads the CURRENT draft through the functional form.
function IntentStep({ draft, set, icons, onNext, t }: { draft: StructureDraft; set: SetDraft; icons: CategoryIconMap; onNext: () => void; t: T }) {
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
  //
  // It may only own the heading once the member has SAID what they are doing.
  // Before that this handed the screen to the intake's "Tell Ponte what you
  // supply, in your own words." - an answer, printed above the question, to a
  // question nobody had answered - and it suppressed "What do you want to do?",
  // which is the actual heading of the actual step. A visitor who then pressed
  // "Source a product" saw a heading that had been wrong before they chose and
  // was still wrong after.
  const stated = draft.canonical !== null || draft.intent !== null;
  const intakeOwnsHeading = classify && !draft.product && stated;

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
              {/*
                The chosen row says so in a word.

                It already carried two non-colour signals - a gold rule at the
                left edge and the title in gold ink - and they were still
                missed: the design director walked this screen on 2 August 2026
                and reported the options as giving no feedback at all. Part of
                that was the heading contradicting the choice, fixed above. The
                rest is that a 3px rule at the far left of a 640px row is a
                long way from the thing that was pressed.

                `aria-hidden`, because `aria-pressed` on the row already tells
                assistive technology the same thing and saying it twice is
                noise. This is for the eye that scanned past the rule.
              */}
              {draft.intent === it.key ? (
                <span className="tapopt__on" aria-hidden="true">
                  {t("classify.chosen")}
                </span>
              ) : null}
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
              /*
                THE INTENT THE MEMBER CHOSE, from whichever of the two pickers
                they used.

                This read `draft.canonical` alone, which is only ever set by a
                family entrance. A member who came in with no entrance and
                chose "Source a product" from the three rows above set
                `draft.intent`, not `draft.canonical` - so this fell through to
                `offer_product` and the screen answered a buyer with "Tell
                Ponte what you SUPPLY, in your own words."

                Choosing an option and watching the heading contradict you is
                worse than no feedback at all: it reads as the tap not having
                registered. The design director filed it on 2 August 2026 as
                the option giving no feedback, which is exactly how it looks.
              */
              intent={sourcingProduct(draft) ? "source_product" : "offer_product"}
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
              {/* Wrapped so the row is two flex items rather than an anonymous
                  text item and a span: Issue #130 Stage 2 made this a row. */}
              <span>{c.chapter_title}</span><span className="hstile__n">{c.chapter}</span>
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
/**
 * The Task Completion Bridge for the record being built (ADR-0016), bound to the
 * pure completion binder. It is a read-only signal of how complete the record
 * is; it renders the neutral null state until the first required field is filled,
 * and advances as applicable commercial detail is added. Same component and
 * value on every step that shows it, so the percentage never disagrees with
 * itself across the journey.
 */
function CompletionBridge({ draft }: { draft: StructureDraft }) {
  const value = completionValue(draft);
  return (
    <TaskCompletionBridge
      value={value}
      band={value === null ? "" : completionBandLabel(value)}
      abutments={{ left: "Started", right: "Ready to submit" }}
      neutralLabel="Progress appears once you add the first commercial detail."
      ariaLabel="How complete this record is"
    />
  );
}

function FactsStep({ draft, onComplete, onAdd, t }: { draft: StructureDraft; onComplete: () => void; onAdd: (f: CompletionField) => void; t: T }) {
  const b = bucketize(draft);
  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("facts.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("facts.reward", { facts: b.commercial.length, gaps: b.missing.length })}</h1>
      <CompletionBridge draft={draft} />

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
function CompleteStep({ draft, set, fields, onDone, t }: { draft: StructureDraft; set: SetDraft; fields: CompletionField[] | null; onDone: () => void; t: T }) {
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
      {!editing && <CompletionBridge draft={draft} />}
      {!editing && (
        <div className="readiness" style={{ margin: "12px 0 20px" }}>
          <div className="readiness__track"><div className="readiness__fill" style={{ width: `${(i / total) * 100}%` }} /></div>
          <span className="readiness__label">{t("complete.remaining", { n: total - i })}</span>
        </div>
      )}
      <div className="qwrap">
        <h2 className="q serif">{t(askKeyFor(field, draft))}</h2>
        <CompletionControl field={field} draft={draft} set={set} t={t} />
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

/** Single choice from a taxonomy, stored as its stable key. */
function KeyChips({ options, value, onPick }: { options: readonly CategoryOption[]; value: string | null; onPick: (key: string | null) => void }) {
  return (
    <div className="chiprow">
      {options.map((o) => (
        <button
          key={o.key}
          className="fchip fchip--two"
          aria-pressed={value === o.key}
          // Tapping the chosen option again withdraws it. Without this a member
          // who picked the wrong basis had no way back to having stated none,
          // and Ponte would carry an answer they had disowned.
          onClick={() => onPick(value === o.key ? null : o.key)}
        >
          <span className="fchip__t">{o.label}</span>
          {o.description && <span className="fchip__d">{o.description}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Multiple choice from a taxonomy, stored as stable keys.
 *
 * Reports the key that was tapped rather than the resulting array. Computing
 * the array here would compute it from `values` as rendered, so two taps before
 * the next render would both start from the same list and the second would
 * discard the first. `toggleKey` in the caller applies each tap to the draft as
 * it actually is.
 */
function KeyChipsMulti({ options, values, onToggle }: { options: readonly CategoryOption[]; values: readonly string[]; onToggle: (key: string) => void }) {
  return (
    <div className="chiprow">
      {options.map((o) => (
        <button
          key={o.key}
          className="fchip fchip--two"
          aria-pressed={values.indexOf(o.key) >= 0}
          onClick={() => onToggle(o.key)}
        >
          <span className="fchip__t">{o.label}</span>
          {o.description && <span className="fchip__d">{o.description}</span>}
        </button>
      ))}
    </div>
  );
}

/** A list of countries, added one at a time and removable. */
function CountryList({ codes, onAdd, onRemove, t }: { codes: readonly string[]; onAdd: (code: string) => void; onRemove: (code: string) => void; t: T }) {
  return (
    <div>
      <CountryPicker value="" onChange={(code) => { if (code) onAdd(code); }} />
      {codes.length > 0 && (
        <div className="pcat-terr">
          {codes.map((code) => (
            <span className="pcat-terr__i" key={code}>
              {nameForCode(code)}
              <button
                className="pcat-terr__x"
                type="button"
                aria-label={`${t("classify.remove")} ${code}`}
                onClick={() => onRemove(code)}
              >
                {t("classify.remove")}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A labelled free-text answer, for the facts no closed list can hold. */
function LongText({ id, label, placeholder, value, onChange }: { id: string; label: string | null; placeholder: string; value: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <label className="pcat__writel" htmlFor={id}>{label}</label>}
      <textarea
        id={id}
        className="snote"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * One control per fact, selected by the field the family's procedure asked for.
 *
 * The control this replaces handled exactly eight fields, all of them product
 * fields, which is why a trade service reaching the completion step could only
 * ever be asked a product question. The switch is still a switch: a field has
 * one right control and a lookup table would only hide that: but which fields
 * ever reach it is decided by the procedure, not here.
 */
function CompletionControl({ field, draft, set, t }: { field: CompletionField; draft: StructureDraft; set: SetDraft; t: T }) {
  // Every nested write goes through the updater form, so a second tap in the
  // same tick starts from the draft the first tap produced.
  const service = (patch: Partial<ServiceTerms> | ((terms: ServiceTerms) => Partial<ServiceTerms>)) =>
    set((d) => ({
      serviceTerms: { ...d.serviceTerms, ...(typeof patch === "function" ? patch(d.serviceTerms) : patch) },
    }));
  const distribution = (
    patch: Partial<DistributionTerms> | ((terms: DistributionTerms) => Partial<DistributionTerms>),
  ) =>
    set((d) => ({
      distributionTerms: {
        ...d.distributionTerms,
        ...(typeof patch === "function" ? patch(d.distributionTerms) : patch),
      },
    }));
  const toggleKey = (list: readonly string[], key: string): string[] =>
    list.indexOf(key) >= 0 ? list.filter((k) => k !== key) : list.concat([key]);

  switch (field) {
    // ---- Products ---------------------------------------------------------
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

    // ---- Trade services ---------------------------------------------------
    case "serviceScope":
      // One question, one control. The engagement chips used to sit under this
      // box, and they were the only thing on the screen that could be tapped:
      // a member answered them, pressed Save, and their scope was still not
      // stated. Engagement is its own step now.
      return (
        <LongText
          id="service-scope"
          label={null}
          placeholder={t("ask.serviceScopePlaceholder")}
          value={draft.serviceTerms.scope}
          onChange={(v) => service({ scope: v })}
        />
      );
    case "serviceEngagement":
      return (
        <KeyChips
          options={SERVICE_ENGAGEMENT_TYPES}
          value={draft.serviceTerms.engagement}
          onPick={(key) => service({ engagement: key })}
        />
      );
    case "serviceCoverage":
      // Countries, a corridor, or both. A remote advisory service covering no
      // fixed territory answers with the lanes field rather than being made to
      // invent a country list.
      return (
        <div className="qty">
          <CountryList
            codes={draft.serviceTerms.coverageCountries}
            onAdd={(code) => service((terms) => ({
              coverageCountries: terms.coverageCountries.indexOf(code) >= 0
                ? terms.coverageCountries
                : terms.coverageCountries.concat([code]),
            }))}
            onRemove={(code) => service((terms) => ({
              coverageCountries: terms.coverageCountries.filter((c) => c !== code),
            }))}
            t={t}
          />
          <LongText
            id="service-lanes"
            label={t("ask.serviceTradeLanes")}
            placeholder={t("ask.serviceTradeLanesPlaceholder")}
            value={draft.serviceTerms.tradeLanes}
            onChange={(v) => service({ tradeLanes: v })}
          />
        </div>
      );
    case "serviceSpecialisation":
      // Conditioned by category: a forwarder is asked about modes and cargo, a
      // customs broker about regimes, a certifier about schemes. A category
      // with no dimension never reaches this control at all.
      return (
        <div className="tapgroups">
          {specialisationGroupsFor(draft.serviceCategory).map((group) => (
            <div className="tapgroup" key={group.key}>
              <div className="tapgroup__l">{group.label}</div>
              <KeyChipsMulti
                options={group.options}
                values={draft.serviceTerms.specialisationKeys}
                onToggle={(key) => service((terms) => ({
                  specialisationKeys: toggleKey(terms.specialisationKeys, key),
                }))}
              />
            </div>
          ))}
        </div>
      );
    case "serviceCapability":
      // Capacity, in the member's own words, and never in the quantity field.
      // "Up to 40 containers per month" describes a service's throughput; the
      // same figure stored as a quantity would read on the board as 40
      // containers of goods for sale.
      return (
        <LongText
          id="service-capability"
          label={null}
          placeholder={t(
            draft.canonical?.intent === "seek_trade_service"
              ? "ask.serviceCapabilityNeededPlaceholder"
              : "ask.serviceCapabilityPlaceholder",
          )}
          value={draft.serviceTerms.capability}
          onChange={(v) => service({ capability: v })}
        />
      );
    case "servicePricingBasis":
      return <KeyChips options={SERVICE_PRICING_BASES} value={draft.serviceTerms.pricingBasis} onPick={(key) => service({ pricingBasis: key })} />;
    case "serviceAvailability":
      return <KeyChips options={SERVICE_AVAILABILITY} value={draft.serviceTerms.availability} onPick={(key) => service({ availability: key })} />;

    // ---- Distribution and representation -----------------------------------
    case "distributionObjective":
      return (
        <LongText
          id="distribution-objective"
          label={null}
          placeholder={t(
            draft.canonical?.intent === "seek_brands_or_products_to_represent"
              ? "ask.distributionObjectiveRepresentPlaceholder"
              : "ask.distributionObjectivePlaceholder",
          )}
          value={draft.distributionTerms.objective}
          onChange={(v) => distribution({ objective: v })}
        />
      );
    case "distributionProductScope":
      return (
        <LongText
          id="distribution-scope"
          label={null}
          placeholder={t("ask.distributionProductScopePlaceholder")}
          value={draft.distributionTerms.productScope}
          onChange={(v) => distribution({ productScope: v })}
        />
      );
    case "distributionChannels":
      return <KeyChipsMulti options={DISTRIBUTION_CHANNELS} values={draft.distributionTerms.channelKeys} onToggle={(key) => distribution((terms) => ({ channelKeys: toggleKey(terms.channelKeys, key) }))} />;
    case "distributionCapabilities":
      return <KeyChipsMulti options={DISTRIBUTION_CAPABILITIES} values={draft.distributionTerms.capabilityKeys} onToggle={(key) => distribution((terms) => ({ capabilityKeys: toggleKey(terms.capabilityKeys, key) }))} />;
    case "distributionExpectations":
      // Labelled as an expectation of a relationship. An opening order stated
      // here is a term of the arrangement, never a shipped quantity.
      return (
        <LongText
          id="distribution-expectations"
          label={null}
          placeholder={t(
            statesOwnCapability(draft)
              ? "ask.distributionExpectationsOfferedPlaceholder"
              : "ask.distributionExpectationsPlaceholder",
          )}
          value={draft.distributionTerms.commercialExpectations}
          onChange={(v) => distribution({ commercialExpectations: v })}
        />
      );
    case "distributionTiming":
      return <KeyChips options={DISTRIBUTION_TIMING} value={draft.distributionTerms.timing} onPick={(key) => distribution({ timing: key })} />;

    // ---- Shared by every family --------------------------------------------
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
      // The roles this family can actually hold. One combined list showed a
      // freight forwarder "Grower / farmer" and "End buyer" as answers to
      // "What is your role?".
      return <ChipGroups groups={roleGroupsFor(draft)} value={draft.role} onPick={(v) => set({ role: v })} />;
    case "note":
      return <textarea className="snote" placeholder={t("ask.notePlaceholder")} value={draft.note ?? ""} onChange={(e) => set({ note: e.target.value })} />;
  }
}

// ---- S04 public / private / reviewer --------------------------------------

/**
 * The record as it reads back, rendered from the family's own review model.
 *
 * The step this replaces printed HS code, quantity, frequency, route, Incoterm
 * and validity unconditionally, for every family, after the family-specific
 * classification rows. A freight forwarder reviewing their own listing was
 * shown five product facts, all of them "Not stated", and had no way to read
 * that as anything but a record they had failed to finish.
 *
 * The rows are now generated, not filtered. There is no Incoterm row on a trade
 * service review because the services procedure never emits one: the guarantee
 * holds at model level, where a CSS rule or a truthy check could not put it.
 */
function PreviewStep({ draft, onNext, onEdit, t }: { draft: StructureDraft; onNext: () => void; onEdit: (f: CompletionField) => void; t: T }) {
  const [tab, setTab] = useState<"public" | "private" | "reviewer">("public");
  const model: ReviewModel = procedureFor(draft).reviewModel(draft);
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

  // A row whose meaning lives in the copy resolves it here: "Ships from
  // Argentina" is what the member said, and a bare "Argentina" under Route
  // would read as a corridor with a missing half.
  const valueOf = (r: ReviewSection["rows"][number]): string | null =>
    r.message ? t(r.message.key, r.message.params) : r.value;

  const section = (s: ReviewSection) => (
    <div key={s.key}>
      {s.headingKey && <div className="bucket__l">{t(`review.${s.headingKey}`)}</div>}
      <div className="ledger2">
        {s.rows.map((r) => row(t(`field.${r.labelKey}`), valueOf(r), r.editField))}
      </div>
    </div>
  );

  const kind = draft.canonical
    ? MARKET_INTENTS.find((i) => i.key === draft.canonical!.intent)?.label ?? null
    : draft.intent === "offer" ? t("intent.sell")
    : draft.intent === "service" ? t("intent.service")
    : t("intent.buy");

  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("preview.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t(`review.${model.titleKey}`)}</h1>
      <CompletionBridge draft={draft} />
      <div className="tabs2" role="tablist">
        {(["public", "private", "reviewer"] as const).map((x) => (
          <button key={x} className="tab2" role="tab" aria-selected={tab === x} onClick={() => setTab(x)}>{t(`preview.${x}`)}</button>
        ))}
      </div>

      {tab === "public" && (
        <div>
          <p className="pv__note">{t("preview.publicNote")}</p>
          <div className="ledger2">{row(t("field.kind"), kind)}</div>
          {model.publicSections.map(section)}
        </div>
      )}
      {tab === "private" && (
        <div>
          <p className="pv__note">{t("preview.privateNote")}</p>
          <div className="ledger2">
            {row(t("private.identity"), t("preview.reviewerOnly"))}
            {row(t("private.contact"), t("preview.withheld"))}
          </div>
          {model.privateSections.map(section)}
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

// ---- S05 save / submit -----------------------------------------------------
function SubmitStep({ draft, set, submitting, onSubmit, onSaveDraft, onResolve, onVerify, t }: { draft: StructureDraft; set: SetDraft; submitting: boolean; onSubmit: () => void; onSaveDraft: () => void; onResolve: (f: CompletionField) => void; onVerify: () => void; t: T }) {
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
                which landed on the same summary and changed nothing.

                The field is carried on the blocker rather than inferred from
                its key, because the two are no longer the same thing: a
                distribution record's territory blocker is resolved in the
                category step, not the completion step, and it says so by
                carrying no field at all. */}
            {b.resolve === "complete" && b.field && (
              <button className="block__r" onClick={() => onResolve(b.field as CompletionField)}>{t("submit.resolve")} →</button>
            )}
            {b.resolve === "verify" && (
              <button className="block__r" onClick={onVerify}>{t("submit.verifyNow")} →</button>
            )}
            {/* The declaration resolves in place: the terms are right here and
                accepting them is the whole action. Sending the member somewhere
                else to agree to five sentences would be theatre. */}
            {b.resolve === "declare" && (
              <Declaration draft={draft} set={set} t={t} />
            )}
          </div>
        ))}
        {/* Once accepted the blocker is gone, so the acceptance would vanish
            with it. It stays visible and reversible: a member must be able to
            see what they agreed to, and to withdraw it before submitting. */}
        {draft.declarationAccepted && <Declaration draft={draft} set={set} t={t} />}
      </div>
      <div className="submit-cta">
        <button className="fbtn fbtn--lg fbtn--block" disabled={submitting} onClick={onSubmit}>{t("submit.submit")}</button>
        <button className="fbtn fbtn--ghost fbtn--block" disabled={submitting} onClick={onSaveDraft}>{t("submit.saveDraft")}</button>
      </div>
    </section>
  );
}

/**
 * The publication declaration, in the exact words the validator requires.
 *
 * The terms come from `lib/listings/declaration.ts`, which is also what
 * `evaluateListing` reads, so the screen cannot show one set of terms while the
 * rule enforces another. Accepting stamps a boolean on the draft; the submit
 * route converts it to a timestamp AND the accepted version, because knowing
 * somebody agreed is worthless without knowing to what.
 */
function Declaration({ draft, set, t }: { draft: StructureDraft; set: SetDraft; t: T }) {
  return (
    <div className="declare">
      <ul className="declare__l">
        {DECLARATION_TERMS.map((term) => <li key={term}>{term}</li>)}
      </ul>
      <label className="declare__c">
        <input
          type="checkbox"
          checked={draft.declarationAccepted}
          onChange={(e) => set({ declarationAccepted: e.target.checked })}
        />
        <span>{t("submit.declarationAccept")}</span>
      </label>
    </div>
  );
}

// ---- S06 received ----------------------------------------------------------

/** What the submit route reported back. Null for a saved draft. */
export type SubmitOutcome = {
  status: string;
  blockingIssues: string[];
  completenessScore: number | null;
  /**
   * Where the member resolves the blocking issues.
   *
   * "verification" means every blocker is at /verify and NONE of them is on the
   * listing form. Sending that member to the composer is a dead end: there is
   * nothing there they can change to publish.
   */
  route: "verification" | "listing" | "both";
};

/**
 * One outcome from several, for a multi-product document split into separate
 * records.
 *
 * The member made one submission and must be told one truthful thing about it.
 * Every rule here is "the weakest record decides", because the alternatives all
 * overstate:
 *
 *   status            the worst wins. Telling somebody their offer is live when
 *                     one of three records was held is false for that record,
 *                     and they would never go looking for it.
 *   blockingIssues    the union, deduplicated. A gap on any record is a gap the
 *                     member has to close.
 *   completenessScore the lowest. An average lets a full record hide a thin one.
 *   route             where the outstanding work actually is. A mix of
 *                     verification and listing issues is "both", because
 *                     sending the member to either alone strands the other.
 */
function summariseOutcomes(outcomes: readonly SubmitOutcome[]): SubmitOutcome | null {
  if (outcomes.length === 0) return null;

  const RANK: Record<string, number> = {
    approved: 0, submitted: 1, needs_information: 2, flagged: 3,
  };
  const status = outcomes.reduce(
    (worst, o) => ((RANK[o.status] ?? 1) > (RANK[worst] ?? 1) ? o.status : worst),
    outcomes[0].status,
  );

  const blockingIssues: string[] = [];
  for (const o of outcomes) {
    for (const issue of o.blockingIssues) {
      if (blockingIssues.indexOf(issue) < 0) blockingIssues.push(issue);
    }
  }

  const scores = outcomes
    .map((o) => o.completenessScore)
    .filter((n): n is number => typeof n === "number");
  const completenessScore = scores.length > 0 ? Math.min(...scores) : null;

  const routes = new Set(outcomes.filter((o) => o.blockingIssues.length > 0).map((o) => o.route));
  const route: SubmitOutcome["route"] =
    routes.has("both") || routes.size > 1
      ? "both"
      : routes.has("verification")
        ? "verification"
        : "listing";

  return { status, blockingIssues, completenessScore, route };
}

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
function ReceivedStep({ savedDraft, resultRef, outcome, onWorkspace, onListing, onEdit, onVerify, t }: {
  savedDraft: boolean;
  resultRef: string;
  outcome: SubmitOutcome | null;
  onWorkspace: () => void;
  onListing: () => void;
  onEdit: () => void;
  onVerify: () => void;
  t: T;
}) {
  const status = savedDraft ? "draft" : outcome?.status ?? "submitted";
  const published = status === "approved";
  const needsInfo = status === "needs_information";
  const flagged = status === "flagged";

  // Verification is the one blocker a member cannot resolve on the listing
  // form, and in practice the most likely one: the 26 July probe recorded zero
  // members with a passing bound member-business verification. When it is the
  // ONLY blocker the screen says so, because "a few required details are
  // missing" is false when the listing itself is complete.
  const verifyOnly = needsInfo && outcome?.route === "verification";

  const title = savedDraft ? t("received.draftTitle")
    : published ? t("received.publishedTitle")
    : verifyOnly ? t("received.verifyOnlyTitle")
    : needsInfo ? t("received.needsInfoTitle")
    : flagged ? t("received.flaggedTitle")
    : t("received.title");

  const body = savedDraft ? t("received.draftBody")
    : published ? t("received.publishedBody")
    : verifyOnly ? t("received.verifyOnlyBody")
    : needsInfo ? t("received.needsInfoBody")
    : flagged ? t("received.flaggedBody")
    : t("received.body");

  const eyebrow = savedDraft ? t("received.savedEyebrow")
    : published ? t("received.publishedEyebrow")
    : verifyOnly ? t("received.verifyOnlyEyebrow")
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
        {/* The primary action goes where the work is. */}
        {verifyOnly && <button className="fbtn fbtn--lg" onClick={onVerify}>{t("received.verifyBusiness")}</button>}
        {needsInfo && !verifyOnly && <button className="fbtn fbtn--lg" onClick={onEdit}>{t("received.completeListing")}</button>}
        {needsInfo && outcome?.route === "both" && (
          <button className="fbtn fbtn--ghost" onClick={onVerify}>{t("received.verifyBusiness")}</button>
        )}
        {flagged && <button className="fbtn fbtn--lg" onClick={onEdit}>{t("received.completeListing")}</button>}
        <button className={published || needsInfo || flagged ? "fbtn fbtn--ghost" : "fbtn fbtn--lg"} onClick={onWorkspace}>
          {t("received.cta")}
        </button>
      </div>

      {published && <p className="rec-note">{t("received.publishedDisclaimer")}</p>}
      {verifyOnly && <p className="rec-note">{t("received.verifyOnlyNote")}</p>}
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
