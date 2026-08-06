"use client";

import { useEffect, useRef, useState } from "react";
import BridgeShell, { BridgeAction, BridgeSecondary } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import { uploadPermitted } from "@/lib/publish/assets";
import { resolveProduct } from "@/lib/products/resolve";
import type { ProductCandidate } from "@/lib/products/model";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B02` Tell Ponte, on the bridge system.
 *
 * ## The one job
 *
 * Get the facts out of the member's head with the least possible effort. Four
 * routes in, weighted by SIZE AND POSITION, never by label: the speak route is
 * first and is the largest thing under the band, and the other three follow it.
 *
 * On the bridge that weighting is carried by the type scale rather than by a
 * 44px microphone, which means one fewer drawn shape to fence and no icon whose
 * meaning has to be learned.
 *
 * ## The gate is not decoration
 *
 * `DECISION-16`: the upload route requires sign-in, and item 11 of the thirteen
 * is "ungated document upload". Signed out, the row does not open a file
 * picker. It says why, and it says so before the tap rather than after it.
 * `uploadPermitted` is the only thing that decides, so the gate cannot be
 * bypassed by a second entrance to the same route.
 *
 * ## Voice, stated honestly
 *
 * The Web Speech API exists in Chrome and Safari and does not exist in Firefox
 * or in most in-app browsers. A "Speak it" control that silently does nothing is
 * worse than no control, so availability is detected on mount and the route says
 * which case the member is in. Typing is always available and is never the only
 * route, which is the rule that makes the detection safe to act on.
 */

/*
  The Web Speech API's types are not in this project's lib.dom, and adding them
  globally would declare an API that most of the app must not use. Declared
  minimally here instead, as what is actually called.
*/
interface SpeechResultAlternative {
  transcript: string;
}
interface SpeechResult {
  0: SpeechResultAlternative;
  isFinal: boolean;
  length: number;
}
interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}
interface SpeechEvent {
  resultIndex: number;
  results: SpeechResultList;
}
interface SpeechRecogniser {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecogniserConstructor = new () => SpeechRecogniser;

function recogniserConstructor(): RecogniserConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecogniserConstructor;
    webkitSpeechRecognition?: RecogniserConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Phase = "empty" | "listening" | "typing" | "denied" | "upload" | "candidates";

/** The statement, per family and direction. It must never contradict `B01`. */
function statementFor(family: MarketFamily, sourcing: boolean): string {
  if (family === "services") {
    return sourcing ? "What service do you need?" : "What service do you provide?";
  }
  if (family === "distribution") {
    return sourcing ? "What do you want represented?" : "What can you distribute?";
  }
  return sourcing ? "What are you looking for?" : "What do you supply?";
}

/** The accent, as a separate value. `ADR-0032-AMENDMENT-2` entry 1. */
function accentFor(family: MarketFamily, sourcing: boolean): string {
  if (family === "services") return sourcing ? "do you need?" : "do you provide?";
  if (family === "distribution") return sourcing ? "represented?" : "distribute?";
  return sourcing ? "looking for?" : "do you supply?";
}

function promptFor(family: MarketFamily, sourcing: boolean): string {
  if (family === "products") {
    return sourcing
      ? "Any language. Say what you need, how much, and where to."
      : "Any language. Say what you supply, how much, and where from.";
  }
  return "Any language. Say what it is, who it is for, and where.";
}

export interface BridgeTellProps {
  family: MarketFamily;
  /** True when the member is looking for something rather than offering it. */
  sourcing: boolean;
  signedIn: boolean;
  retention: string;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onBack: () => void;
  /** A product the member chose from what Ponte understood. */
  onProduct: (candidate: ProductCandidate, wording: string) => void;
  /** The member's own words, kept whether or not a product resolved. */
  onWording: (wording: string) => void;
  /** The document a signed-in member attached, by NAME. Never its bytes. */
  onDocument: (name: string) => void;
  /** Browse the catalogue instead. Hands off to the classification journey. */
  onBrowse: () => void;
  /** Continue without resolving a product. Typing is never compulsory. */
  onSkip: () => void;
}

export default function BridgeTell({
  family,
  sourcing,
  signedIn,
  retention,
  ledger,
  signals,
  who = null,
  onBack,
  onProduct,
  onWording,
  onDocument,
  onBrowse,
  onSkip,
}: BridgeTellProps) {
  const [phase, setPhase] = useState<Phase>("empty");
  const [transcript, setTranscript] = useState("");
  const [candidates, setCandidates] = useState<readonly ProductCandidate[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const recogniser = useRef<SpeechRecogniser | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setVoiceAvailable(recogniserConstructor() !== null);
    return () => {
      recogniser.current?.stop();
    };
  }, []);

  const upload = uploadPermitted(signedIn);

  function listen() {
    const Recogniser = recogniserConstructor();
    if (!Recogniser) return;
    const instance = new Recogniser();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = typeof navigator === "undefined" ? "en" : navigator.language;
    instance.onresult = (event) => {
      let heard = "";
      for (let i = 0; i < event.results.length; i += 1) heard += event.results[i][0].transcript;
      setTranscript(heard);
    };
    // A denied microphone is a state, not a failure. The other three routes are
    // shown rather than the member being left on a dead screen.
    instance.onerror = (event) => {
      instance.stop();
      setPhase(event.error === "not-allowed" ? "denied" : "empty");
    };
    recogniser.current = instance;
    instance.start();
    setPhase("listening");
  }

  function resolve(words: string) {
    const wording = words.trim();
    if (wording === "") return;
    onWording(wording);
    // Services and distribution are not classified against the product
    // catalogue: a freight forwarder is not an HS code, and running their words
    // through a goods resolver is how a real service acquires a false one.
    if (family !== "products") {
      onSkip();
      return;
    }
    const outcome = resolveProduct(wording);
    if (outcome.kind === "none") {
      setCandidates([]);
      setQuestion(null);
    } else {
      setCandidates(outcome.candidates);
      setQuestion(outcome.kind === "ambiguous" ? outcome.question : null);
    }
    setPhase("candidates");
  }

  function stopListening() {
    recogniser.current?.stop();
    resolve(transcript);
  }

  /** The three routes that are not speaking. Rendered under it, in this order. */
  function otherRoutes() {
    return (
      <>
        <button
          className="brg-zone"
          type="button"
          onClick={upload.allowed ? () => file.current?.click() : undefined}
          aria-disabled={!upload.allowed}
          data-gated={upload.allowed ? undefined : "sign-in"}
        >
          <span className="brg-zone__index">02</span>
          <span className="brg-zone__title">Photograph or upload</span>
          <span className="brg-zone__detail">
            {upload.allowed
              ? "Held against your account. Nothing is published by uploading."
              : upload.reason}
          </span>
        </button>

        {/*
          Item 10 of the thirteen retires the apology about tariff codes.
          Rephrasing it is still using it: this states what the route does and
          stops.
        */}
        <button className="brg-zone" type="button" onClick={onBrowse}>
          <span className="brg-zone__index">03</span>
          <span className="brg-zone__title">Browse categories</span>
          <span className="brg-zone__detail">
            By picture. Start from the sector, not from a number.
          </span>
        </button>

        <button className="brg-zone" type="button" onClick={() => setPhase("typing")}>
          <span className="brg-zone__index">04</span>
          <span className="brg-zone__title">Type it, with search</span>
          <span className="brg-zone__detail">Always available, in any language.</span>
        </button>
      </>
    );
  }

  const heard = transcript.trim();
  const statement =
    phase === "candidates"
      ? candidates.length > 0
        ? (question ?? "Is this what you trade?")
        : "Ponte does not recognise this yet."
      : phase === "listening"
        ? "Ponte is listening."
        : phase === "denied"
          ? "Ponte cannot reach the microphone."
          : phase === "upload"
            ? "Before this is sent."
            : statementFor(family, sourcing);

  const accent =
    phase === "empty" || phase === "typing" ? accentFor(family, sourcing) : null;

  return (
    <BridgeShell
      screen="B02"
      phase={phase}
      node="tell"
      family={family}
      signedIn={signedIn}
      progress={phase === "empty" ? 0 : phase === "candidates" ? 1 : 0.5}
      question={statement}
      accent={accent}
      eyebrow={phase === "candidates" && candidates.length > 0 ? "What Ponte understood" : "In your own words"}
      /*
        The prompt belongs to the SPEAK route, where it is the instruction for
        that route, and it was here as well: the band and the first row printed
        the same sentence one above the other. This note says what the screen
        offers instead.
      */
      note={
        phase === "candidates"
          ? `Heard as "${heard}". Your words are kept whichever you choose.`
          : phase === "empty"
            ? "Four routes in. Every one of them works, and none of them is required."
            : promptFor(family, sourcing)
      }
      back={
        phase === "empty"
          ? { label: "Capacity", onBack }
          : { label: "Tell Ponte", onBack: () => setPhase("empty") }
      }
      ledger={ledger}
      retention={retention}
      signals={signals}
      who={who}
      actions={
        phase === "listening" ? (
          <>
            <BridgeAction label="Stop and continue" onClick={stopListening} />
            <BridgeSecondary
              label="Cancel, keep nothing"
              onClick={() => {
                recogniser.current?.stop();
                setTranscript("");
                setPhase("empty");
              }}
            />
          </>
        ) : phase === "typing" ? (
          <BridgeAction
            label="Continue"
            sub={heard === "" ? "Say or type something to continue" : null}
            disabled={heard === ""}
            onClick={() => resolve(transcript)}
          />
        ) : null
      }
    >
      {phase === "empty" && (
        <>
          {/* Route 1, by size and position: first, and the largest under the band. */}
          <button
            className="brg-zone"
            data-lead="true"
            type="button"
            onClick={voiceAvailable ? listen : undefined}
            aria-disabled={!voiceAvailable}
          >
            <span className="brg-zone__index">01</span>
            <span className="brg-zone__title">Speak it</span>
            <span className="brg-zone__detail">
              {voiceAvailable
                ? promptFor(family, sourcing)
                : "This browser has no speech recognition, so Ponte cannot listen here. The three routes below all work."}
            </span>
          </button>
          {otherRoutes()}

          <input
            ref={file}
            type="file"
            hidden
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) {
                onDocument(chosen.name);
                setPhase("upload");
              }
            }}
          />
        </>
      )}

      {phase === "listening" && (
        <>
          <p className="brg-transcript" data-empty={heard === "" ? "true" : undefined}>
            {heard || promptFor(family, sourcing)}
          </p>
          <div className="brg-running" aria-hidden="true">
            <i />
          </div>
          <p className="brg-note" style={{ marginBlockStart: 16 }}>
            Keep going. Ponte structures this after you stop.
          </p>
        </>
      )}

      {phase === "typing" && (
        <>
          <label className="brg-field">
            <span>What it is</span>
            <input
              type="text"
              autoFocus
              placeholder="Vietnamese white rice, 5% broken"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && transcript.trim() !== "") resolve(transcript);
              }}
            />
          </label>
          <p className="brg-note" style={{ marginBlockStart: 18 }}>
            Any language. Ponte matches your words against what it knows and shows you what it
            found, rather than deciding for you.
          </p>
        </>
      )}

      {phase === "denied" && (
        <>
          <p className="brg-note" style={{ marginBlockEnd: 26 }}>
            Your browser has not granted access. Nothing you have entered is affected, and you can
            turn it on later in settings.
          </p>
          <div className="brg-group">The other three routes</div>
          {otherRoutes()}
          <input
            ref={file}
            type="file"
            hidden
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) {
                onDocument(chosen.name);
                setPhase("upload");
              }
            }}
          />
        </>
      )}

      {phase === "upload" && (
        <>
          <p className="brg-note" style={{ marginBlockEnd: 8 }}>
            Ponte holds this against your account. Here is exactly what happens to it.
          </p>
          <div className="brg-row">
            <span className="brg-row__label">
              What is kept: the file, and the facts you confirm from it. Ponte does not read a
              document for you and does not claim to.
            </span>
            <span className="brg-row__value">Held</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">
              For how long: 90 days from your last edit to this draft, with a warning 14 days and
              3 days before.
            </span>
            <span className="brg-row__value">90 days</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">
              Who sees it: nobody. Nothing is published or shown to any counterparty by uploading.
            </span>
            <span className="brg-row__value">Private</span>
          </div>

          <button className="brg-zone" type="button" onClick={() => setPhase("typing")}>
            <span className="brg-zone__index">01</span>
            <span className="brg-zone__title">Say what is in it</span>
            <span className="brg-zone__detail">Fastest route. Any language.</span>
          </button>
          <button className="brg-zone" type="button" onClick={onSkip}>
            <span className="brg-zone__index">02</span>
            <span className="brg-zone__title">Continue to the listing</span>
            <span className="brg-zone__detail">
              The document is attached and named on the record.
            </span>
          </button>
        </>
      )}

      {phase === "candidates" && (
        <>
          {candidates.length > 0 ? (
            candidates.map((candidate, index) => (
              <button
                key={candidate.product.key}
                className="brg-zone"
                type="button"
                onClick={() => onProduct(candidate, heard)}
              >
                <span className="brg-zone__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="brg-zone__title">{candidate.product.name}</span>
                <span className="brg-zone__detail">
                  {candidate.band === "close"
                    ? "Close match"
                    : candidate.band === "likely"
                      ? "Likely match"
                      : "Possible match"}
                  {" · "}
                  {candidate.product.group}
                </span>
              </button>
            ))
          ) : (
            <button className="brg-zone" type="button" onClick={onBrowse}>
              <span className="brg-zone__index">01</span>
              <span className="brg-zone__title">Browse categories instead</span>
              <span className="brg-zone__detail">Find it by picture rather than by name.</span>
            </button>
          )}
          <button className="brg-zone" type="button" onClick={onSkip}>
            <span className="brg-zone__index">
              {String(Math.max(candidates.length, 1) + 1).padStart(2, "0")}
            </span>
            <span className="brg-zone__title">None of these. Carry on with my own words.</span>
            <span className="brg-zone__detail">
              Ponte keeps what you said and does not classify it.
            </span>
          </button>
        </>
      )}
    </BridgeShell>
  );
}
