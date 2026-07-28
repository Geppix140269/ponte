"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import BridgeRoute, { type BridgeStation } from "@/components/ponte/bridge/BridgeRoute";
import LifecycleState from "@/components/ponte/state/LifecycleState";
// From `accept`, not `read`: the reader unzips OOXML through a Node module, and
// a client component that imports it puts `fs` in the browser bundle.
import { ACCEPT_ATTRIBUTE, ACCEPTED_UPLOAD_HINT } from "@/lib/documents/accept";
import type { DocumentExtraction } from "@/lib/products/extract-document";
import type { CommercialTerms } from "@/lib/products/terms";
import {
  INTAKE_METHODS,
  INTAKE_STEPS,
  completedSteps,
  intakeReducer,
  newSession,
  rehydrate,
  resumeSummary,
  serialise,
  sessionKey,
  wordingOf,
  type IntakeMethod,
  type IntakeSession,
  type ProductIntent,
  type ReviewState,
} from "@/lib/products/intake";
import type { ResolutionOutcome, ResolvedProduct } from "@/lib/products/model";
import { progressBand, progressValue } from "@/lib/ponte/progress";
import CandidateRows from "./CandidateRows";
import ReviewPanel from "./ReviewPanel";

/**
 * The product intake: describe, upload or browse, for both product intents.
 *
 * ## The structure is the Bridge, not a wizard
 *
 * Constitution section 8 and 23: where the approved Bridge applies it may not be
 * replaced by a card grid, tabs or a generic stepper. Three ways across to one
 * destination is precisely what a Family Bridge expresses, so the three intake
 * methods are three stations of `BridgeRoute`, with the crossing running from
 * the member's own words to a structured draft.
 *
 * That also settles the icon question rather than dodging it. The approved
 * station carries no icon (see the note in `BridgeRoute.tsx`), and the Flow
 * registry holds no microphone, upload or search key, so there was nothing to
 * draw and nothing that needed drawing. A missing icon is a gap to escalate,
 * not permission to invent one, and it is registered in the ExecPlan.
 *
 * ## Browse is retained and is not the default
 *
 * The third station opens the existing HS drill-down, unchanged. The decision
 * record keeps category browsing available for members who prefer it and
 * removes it as the route everyone is forced down. `renderBrowse` is passed in
 * by the composer so this component does not fork the HS picker.
 *
 * ## Nothing is created here
 *
 * The intake ends at `onResolved`, which hands the composer a structured
 * product and the terms the member confirmed. Draft creation, the account gate
 * and the submit are the composer's, exactly as they were.
 */

const LEFT_ABUTMENT = "Your product";
const RIGHT_ABUTMENT = "A structured draft";

const METHOD_STATION: Record<IntakeMethod, { title: string; description: string }> = {
  describe: {
    title: "Describe it",
    description: "Type or speak what you trade, in any language. Ponte identifies it.",
  },
  upload: {
    title: "Upload a document",
    description: "An offer, an ICPO, an SCO, a specification. Ponte reads it and structures the terms.",
  },
  browse: {
    title: "Browse categories",
    description: "Work down the customs categories yourself, if you would rather.",
  },
};

const INTENT_COPY: Record<ProductIntent, { lead: string; emphasis: string; sub: string; reviewLead: string }> = {
  offer_product: {
    lead: "Tell Ponte what you supply,",
    emphasis: "in your own words.",
    sub: "No customs code needed to begin. Describe the product, upload the offer you already have, or browse categories. Ponte identifies and structures it, and you confirm before anything is created.",
    reviewLead: "This will become a supply offer.",
  },
  source_product: {
    lead: "Tell Ponte what you need,",
    emphasis: "in your own words.",
    sub: "No customs code needed to begin. Describe the product, upload the requirement you already have, or browse categories. Ponte identifies and structures it, and you confirm before anything is created.",
    reviewLead: "This will become a sourcing requirement.",
  },
};

/** The Web Speech constructor, where the browser has one. */
type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export interface ProductIntakeProps {
  intent: ProductIntent;
  /**
   * The existing HS category drill-down. Passed in rather than imported so the
   * intake does not fork the picker the composer already owns.
   */
  renderBrowse: () => React.ReactNode;
  /** Called once the member confirms. The composer creates the draft. */
  onResolved: (result: {
    products: ResolvedProduct[];
    terms: CommercialTerms;
    plan: string | null;
    /** The document the facts came from, by name. Never its bytes. */
    documentName: string | null;
  }) => void;
}

/**
 * An explicit starting session.
 *
 * This is a test and evidence seam, and it is a deliberate one. Constitution
 * section 21 requires visual evidence of the states a change touches, and
 * several of this journey's states (extraction failure, a blocked format, a
 * resumed session) cannot be produced on demand in a browser without breaking
 * something on purpose. The state gallery under `/dev/product-intake` renders
 * each one by handing it in, and the reducer stays the only way a real member
 * moves between them.
 */
export interface SeededProductIntakeProps extends ProductIntakeProps {
  initialSession?: IntakeSession;
  /** Skip the sessionStorage read, so a seeded state is not overwritten. */
  disableResume?: boolean;
}

export default function ProductIntake({
  intent,
  renderBrowse,
  onResolved,
  initialSession,
  disableResume,
}: SeededProductIntakeProps) {
  const [session, dispatch] = useReducer(
    intakeReducer,
    initialSession ?? intent,
    (arg) => (typeof arg === "string" ? newSession(arg as ProductIntent) : (arg as IntakeSession)),
  );
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const copy = INTENT_COPY[intent];

  // ---- resume across authentication and across leaving the page ----------
  //
  // The whole session is one plain value, so this is a read and a write rather
  // than a mechanism. `AGENTS.md`: preserve and resume the user's work across
  // authentication.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || disableResume) return;
    restored.current = true;
    const stored = rehydrate(window.sessionStorage.getItem(sessionKey(intent)));
    if (stored) dispatch({ type: "restore", session: stored });
  }, [intent, disableResume]);

  useEffect(() => {
    if (disableResume) return;
    try {
      window.sessionStorage.setItem(sessionKey(intent), serialise(session));
    } catch {
      // A full or disabled store must not break the journey. The member simply
      // does not get a resume, which is the pre-existing behaviour.
    }
  }, [intent, session, disableResume]);

  useEffect(() => {
    setVoiceAvailable(
      typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    );
  }, []);

  // ---- resolution --------------------------------------------------------

  const resolve = useCallback(async (wording: string) => {
    dispatch({ type: "analyse", method: "describe", what: wording });
    try {
      const res = await fetch("/api/products/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: wording }),
      });
      const json = (await res.json()) as { ok?: boolean; outcome?: ResolutionOutcome };
      if (!json?.ok || !json.outcome) {
        // Never a blank screen: an unreachable resolver still produces an
        // explained state with both other methods offered.
        dispatch({ type: "resolution", outcome: { kind: "none", wording, tried: [] } });
        return;
      }
      dispatch({ type: "resolution", outcome: json.outcome });
    } catch {
      dispatch({ type: "resolution", outcome: { kind: "none", wording, tried: [] } });
    }
  }, []);

  const upload = useCallback(async (file: File) => {
    dispatch({ type: "documentChosen", filename: file.name, bytes: file.size });
    const body = new FormData();
    body.append("file", file);
    let res: Response;
    try {
      res = await fetch("/api/products/extract", { method: "POST", body });
    } catch {
      dispatch({ type: "uploadFailed", filename: file.name, reason: "The upload did not reach Ponte." });
      return;
    }
    if (res.status === 429) {
      dispatch({
        type: "uploadFailed",
        filename: file.name,
        reason: "Too many documents in a short time. Wait a minute and try again.",
      });
      return;
    }
    let json: {
      ok?: boolean;
      reason?: string;
      filename?: string;
      format?: string;
      message?: string;
      extraction?: DocumentExtraction;
    };
    try {
      json = await res.json();
    } catch {
      dispatch({ type: "extractionFailed", filename: file.name, reason: "Ponte could not read the response." });
      return;
    }
    if (json.ok && json.extraction) {
      dispatch({ type: "extraction", extraction: json.extraction });
      return;
    }
    if (json.reason === "blocked") {
      dispatch({
        type: "blocked",
        filename: json.filename ?? file.name,
        format: json.format ?? "",
        reason: json.message ?? "Ponte cannot read this format.",
      });
      return;
    }
    dispatch({
      type: "extractionFailed",
      filename: json.filename ?? file.name,
      reason: json.message ?? "Ponte could not read this document.",
    });
  }, []);

  const startVoice = useCallback(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechCtor }).webkitSpeechRecognition;
    if (!Ctor) return;
    dispatch({ type: "voiceStart" });
    try {
      const recogniser = new Ctor();
      // No language is forced. A trader dictating in their own language is the
      // multilingual input the English-only interface policy explicitly keeps.
      recogniser.lang = navigator.language || "en";
      recogniser.interimResults = false;
      recogniser.maxAlternatives = 1;
      recogniser.onresult = (event) => {
        const said = event.results[0][0].transcript ?? "";
        dispatch({ type: "voiceResult", wording: said });
      };
      recogniser.onerror = () => dispatch({ type: "voiceError", reason: "Ponte did not catch that. Try again, or type it." });
      recogniser.start();
    } catch {
      dispatch({ type: "voiceError", reason: "Dictation is not available in this browser. Type it instead." });
    }
  }, []);

  // ---- the confirmed handoff --------------------------------------------

  useEffect(() => {
    if (session.stage.kind !== "confirmed") return;
    const review: ReviewState = session.stage.review;
    onResolved({
      products: review.products.filter((p) => p.included).map((p) => p.product),
      terms: review.shared,
      plan: review.plan,
      documentName: review.document?.filename ?? null,
    });
  }, [session.stage, onResolved]);

  // ---- render ------------------------------------------------------------

  const stage = session.stage;
  const value = progressValue(INTAKE_STEPS, completedSteps(session));
  const stations: BridgeStation[] = INTAKE_METHODS.map((method, index) => ({
    key: method,
    title: METHOD_STATION[method].title,
    description: METHOD_STATION[method].description,
    index: `${String(index + 1).padStart(2, "0")} / Intake`,
    mark: "Selected route",
  }));

  if (stage.kind === "review") {
    return (
      <div className="pintake">
        <ReviewPanel
          review={stage.review}
          intentLabel={copy.reviewLead}
          onEditShared={(key, next) => dispatch({ type: "editTerm", scope: "shared", key, value: next })}
          onEditProduct={(id, key, next) => dispatch({ type: "editTerm", scope: id, key, value: next })}
          onToggleProduct={(id) => dispatch({ type: "toggleProduct", id })}
          onConfirm={() => dispatch({ type: "confirm" })}
        />
      </div>
    );
  }

  return (
    <div className="pintake">
      <h1 className="pintake__lead">
        {copy.lead} <em>{copy.emphasis}</em>
      </h1>
      <p className="pintake__sub">{copy.sub}</p>

      {session.resumed ? (
        <p className="pintake__note" role="status">
          Ponte kept {resumeSummary(session)} and brought you back to it.
        </p>
      ) : null}

      {/* Constitution section 9: before meaningful action, a neutral state and
          no percentage. `progressValue` returns null, not zero, so there is no
          way to render 0% by forgetting. */}
      {value !== null ? (
        <div className="pintake__prog">
          <b>{value}%</b>
          <span>{progressBand(value, "opportunity")}</span>
        </div>
      ) : (
        <div className="pintake__prog">
          <span>Nothing started yet.</span>
        </div>
      )}

      <BridgeRoute
        mode="select"
        ariaLabel="Choose how to tell Ponte about the product"
        stations={stations}
        selected={session.method}
        visited={session.method ? [session.method] : []}
        onSelect={(key) => dispatch({ type: "chooseMethod", method: key as IntakeMethod })}
        left={LEFT_ABUTMENT}
        right={RIGHT_ABUTMENT}
        rightDashed
        countNote="Three ways in. Ponte does the classification."
      />

      <div className="pintake__panel">
        {stage.kind === "initial" && !session.method ? (
          <p className="pintake__note">
            Choose a route above. Browsing categories still works exactly as it did, and no customs code is needed
            before Ponte understands your product.
          </p>
        ) : null}

        {(stage.kind === "typing" || stage.kind === "voice") ? (
          <DescribePanel
            wording={wordingOf(stage)}
            listening={stage.kind === "voice"}
            error={stage.kind === "voice" ? stage.error : null}
            voiceAvailable={voiceAvailable}
            onChange={(next) => dispatch({ type: "type", wording: next })}
            onVoice={startVoice}
            onResolve={() => resolve(wordingOf(stage))}
          />
        ) : null}

        {stage.kind === "browse" ? <div>{renderBrowse()}</div> : null}

        {stage.kind === "analysing" ? (
          <LifecycleState
            state="active"
            label={stage.method === "upload" ? "Reading your document" : "Identifying your product"}
            detail={
              stage.method === "upload"
                ? `${stage.what}. Ponte is finding the products and the commercial terms it states.`
                : `Matching "${stage.what}" against Ponte's product vocabulary.`
            }
          />
        ) : null}

        {stage.kind === "resolved" || stage.kind === "candidates" ? (
          <>
            <p className="pintake__note">
              {stage.kind === "resolved"
                ? "Ponte identified one product. Confirm it, or choose another route above."
                : `Ponte found ${stage.outcome.candidates.length} products that fit. The closest is first.`}
            </p>
            <CandidateRows
              candidates={stage.outcome.candidates}
              ariaLabel="Products Ponte identified"
              onChoose={(key) => dispatch({ type: "chooseCandidate", productKey: key })}
            />
          </>
        ) : null}

        {stage.kind === "ambiguous" ? (
          <>
            {/* The clarification. Not an error, and nothing pre-selected: the
                decision record rejects silently accepting the first answer. */}
            <LifecycleState state="waiting" label="Ponte needs one decision from you" detail={stage.outcome.question} />
            <CandidateRows
              candidates={stage.outcome.candidates}
              ariaLabel={stage.outcome.question}
              onChoose={(key) => dispatch({ type: "chooseCandidate", productKey: key })}
            />
          </>
        ) : null}

        {stage.kind === "unmatched" ? (
          <>
            <LifecycleState
              state="waiting"
              label="Ponte did not recognise that yet"
              detail={
                stage.tried.length > 0
                  ? `Ponte looked for ${stage.tried.slice(0, 6).join(", ")} in its product vocabulary and found nothing close.`
                  : "Ponte found nothing close in its product vocabulary."
              }
            />
            <p className="pintake__note">
              Add a grade, a standard or a technical term and try again, upload the document you already have, or browse
              the categories. Ponte will not guess a product you did not name.
            </p>
          </>
        ) : null}

        {stage.kind === "multiProduct" ? (
          <MultiProductChoice
            extraction={stage.extraction}
            plan={stage.plan}
            onChoose={(plan) => dispatch({ type: "choosePlan", plan })}
            onContinue={() => dispatch({ type: "openReview" })}
          />
        ) : null}

        {stage.kind === "extracted" ? (
          <>
            <LifecycleState
              state="completed"
              label="Ponte read your document"
              detail={`One product found in ${stage.extraction.filename}. Nothing has been created yet.`}
            />
            <p className="pintake__note">Continue to review what Ponte extracted before anything is created.</p>
            <div className="pintake__row">
              <button type="button" className="fbtn fbtn--lg" onClick={() => dispatch({ type: "openReview" })}>
                Review what Ponte found
              </button>
            </div>
          </>
        ) : null}

        {stage.kind === "blocked" ? (
          <>
            <LifecycleState
              state="blocked"
              label={`Ponte cannot read a .${stage.format || "file"} yet`}
              detail={stage.reason}
            />
            <p className="pintake__note">
              Describe the product instead, or browse the categories. Both routes above still work.
            </p>
          </>
        ) : null}

        {stage.kind === "uploadFailed" || stage.kind === "extractionFailed" ? (
          <>
            <LifecycleState
              state="error"
              label={stage.kind === "uploadFailed" ? "The upload did not finish" : "Ponte could not read that document"}
              detail={stage.reason}
            />
            <div className="pintake__row">
              <button type="button" className="fbtn" onClick={() => fileRef.current?.click()}>
                Try another document
              </button>
              <button
                type="button"
                className="fbtn fbtn--ghost"
                onClick={() => dispatch({ type: "chooseMethod", method: "describe" })}
              >
                Describe it instead
              </button>
            </div>
          </>
        ) : null}

        {session.method === "upload" &&
        (stage.kind === "initial" ||
          stage.kind === "blocked" ||
          stage.kind === "uploadFailed" ||
          stage.kind === "extractionFailed") ? (
          <UploadPanel inputRef={fileRef} document={session.document} />
        ) : null}

        {/* The input is always mounted so the retry buttons above have
            something to click, even when the upload panel itself is not shown. */}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DescribePanel({
  wording,
  listening,
  error,
  voiceAvailable,
  onChange,
  onVoice,
  onResolve,
}: {
  wording: string;
  listening: boolean;
  error: string | null;
  voiceAvailable: boolean;
  onChange: (next: string) => void;
  onVoice: () => void;
  onResolve: () => void;
}) {
  return (
    <div>
      <label htmlFor="pintake-describe" className="sigsheet__l" style={{ display: "block", marginBottom: 8 }}>
        What is the product?
      </label>
      <textarea
        id="pintake-describe"
        className="snote"
        value={wording}
        placeholder="For example: gas oil, EN 590 10 ppm, 200,000 MT per month CIF"
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="pintake__note">
        Any language. A grade, a standard or a specification helps Ponte tell close products apart.
      </p>

      {listening ? (
        <LifecycleState state="loading" label="Listening" detail="Say what you trade. Ponte writes it into the field." />
      ) : null}
      {error ? <LifecycleState state="error" label="Dictation did not work" detail={error} /> : null}

      <div className="pintake__row">
        <button type="button" className="fbtn fbtn--lg" disabled={wording.trim().length < 2} onClick={onResolve}>
          Identify this product
        </button>
        {/* Voice is a text-labelled control. The Flow registry holds no
            microphone key, and Constitution section 7 makes a missing icon a
            gap to escalate rather than permission to draw one. It is absent
            entirely where the browser has no Web Speech support, which is the
            same behaviour the Find product picker already has. */}
        {voiceAvailable ? (
          <button type="button" className="fbtn fbtn--ghost" onClick={onVoice}>
            Speak it instead
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UploadPanel({
  inputRef,
  document: chosen,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  document: { filename: string; bytes: number } | null;
}) {
  return (
    <div>
      <p className="pintake__note">
        Upload the offer, requirement or specification you already have. Ponte reads {ACCEPTED_UPLOAD_HINT}, finds every
        product it names, and extracts the commercial terms it states. Nothing is published and nothing is verified.
      </p>
      <div className="pintake__row">
        <button type="button" className="fbtn fbtn--lg" onClick={() => inputRef.current?.click()}>
          Choose a document
        </button>
        {chosen ? (
          <span className="pintake__file">
            {chosen.filename}, {Math.max(1, Math.round(chosen.bytes / 1024))} KB
          </span>
        ) : null}
      </div>
      {/* The file input itself is mounted once by the parent, so a first upload
          and a retry from an error state use the same control rather than two
          that can disagree about which file was chosen. */}
      <p className="pintake__note">
        Ponte holds your document for this session only. It is not stored, and it is not shown to anyone else.
      </p>
    </div>
  );
}

function MultiProductChoice({
  extraction,
  plan,
  onChoose,
  onContinue,
}: {
  extraction: DocumentExtraction;
  plan: "separate" | "programme" | null;
  onChoose: (plan: "separate" | "programme") => void;
  onContinue: () => void;
}) {
  const stations: BridgeStation[] = [
    {
      key: "separate",
      title: `Create ${extraction.products.length} separate drafts`,
      description: "Recommended. Each product has its own buyers, specification, classification and search demand.",
      index: "01 / Choice",
      mark: "Selected route",
    },
    {
      key: "programme",
      title: "Create one supply programme",
      description: "One record covering every product, for a deliberately combined commercial arrangement.",
      index: "02 / Choice",
      mark: "Selected route",
    },
  ];

  return (
    <div>
      <LifecycleState
        state="completed"
        label={`Ponte found ${extraction.products.length} products in this document`}
        detail="Each is listed separately below. Nothing has been created yet."
      />
      <ul className="pintake__limits">
        {extraction.products.map((p) => (
          <li key={p.wording}>
            <b>{p.wording}</b>
            {p.mention ? ` (matched: ${p.mention.terms.slice(0, 3).join(", ")})` : " (not in Ponte's catalogue yet)"}
          </li>
        ))}
      </ul>

      <BridgeRoute
        mode="select"
        ariaLabel="Choose how these products become drafts"
        stations={stations}
        selected={plan}
        visited={plan ? [plan] : []}
        onSelect={(key) => onChoose(key as "separate" | "programme")}
        left="Three products"
        right="Your drafts"
        rightDashed
      />

      <div className="pintake__row">
        <button type="button" className="fbtn fbtn--lg" disabled={!plan} onClick={onContinue}>
          Review what Ponte found
        </button>
      </div>
      {!plan ? (
        <p className="pintake__note">
          Ponte will not choose this for you. Separate drafts is the recommendation; one programme is a real commercial
          instrument and yours to choose.
        </p>
      ) : null}
    </div>
  );
}
