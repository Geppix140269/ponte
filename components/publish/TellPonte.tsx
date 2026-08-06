"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Frame, { Action, Retention, Secondary } from "./Frame";
import { uploadPermitted } from "@/lib/publish/assets";
import { resolveProduct } from "@/lib/products/resolve";
import type { ProductCandidate } from "@/lib/products/model";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B02` / `S01` / `T01` Tell Ponte.
 *
 * Specification: `docs/ponte/design-reference/ponte-set1-screens.js`, pattern 1,
 * eight states. One interaction, three families, three content models beneath.
 *
 * ## The one job
 *
 * Get the facts out of the member's head with the least possible effort. Four
 * routes in, weighted by SIZE AND POSITION, never by label: the speak band is
 * the largest thing on the screen and is first, and the other three are rows
 * beneath it in the brief's stated order.
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
 * or in most in-app browsers. A "Speak it" control that silently does nothing
 * is worse than no control, so availability is detected on mount and the band
 * says which case the member is in. Typing is always available and is never the
 * only route, which is the rule that makes the detection safe to act on.
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

type Phase = "empty" | "listening" | "typing" | "denied" | "upload" | "resolving" | "candidates";

/** The statement, per family and direction. It must never contradict B01. */
function statementFor(family: MarketFamily, sourcing: boolean): string {
  if (family === "services") {
    return sourcing
      ? "Tell Ponte what service you need, in your own words."
      : "Tell Ponte what service you provide, in your own words.";
  }
  if (family === "distribution") {
    return sourcing
      ? "Tell Ponte what you want represented, in your own words."
      : "Tell Ponte what you can distribute, in your own words.";
  }
  return sourcing
    ? "Tell Ponte what you are looking for, in your own words."
    : "Tell Ponte what you supply, in your own words.";
}

function promptFor(family: MarketFamily, sourcing: boolean): string {
  if (family === "products") {
    return sourcing
      ? "Any language. Tap and say what you need, how much, and where to."
      : "Any language. Tap and say what you supply, how much, and where from.";
  }
  return "Any language. Tap and say what it is, who it is for, and where.";
}

export interface TellPonteProps {
  family: MarketFamily;
  /** True when the member is looking for something rather than offering it. */
  sourcing: boolean;
  signedIn: boolean;
  retention: string;
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

export default function TellPonte({
  family,
  sourcing,
  signedIn,
  retention,
  onBack,
  onProduct,
  onWording,
  onDocument,
  onBrowse,
  onSkip,
}: TellPonteProps) {
  const [phase, setPhase] = useState<Phase>("empty");
  const [transcript, setTranscript] = useState("");
  const [candidates, setCandidates] = useState<readonly ProductCandidate[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [pending, startTransition] = useTransition();
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
    startTransition(() => setPhase("listening"));
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
    startTransition(() => {
      if (outcome.kind === "none") {
        setCandidates([]);
        setQuestion(null);
      } else {
        setCandidates(outcome.candidates);
        setQuestion(outcome.kind === "ambiguous" ? outcome.question : null);
      }
      setPhase("candidates");
    });
  }

  function stopListening() {
    recogniser.current?.stop();
    resolve(transcript);
  }

  return (
    <Frame
      screen="B02"
      stage={2}
      back={phase === "empty" ? "Capacity" : "Tell Ponte"}
      onBack={phase === "empty" ? onBack : () => startTransition(() => setPhase("empty"))}
      pending={pending}
      phase={phase}
      footer={
        phase === "listening" ? (
          <>
            <Action label="Stop and continue" onClick={stopListening} />
            <Secondary
              label="Cancel, keep nothing"
              onClick={() => {
                recogniser.current?.stop();
                setTranscript("");
                setPhase("empty");
              }}
            />
          </>
        ) : phase === "typing" ? (
          <>
            <Action
              label="Continue"
              sub={transcript.trim() === "" ? "Say or type something to continue" : null}
              disabled={transcript.trim() === ""}
              onClick={() => resolve(transcript)}
            />
            <Retention sentence={retention} />
          </>
        ) : (
          <Retention sentence={retention} />
        )
      }
    >
      {phase === "empty" && (
        <>
          <div className="pb__pad">
            <h1 className="stmt">{statementFor(family, sourcing)}</h1>
          </div>

          {/* Route 1, by size and position: the largest affordance on the screen. */}
          <button className="spk" type="button" onClick={voiceAvailable ? listen : undefined} aria-disabled={!voiceAvailable}>
            <span className="spk__g" aria-hidden="true" />
            <span>
              <b>Speak it</b>
              <p>
                {voiceAvailable
                  ? promptFor(family, sourcing)
                  : "This browser has no speech recognition, so Ponte cannot listen here. The three routes below all work."}
              </p>
            </span>
          </button>

          <div className="rows">
            {/* Route 2. Gated, and the gate is stated before the tap. */}
            <button
              className="row"
              type="button"
              onClick={upload.allowed ? () => file.current?.click() : undefined}
              aria-disabled={!upload.allowed}
              data-gated={upload.allowed ? undefined : "sign-in"}
            >
              <span className="gl gl--cam" aria-hidden="true" />
              <span>
                <b>Photograph or upload</b>
                <small>
                  {upload.allowed
                    ? "Held against your account. Nothing is published by uploading."
                    : upload.reason}
                </small>
              </span>
              <span className="go">›</span>
            </button>

            {/* Route 3. */}
            <button className="row" type="button" onClick={onBrowse}>
              <span className="gl gl--grid" aria-hidden="true" />
              {/*
                Item 10 of the thirteen retires the apology about tariff codes.
                Rephrasing it is still using it: the sentence is banned because
                it apologises for a requirement that does not exist. This one
                states what the route does and stops.
              */}
              <span>
                <b>Browse categories</b>
                <small>By picture. Start from the sector, not from a number.</small>
              </span>
              <span className="go">›</span>
            </button>

            {/* Route 4. Always present. Never the only one. */}
            <button
              className="row"
              type="button"
              onClick={() => startTransition(() => setPhase("typing"))}
            >
              <span className="gl gl--find" aria-hidden="true" />
              <span>
                <b>Type it, with search</b>
              </span>
              <span className="go">›</span>
            </button>
          </div>

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
          <div className="pb__pad" style={{ paddingBottom: 14 }}>
            <span className="lab">Listening</span>
            <h1 className="stmt stmt--2" style={{ marginTop: 12 }}>
              {promptFor(family, sourcing)}
            </h1>
          </div>
          <div className="spk" style={{ gap: 20 }}>
            <span className="wave" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <i key={index} />
              ))}
            </span>
            <p className="tscript">{transcript || "…"}</p>
          </div>
          <div className="pb__pad">
            <p className="note">Keep going. Ponte structures this after you stop.</p>
          </div>
        </>
      )}

      {phase === "typing" && (
        <>
          <div className="pb__pad" style={{ paddingBottom: 14 }}>
            <span className="lab">In your own words</span>
            <h1 className="stmt stmt--2" style={{ marginTop: 12 }}>
              {statementFor(family, sourcing)}
            </h1>
          </div>
          <div className="si__f">
            <label>
              <span className="lab">What it is</span>
              <input
                type="text"
                autoFocus
                placeholder="Vietnamese white rice, 5% broken"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
              />
            </label>
          </div>
          <div className="pb__pad">
            <p className="note">
              Any language. Ponte matches your words against what it knows and shows you what it
              found, rather than deciding for you.
            </p>
          </div>
        </>
      )}

      {phase === "denied" && (
        <>
          <div className="msg">
            <span className="mk mk--blocked" />
            <h2>Ponte cannot reach the microphone.</h2>
            <p>
              Your browser has not granted access. Nothing you have entered is affected, and you
              can turn it on later in settings.
            </p>
          </div>
          <div className="hr" />
          <div className="pb__pad" style={{ padding: "16px 20px 8px" }}>
            <span className="lab">The other three routes</span>
          </div>
          <div className="rows">
            <button className="row" type="button" onClick={upload.allowed ? () => file.current?.click() : undefined} aria-disabled={!upload.allowed}>
              <span className="gl gl--cam" aria-hidden="true" />
              <span>
                <b>Photograph or upload</b>
                <small>{upload.allowed ? "Held against your account." : upload.reason}</small>
              </span>
              <span className="go">›</span>
            </button>
            <button className="row" type="button" onClick={onBrowse}>
              <span className="gl gl--grid" aria-hidden="true" />
              <span>
                <b>Browse categories</b>
              </span>
              <span className="go">›</span>
            </button>
            <button className="row" type="button" onClick={() => setPhase("typing")}>
              <span className="gl gl--find" aria-hidden="true" />
              <span>
                <b>Type it, with search</b>
              </span>
              <span className="go">›</span>
            </button>
          </div>
        </>
      )}

      {phase === "upload" && (
        <>
          <div className="pb__pad" style={{ paddingBottom: 8 }}>
            <span className="lab">One file</span>
            <h1 className="stmt stmt--2" style={{ marginTop: 12 }}>
              Before this is sent
            </h1>
          </div>
          <div className="disc">
            <p className="prose">
              Ponte holds this against your account. Here is exactly what happens to it.
            </p>
            <ul>
              <li>
                <i aria-hidden="true" />
                <span>
                  <b>What is kept:</b> the file, and the facts you confirm from it. Ponte does not
                  read a document for you and does not claim to.
                </span>
              </li>
              <li>
                <i aria-hidden="true" />
                <span>
                  <b>For how long:</b> 90 days from your last edit to this draft, with a warning 14
                  days and 3 days before.
                </span>
              </li>
              <li>
                <i aria-hidden="true" />
                <span>
                  <b>Who sees it:</b> nobody. Nothing is published or shown to any counterparty by
                  uploading.
                </span>
              </li>
            </ul>
          </div>
          <div className="rows">
            <button className="row" type="button" onClick={() => setPhase("typing")}>
              <span className="gl gl--find" aria-hidden="true" />
              <span>
                <b>Say what is in it</b>
                <small>Fastest route. Any language.</small>
              </span>
              <span className="go">›</span>
            </button>
            <button className="row" type="button" onClick={onSkip}>
              <span className="gl gl--file" aria-hidden="true" />
              <span>
                <b>Continue to the listing</b>
                <small>The document is attached and named on the record</small>
              </span>
              <span className="go">›</span>
            </button>
          </div>
        </>
      )}

      {phase === "candidates" && (
        <>
          <div className="fl__hd">
            <span className="lab">{candidates.length > 0 ? "What Ponte understood" : "Nothing matched"}</span>
            <h1 className="stmt stmt--2" style={{ marginTop: 11 }}>
              {question ?? (candidates.length > 0
                ? "Is this what you trade?"
                : "Ponte does not recognise this yet.")}
            </h1>
            <p className="note">
              Heard as &ldquo;{transcript.trim()}&rdquo;. Your words are kept whichever you choose.
            </p>
          </div>
          {candidates.length > 0 ? (
            <div className="rows">
              {candidates.map((candidate) => (
                <button
                  key={candidate.product.key}
                  className="row"
                  type="button"
                  onClick={() => onProduct(candidate, transcript.trim())}
                >
                  <span className="mk mk--inferred" aria-hidden="true" />
                  <span>
                    <b>{candidate.product.name}</b>
                    <small>
                      {candidate.band === "close"
                        ? "Close match"
                        : candidate.band === "likely"
                          ? "Likely match"
                          : "Possible match"}
                      {" · "}
                      {candidate.product.group}
                    </small>
                  </span>
                  <span className="go">›</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rows">
              <button className="row" type="button" onClick={onBrowse}>
                <span className="gl gl--grid" aria-hidden="true" />
                <span>
                  <b>Browse categories instead</b>
                  <small>Find it by picture rather than by name</small>
                </span>
                <span className="go">›</span>
              </button>
            </div>
          )}
          <div className="rows">
            <button className="row" type="button" onClick={onSkip}>
              <span className="mk" aria-hidden="true" />
              <span>
                <b>None of these. Carry on with my own words.</b>
                <small>Ponte keeps what you said and does not classify it</small>
              </span>
              <span className="go">›</span>
            </button>
          </div>
        </>
      )}
    </Frame>
  );
}
