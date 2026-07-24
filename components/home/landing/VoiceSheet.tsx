"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Genuine voice input as progressive enhancement, using the browser's Web
 * Speech API. There is no server transcription and no credentials in the
 * client: if the browser cannot do it, the sheet says so and points back to
 * typing, which is always available.
 *
 * States: requesting -> listening -> transcript (editable) -> continue, plus
 * the recoverable no-speech, permission-denied, unsupported and error states.
 * Nothing is submitted because the user spoke; "Continue" hands the edited text
 * back to the page, which then classifies it exactly like typed text. The
 * microphone is released on stop, on close, and on unmount.
 */

export interface VoiceLabels {
  title: string;
  requesting: string;
  listening: string;
  ready: string;
  editHint: string;
  noSpeech: string;
  noSpeechHint: string;
  denied: string;
  deniedHint: string;
  unsupported: string;
  unsupportedHint: string;
  errorLabel: string;
  errorHint: string;
  stop: string;
  reRecord: string;
  continueLabel: string;
  tryAgain: string;
  typeInstead: string;
  close: string;
}

type Phase =
  | "requesting"
  | "listening"
  | "transcript"
  | "nospeech"
  | "denied"
  | "unsupported"
  | "error";

// The Web Speech API is not in the TS DOM lib. A minimal shape is enough.
/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognition = any;

function getRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function VoiceSheet({
  open,
  lang,
  labels,
  announce,
  onClose,
  onUse,
}: {
  open: boolean;
  /** BCP-47 language for recognition, e.g. "en-US". */
  lang: string;
  labels: VoiceLabels;
  announce: (message: string) => void;
  onClose: () => void;
  onUse: (text: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("requesting");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef("");

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
  }, []);

  const begin = useCallback(() => {
    const Recognition = getRecognition();
    if (!Recognition) {
      setPhase("unsupported");
      announce(labels.unsupported);
      return;
    }
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setPhase("requesting");

    const rec: SpeechRecognition = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setPhase("listening");
      announce(labels.listening);
    };
    rec.onresult = (event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => {
      let live = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalRef.current += text;
        else live += text;
      }
      setInterim(live);
    };
    rec.onerror = (event: { error?: string }) => {
      const err = event?.error;
      if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
        setPhase("denied");
        announce(labels.denied);
      } else if (err === "no-speech") {
        setPhase("nospeech");
        announce(labels.noSpeech);
      } else if (err === "aborted") {
        // Deliberate stop/close; no state change needed.
      } else {
        setPhase("error");
        announce(labels.errorLabel);
      }
    };
    rec.onend = () => {
      const text = finalRef.current.trim();
      setPhase((current) => {
        if (current === "denied" || current === "nospeech" || current === "error") return current;
        if (text) {
          setTranscript(text);
          announce(labels.ready);
          return "transcript";
        }
        announce(labels.noSpeech);
        return "nospeech";
      });
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setPhase("error");
      announce(labels.errorLabel);
    }
  }, [announce, labels, lang]);

  // Start when opened; release the microphone whenever the sheet closes or the
  // component unmounts (navigation away).
  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    begin();
    return stop;
  }, [open, begin, stop]);

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, stop]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const close = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  const body = () => {
    switch (phase) {
      case "requesting":
        return (
          <div>
            <div className="voice__status">{labels.requesting}</div>
          </div>
        );
      case "listening":
        return (
          <div>
            <div className="voice__status">{labels.listening}</div>
            <div className="wave" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
            {interim ? <p className="voice__hint">{interim}</p> : null}
            <div className="voice__row">
              <button type="button" className="btn btn--secondary btn--block" onClick={stopListening}>
                {labels.stop}
              </button>
            </div>
          </div>
        );
      case "transcript":
        return (
          <div>
            <div className="voice__status voice__status--ok">{labels.ready}</div>
            <textarea
              className="voice__transcript"
              rows={2}
              dir="auto"
              value={transcript}
              aria-label={labels.editHint}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <p className="voice__hint-edit">{labels.editHint}</p>
            <div className="voice__row">
              <button type="button" className="btn btn--secondary btn--block" onClick={begin}>
                {labels.reRecord}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => onUse(transcript.trim())}
                disabled={!transcript.trim()}
              >
                {labels.continueLabel}
              </button>
            </div>
          </div>
        );
      case "nospeech":
        return (
          <div>
            <div className="voice__status voice__status--warn">{labels.noSpeech}</div>
            <p className="voice__hint">{labels.noSpeechHint}</p>
            <div className="voice__row">
              <button type="button" className="btn btn--secondary btn--block" onClick={close}>
                {labels.typeInstead}
              </button>
              <button type="button" className="btn btn--primary btn--block" onClick={begin}>
                {labels.tryAgain}
              </button>
            </div>
          </div>
        );
      case "denied":
        return (
          <div>
            <div className="voice__status voice__status--warn">{labels.denied}</div>
            <p className="voice__hint">{labels.deniedHint}</p>
            <div className="voice__row">
              <button type="button" className="btn btn--primary btn--block" onClick={close}>
                {labels.typeInstead}
              </button>
            </div>
          </div>
        );
      case "unsupported":
        return (
          <div>
            <div className="voice__status voice__status--warn">{labels.unsupported}</div>
            <p className="voice__hint">{labels.unsupportedHint}</p>
            <div className="voice__row">
              <button type="button" className="btn btn--primary btn--block" onClick={close}>
                {labels.typeInstead}
              </button>
            </div>
          </div>
        );
      case "error":
      default:
        return (
          <div>
            <div className="voice__status voice__status--warn">{labels.errorLabel}</div>
            <p className="voice__hint">{labels.errorHint}</p>
            <div className="voice__row">
              <button type="button" className="btn btn--secondary btn--block" onClick={close}>
                {labels.typeInstead}
              </button>
              <button type="button" className="btn btn--primary btn--block" onClick={begin}>
                {labels.tryAgain}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`voice${open ? " open" : ""}`} hidden={!open}>
      <div className="voice__scrim" onClick={close} />
      <div className="voice__panel" role="dialog" aria-modal="true" aria-label={labels.title}>
        <div className="voice__grip" />
        <div className="voice__head">
          <span className="voice__title">{labels.title}</span>
          <button type="button" className="iconbtn" onClick={close} aria-label={labels.close}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {body()}
      </div>
    </div>
  );
}
