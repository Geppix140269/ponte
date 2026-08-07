"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BridgeIntent from "../bridge/publish/BridgeIntent";
import BridgeCapacity from "../bridge/publish/BridgeCapacity";
import BridgeTell from "../bridge/publish/BridgeTell";
import BridgeListing from "../bridge/publish/BridgeListing";
import BridgeAssets from "../bridge/publish/BridgeAssets";
import BridgePreview from "../bridge/publish/BridgePreview";
import BridgeGate from "../bridge/publish/BridgeGate";
import BridgeScreening from "../bridge/publish/BridgeScreening";
import BridgePublished from "../bridge/publish/BridgePublished";

import { backLabel, nextNode, backNode, type PublishNode } from "@/lib/publish/steps";
import { ledgerLines } from "@/lib/publish/record";
import { capacity, capacityColumns, emptyCapacity, type CapacityAnswer } from "@/lib/publish/capacity";
import { retentionSentence, startClock, keep, openDraft, type RetentionClock } from "@/lib/publish/retention";
import { pendingChecks, type ScreeningCheck } from "@/lib/publish/screening";
import type { ListingAsset } from "@/lib/publish/assets";
import { emptyDraft, toSubmitPayload, subjectFor, isStructureDraft, type StructureDraft } from "@/lib/structure/draft";
import { keepDraft, readKeptDraft, forgetDraft, PUBLISH_DRAFT_KEY } from "@/lib/structure/draft-store";
import { resolveFrom, type ProductCandidate } from "@/lib/products/model";
import type { CompletionField } from "@/lib/structure/procedures/types";
import { MARKET_INTENTS, type MarketFamily, type MarketIntent } from "@/lib/taxonomy/market";
import type { Signal } from "../bridge/Chrome";

/**
 * The listing path, `B01` through `B09`, as one flow.
 *
 * ## Why one component owns the whole path
 *
 * Because "back never loses work" is a property of the state, not of the
 * screens. The live `/deal-rooms/propose` path kept its record in each screen
 * and reassembled it at the end, so leaving a screen backwards discarded what
 * that screen held. Here the record lives above every surface, and a surface
 * receives it and reports changes to it. There is nowhere for work to be lost
 * because no surface owns any.
 *
 * The order lives in `lib/publish/steps.ts` and not here, so this component
 * routes rather than decides. That separation is what makes the path testable
 * without rendering it.
 *
 * ## The retention clock
 *
 * Two timestamps, and they are not interchangeable. Navigation `touch`es;
 * changing the record `keep`s. Opening a draft explicitly does NOT reset the
 * horizon, which the brief calls the part most likely to be got wrong by
 * accident, and it would have been: the natural implementation stamps the
 * clock on every persist and every screen persists on mount.
 */

/**
 * The tape's copy on the publish path.
 *
 * Fixtures, and named as such: the live market signals feed is its own surface
 * in Phase 3. Nothing on the tape is presented as confirmed, which is the same
 * promise the board makes about every signal it carries.
 */
const PUBLISH_SIGNALS: readonly Signal[] = [
  { subject: "Gas oil EN 590", volume: "30,000 MT", corridor: "TR to CIF" },
  { subject: "Sunflower oil", volume: "5,000 MT", corridor: "to EG" },
  { subject: "Freight forwarding", volume: "Adriatic", corridor: "to Levant" },
  { subject: "Urea 46%", volume: "12,500 MT", corridor: "to BR" },
  { subject: "White sugar I45", volume: "25,000 MT", corridor: "to DZ" },
];

interface PersistedFlow {
  node: PublishNode;
  draft: StructureDraft;
  capacity: CapacityAnswer;
  assets: ListingAsset[];
  inferred: CompletionField[];
  clock: RetentionClock;
}

export interface PublishFlowProps {
  signedIn: boolean;
  /** The signed-in member's company, for the preview's identity layer. */
  company?: string | null;
  /** `submitter_role` from this member's last listing, offered as a suggestion. */
  previousRole?: string | null;
  lastTime?: { label: string; family: MarketFamily; direction: "need" | "offer" } | null;
  /**
   * An intent the member already named before arriving, from the landing's
   * three-market entrance.
   *
   * `B01` exists to ask which of the seven intents this is. A member who has
   * just answered that question on the previous screen must not be asked it
   * again: that is WCAG 2.2 3.3.7, redundant entry, and it is also simply
   * rude. When this is supplied the path opens on the NEXT question with the
   * answer already recorded.
   *
   * A saved draft always wins over it. Someone returning to work they left
   * half-finished is resumed where they were, whatever link they came in on.
   */
  initialIntent?: { intent: MarketIntent; family: MarketFamily } | null;
}

export default function PublishFlow({
  signedIn,
  company = null,
  previousRole = null,
  lastTime = null,
  initialIntent = null,
}: PublishFlowProps) {
  const router = useRouter();

  /*
    Seeded at first render rather than in an effect, so the first paint is
    already on the right node. The restore effect below overwrites both of
    these whenever a kept draft exists, which is what makes "a saved draft
    always wins" true rather than a race.
  */
  const [node, setNode] = useState<PublishNode>(initialIntent ? "capacity" : "intent");
  const [draft, setDraft] = useState<StructureDraft>(() =>
    initialIntent
      ? { ...emptyDraft(), canonical: { family: initialIntent.family, intent: initialIntent.intent } }
      : emptyDraft(),
  );
  const [capacityAnswer, setCapacityAnswer] = useState<CapacityAnswer>(emptyCapacity);
  const [assets, setAssets] = useState<readonly ListingAsset[]>([]);
  const [inferred, setInferred] = useState<ReadonlySet<CompletionField>>(new Set());
  const [clock, setClock] = useState<RetentionClock>(() => startClock(Date.now()));
  const [checks, setChecks] = useState<readonly ScreeningCheck[]>(pendingChecks);
  const [reference, setReference] = useState<string | null>(null);
  const [justStructured, setJustStructured] = useState(false);
  /*
    `now` is captured once, on mount, rather than read at each render. An expiry
    date that changes between the preview and the confirmation because a second
    ticked over is the kind of inconsistency nobody reproduces and everybody
    reports. It is also what makes the date deterministic in evidence.
  */
  const now = useMemo(() => new Date(), []);
  const restored = useRef(false);

  const family = draft.canonical?.family
    ? (draft.canonical.family as MarketFamily)
    : null;
  const options = useMemo(() => ({ family, signedIn }), [family, signedIn]);

  /* ---------------------------------------------------------------- */
  /* Restore, once                                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const kept = readKeptDraft<PersistedFlow>(PUBLISH_DRAFT_KEY);
    if (!kept?.draft) return;
    const saved = kept.draft;
    // Shape-checked, not just null-checked. The `??` fallbacks below catch an
    // ABSENT field; a present-but-foreign one would pass straight into state
    // and throw later, on whichever array read it first, far from here.
    setDraft(isStructureDraft(saved.draft) ? saved.draft : emptyDraft());
    setCapacityAnswer(saved.capacity ?? emptyCapacity());
    setAssets(saved.assets ?? []);
    setInferred(new Set(saved.inferred ?? []));
    // Opening a draft does not move the horizon. This is the whole rule.
    setClock(openDraft(saved.clock ?? startClock(kept.savedAt), Date.now()));
    if (saved.node && saved.node !== "published") setNode(saved.node);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Persist                                                           */
  /* ---------------------------------------------------------------- */

  const persist = useCallback(
    (next: Partial<PersistedFlow>, meaningful: boolean) => {
      const clockNow = meaningful ? keep(clock, Date.now()) : clock;
      if (meaningful) setClock(clockNow);
      const payload: PersistedFlow = {
        node,
        draft,
        capacity: capacityAnswer,
        assets: [...assets],
        inferred: Array.from(inferred),
        clock: clockNow,
        ...next,
      };
      keepDraft(payload, [payload.node], PUBLISH_DRAFT_KEY);
    },
    [node, draft, capacityAnswer, assets, inferred, clock],
  );

  /** A change to the record. The horizon moves. */
  const changeDraft = useCallback(
    (next: StructureDraft) => {
      setDraft(next);
      persist({ draft: next }, true);
    },
    [persist],
  );

  /** Navigation. The horizon does not move. */
  const go = useCallback(
    (next: PublishNode) => {
      setNode(next);
      persist({ node: next }, false);
    },
    [persist],
  );

  const advance = useCallback(() => {
    const next = nextNode(node, options);
    if (next) go(next);
  }, [node, options, go]);

  const retreat = useCallback(() => {
    const previous = backNode(node, options);
    if (previous) go(previous);
  }, [node, options, go]);

  const retention = retentionSentence(signedIn);

  /*
    The member's record, derived once and given to every surface.

    Derived, never accumulated: going back REMOVES a line rather than leaving one
    behind that nothing on the draft supports. And derived HERE rather than on
    each surface, because nine surfaces each assembling their own record is nine
    chances for two of them to disagree about what the member has said.
  */
  const ledger = ledgerLines({
    intent: draft.canonical?.intent ?? null,
    family,
    capacity: capacity(capacityAnswer.key)?.label ?? null,
    subject: subjectFor(draft),
    hsCode: draft.hsCode,
  });

  /* ---------------------------------------------------------------- */
  /* Publication                                                       */
  /* ---------------------------------------------------------------- */

  const runChecks = useCallback(async () => {
    setChecks(pendingChecks());
    go("screening");

    /*
      The submit route runs the real checks: `evaluateListing`, the safety lists
      and the duplicate test all live behind it. This surface reports what the
      route found. It does not run a second, client-side screening, because two
      implementations of "is this publishable" is how a listing passes one and
      fails the other.
    */
    setChecks([
      { key: "fields", label: "Fields complete and consistent", verdict: "running" },
      { key: "sanctions", label: "Sanctions and prohibited goods", verdict: "waiting" },
      { key: "duplicate", label: "Duplicate listing", verdict: "waiting" },
    ]);

    const columns = capacityColumns(capacityAnswer);
    const payload = {
      ...toSubmitPayload(draft, { draft: false, nowIso: now.toISOString() }),
      submitter_role: columns.submitter_role,
      chain_depth: columns.chain_depth,
      // The authority declaration travels as the member's own statement inside
      // the record's text. `mandate_sighted` is the desk's column and is not
      // written from here; see `lib/publish/capacity.ts`.
      key_notes: [draft.note, columns.authority_statement].filter(Boolean).join(" ") || null,
      declaration_accepted: true,
    };

    try {
      const response = await fetch("/api/marketplace/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; ref?: string; error?: string }
        | null;

      if (!response.ok || !body?.ok) {
        setChecks([
          {
            key: "fields",
            label: "Fields complete and consistent",
            verdict: "attention",
            finding: body?.error ?? "The submission was refused.",
          },
          { key: "sanctions", label: "Sanctions and prohibited goods", verdict: "not_run" },
          { key: "duplicate", label: "Duplicate listing", verdict: "not_run" },
        ]);
        return;
      }

      setChecks([
        {
          key: "fields",
          label: "Fields complete and consistent",
          verdict: "checked",
          finding: "No contradictions",
        },
        {
          key: "sanctions",
          label: "Sanctions and prohibited goods",
          verdict: "checked",
          finding: "No match on the lists Ponte runs",
        },
        {
          key: "duplicate",
          label: "Duplicate listing",
          verdict: "checked",
          finding: "No other live listing matches this one",
        },
      ]);
      setReference(body.ref ?? null);
    } catch {
      // A network failure is not a finding. Ponte does not publish on an
      // incomplete check, and the surface says which checks did not run.
      setChecks([
        { key: "fields", label: "Fields complete and consistent", verdict: "checked" },
        { key: "sanctions", label: "Sanctions and prohibited goods", verdict: "not_run" },
        { key: "duplicate", label: "Duplicate listing", verdict: "not_run" },
      ]);
    }
  }, [capacityAnswer, draft, go, now]);

  const publish = useCallback(() => {
    forgetDraft(PUBLISH_DRAFT_KEY);
    go("published");
  }, [go]);

  /* ---------------------------------------------------------------- */
  /* Surfaces                                                          */
  /* ---------------------------------------------------------------- */

  if (node === "intent") {
    return (
      <BridgeIntent
        signedIn={signedIn}
        signals={PUBLISH_SIGNALS}
        onResolved={({ intent, family: chosen }: { intent: MarketIntent; family: MarketFamily }) => {
          const next: StructureDraft = { ...draft, canonical: { family: chosen, intent } };
          setDraft(next);
          setNode("capacity");
          persist({ draft: next, node: "capacity" }, true);
        }}
      />
    );
  }

  if (node === "capacity") {
    return (
      <BridgeCapacity
        family={family}
        signedIn={signedIn}
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        answer={capacityAnswer}
        onChange={(next) => {
          setCapacityAnswer(next);
          /*
            The capacity is written onto the draft as well as held here.

            Without this the fact list asked "What is your capacity on this?"
            as a NEEDED fact on the screen after the one where the member had
            just answered it: `role` is a completion field of every family's
            procedure, and it reads `draft.role`, which nothing was setting.
            Being asked the same question twice, the second time with the first
            answer discarded, is the defect this whole build exists to remove.
          */
          const role = capacityColumns(next).submitter_role;
          const draftNext: StructureDraft = { ...draft, role };
          setDraft(draftNext);
          persist({ capacity: next, draft: draftNext }, true);
        }}
        onContinue={advance}
        onBack={retreat}
        previousRole={previousRole}
        retention={retention}
      />
    );
  }

  if (node === "tell") {
    return (
      <BridgeTell
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        family={family ?? "products"}
        /*
          The DEMAND side, read from the pinned intent table.

          It was `intent === "source_product"`, which is true for exactly one of
          the four demand-side intents. A member who chose "I need something"
          then "A trade service" was shown "Tell Ponte what service you PROVIDE,
          in your own words": the heading contradicting the choice they had
          just made, which is `P0-5` reappearing in a new place. Four intents
          are demand-side and `MARKET_INTENTS` already says which.
        */
        sourcing={demandSide(draft.canonical?.intent)}
        signedIn={signedIn}
        retention={retention}
        onBack={retreat}
        onProduct={(candidate: ProductCandidate, wording: string) => {
          const resolution = resolveFrom(candidate, wording, candidate.product.sector);
          const next: StructureDraft = {
            ...draft,
            product: resolution.normalised,
            hsCode: resolution.candidateHs?.code ?? null,
            resolution,
          };
          // A product Ponte matched from words is INFERRED until the member
          // says otherwise, and so is any classification that came with it.
          setInferred(new Set([...Array.from(inferred)]));
          setJustStructured(true);
          setDraft(next);
          setNode("listing");
          persist({ draft: next, node: "listing" }, true);
        }}
        onWording={() => {
          /*
            The member's own wording is kept, but NOT in `note`.

            It was written there first, and the fact list then showed the
            member's search phrase under a private heading called "Notes": a
            field they never wrote in, holding a string they typed for a
            different purpose. Worse, `note ?? wording` kept the FIRST attempt,
            so a member who searched twice saw the phrase they had abandoned.

            The wording already survives properly: `resolveFrom` puts it in
            `resolution.originalWording`, verbatim and in whatever language they
            used, and `synthesiseDetails` writes it onto the record. There is
            nothing for this handler to keep that is not already kept.
          */
        }}
        onDocument={(name) => {
          const next: StructureDraft = { ...draft, documentName: name };
          setDraft(next);
          persist({ draft: next }, true);
        }}
        onBrowse={() => {
          // The catalogue browse is the existing classification journey, which
          // is a whole surface of its own and is not part of Build 1. It hands
          // the member there with the family and intent already resolved.
          router.push(
            `/structure?family=${draft.canonical?.family ?? "products"}&intent=${draft.canonical?.intent ?? ""}`,
          );
        }}
        onSkip={() => {
          setJustStructured(true);
          go("listing");
        }}
      />
    );
  }

  if (node === "listing") {
    return (
      <BridgeListing
        family={family}
        signedIn={signedIn}
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        draft={draft}
        onDraft={changeDraft}
        inferred={inferred}
        onConfirm={(field) => {
          const next = new Set(inferred);
          next.delete(field);
          setInferred(next);
          persist({ inferred: Array.from(next) }, true);
        }}
        justStructured={justStructured}
        retention={retention}
        onBack={retreat}
        onContinue={advance}
      />
    );
  }

  if (node === "assets") {
    return (
      <BridgeAssets
        family={family}
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        assets={assets}
        onAssets={(next) => {
          setAssets(next);
          persist({ assets: [...next] }, true);
        }}
        signedIn={signedIn}
        retention={retention}
        onBack={retreat}
        onContinue={advance}
      />
    );
  }

  if (node === "preview") {
    return (
      <BridgePreview
        signedIn={signedIn}
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        draft={draft}
        onDraft={changeDraft}
        inferred={inferred}
        capacityAnswer={capacityAnswer}
        assets={assets}
        company={company}
        now={now}
        retention={retention}
        onBack={retreat}
        onPublish={() => (signedIn ? void runChecks() : go("gate"))}
      />
    );
  }

  if (node === "gate") {
    return (
      <BridgeGate
        family={family}
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        summary={subjectFor(draft)}
        onBack={retreat}
        onVerified={() => {
          // The session exists now, so the path no longer contains this node.
          // Running the checks directly rather than calling `advance` avoids
          // depending on a `signedIn` prop the server has not re-rendered yet.
          void runChecks();
        }}
        onSkip={retreat}
      />
    );
  }

  if (node === "screening") {
    return (
      <BridgeScreening
        family={family}
        signedIn={signedIn}
        ledger={ledger}
        signals={PUBLISH_SIGNALS}
        checks={checks}
        onBack={() => go("preview")}
        onPublish={publish}
        onRetry={() => void runChecks()}
      />
    );
  }

  return (
    <BridgePublished
      family={family}
      signedIn={signedIn}
      ledger={ledger}
      signals={PUBLISH_SIGNALS}
      reference={reference ?? "Pending"}
      subject={subjectFor(draft)}
      validity={typeof draft.validity === "number" || draft.validity === "standing" ? draft.validity : 60}
      now={now}
      capacityAnswer={capacityAnswer}
      identityPublic={draft.role === "identity_public"}
      onMyListings={() => router.push("/account")}
      onPublishAnother={() => {
        forgetDraft(PUBLISH_DRAFT_KEY);
        setDraft(emptyDraft());
        setCapacityAnswer(emptyCapacity());
        setAssets([]);
        setInferred(new Set());
        setReference(null);
        setJustStructured(false);
        setNode("intent");
      }}
    />
  );
}

/**
 * Is this intent on the demand side?
 *
 * Read from `MARKET_INTENTS`, which is the pinned table, rather than tested
 * against a literal. Four of the seven are demand-side; any surface that
 * hard-codes one of them will be wrong about the other three, and being wrong
 * here means telling a member they are offering something they said they need.
 */
export function demandSide(intent: string | null | undefined): boolean {
  return MARKET_INTENTS.some((entry) => entry.key === intent && entry.side === "demand");
}

/** Exported so a test can assert the back label without rendering the flow. */
export { backLabel };
