"use client";

import { useState } from "react";
import Arc from "./Arc";
import Chrome, { type Signal } from "./Chrome";
import Grain from "./Grain";

/**
 * The Phase 1 specimen: every part of the system, on one sheet.
 *
 * Not a screen. The surfaces come in Phase 2; this is the system they are made
 * of, laid out so each piece can be judged on sight rather than from a
 * description. The five script buttons are here for the same reason: the Arabic
 * mirroring and the tracking rules are either right or wrong at a glance, and
 * nothing else reveals them.
 *
 * The four non-English strings are the prototype's own, unreviewed, and are NOT
 * copy. They exist to prove the type and the mirroring. `messages/en.json` is
 * untouched, per `ADR-0032-AMENDMENT-1`.
 */

const SIGNALS: Signal[] = [
  { subject: "Gas oil EN 590", volume: "30,000 MT", corridor: "TR to CIF" },
  { subject: "Sunflower oil", volume: "5,000 MT", corridor: "to EG" },
  { subject: "Freight forwarding", volume: "Adriatic", corridor: "to Levant" },
  { subject: "Urea 46%", volume: "12,500 MT", corridor: "to BR" },
  { subject: "White sugar I45", volume: "25,000 MT", corridor: "to DZ" },
  { subject: "Bunker VLSFO", volume: "12,000 MT", corridor: "to MT" },
];

const PROCEDURE = ["Admitted", "Terms", "Evidence", "Inspection", "Payment", "Closed"];

/** Script specimens. Unreviewed, and here to prove the type, not to be read. */
const SCRIPTS = [
  { code: "en", dir: "ltr", name: "English", headline: ["What's ", "your deal?"] },
  { code: "ru", dir: "ltr", name: "Русский", headline: ["В чём ", "ваша сделка?"] },
  { code: "zh", dir: "ltr", name: "中文", headline: ["您的", "交易是什么？"] },
  { code: "ar", dir: "rtl", name: "العربية", headline: ["ما هي ", "صفقتك؟"] },
  { code: "es", dir: "ltr", name: "Español", headline: ["¿Cuál es ", "tu trato?"] },
] as const;

export default function BridgeSpecimen() {
  const [script, setScript] = useState<(typeof SCRIPTS)[number]>(SCRIPTS[0]);
  const [current, setCurrent] = useState(2);

  return (
    <div className="brg" lang={script.code} dir={script.dir}>
      <Grain />
      {/* The specimen used to hand Chrome its own invented navigation, which is
          how a design sheet ends up teaching a vocabulary the product does not
          have. Chrome now draws the signal tape only; the masthead belongs to
          GlobalHeader. */}
      <Chrome signals={SIGNALS} />

      <div className="brg-mx brg-band">
        <div className="brg-band__head">
          <h1 className="brg-headline">
            {script.headline[0]}
            <em>{script.headline[1]}</em>
          </h1>
          <div className="brg-band__now">
            <div className="brg-eyebrow">Phase 1, the system</div>
            <p className="brg-note" style={{ marginTop: 10, opacity: .55 }}>
              Nothing user-facing changes. The arc, the chrome, the shells, the scripts and the
              motion, on one sheet so each can be judged on sight.
            </p>
          </div>
        </div>

        {/* Hero: the iconic crossing, drawn on load. */}
        <Arc size="hero" total={4} current={current} traffic />
      </div>

      <div className="brg-mx brg-cols">
        <div className="brg-col">
          <div className="brg-eyebrow">The arc, three sizes</div>
          <p className="brg-note" style={{ marginBlock: "10px 18px" }}>
            One radius derived from the chord and the rise, one SVG A command. Never a polyline,
            never an ellipse. Proved point by point in the test, not by eye.
          </p>
          <div className="brg-eyebrow" style={{ opacity: .5 }}>Procedure, with labels</div>
          <Arc size="procedure" total={5} current={2} labels={PROCEDURE} />
          <div className="brg-eyebrow" style={{ opacity: .5, marginTop: 18 }}>Portfolio mini</div>
          <Arc size="mini" total={5} current={3} />
          <p className="brg-note" style={{ marginTop: 14 }}>
            The arc is never a target. It carries pointer-events: none, so a row that contains one
            stays clickable and the arc itself can never be the thing hit.
          </p>
        </div>

        <div className="brg-col">
          <div className="brg-eyebrow">The deck is the progress</div>
          <p className="brg-note" style={{ marginBlock: "10px 18px" }}>
            It draws itself as the member answers, and there is no numeral in a progress role
            anywhere near it. Move it and watch the span extend.
          </p>
          {[0, 1, 2, 3, 4].map((step) => (
            <button
              className="brg-item"
              type="button"
              key={step}
              data-chosen={current === step ? "true" : undefined}
              onClick={() => setCurrent(step)}
            >
              <span className="brg-eyebrow" style={{ opacity: .45 }}>
                {String(step).padStart(2, "0")}
              </span>
              <span style={{ display: "block", fontFamily: "var(--brg-serif)", fontSize: 20, marginTop: 6 }}>
                {step === 0 ? "Not started" : step === 4 ? "Crossed" : `Node ${step} reached`}
              </span>
            </button>
          ))}
        </div>

        <div className="brg-col">
          <div className="brg-eyebrow">State, on the ink ground</div>
          <p className="brg-note" style={{ marginBlock: "10px 18px" }}>
            The existing --done and --blocked, lightened for ink with hue and saturation held
            exactly, measured through the grain rather than against the flat token.
          </p>
          <div className="brg-row">
            <span className="brg-row__label">Both organisations exist on a public register</span>
            <span className="brg-row__value" data-state="checked">Checked</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">Authority to sign, declared by each party</span>
            <span className="brg-row__value" data-state="waiting">Declared, not proved</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">Ability to pay</span>
            <span className="brg-row__value" data-state="unproved">Never checked</span>
          </div>
          <p className="brg-note" style={{ marginTop: 14 }}>
            A check Ponte performed is named. A check Ponte has not performed is named too.
          </p>
        </div>
      </div>

      {/* The reversed cream ledger. On the phone it rises from the bottom. */}
      <div className="brg-ledger" data-ground="cream" style={{ marginTop: 52 }}>
        <div className="brg-ledger__inner">
          <div className="brg-eyebrow">The same tokens, reversed</div>
          <p className="brg-note" style={{ marginBlock: "10px 18px", opacity: .55 }}>
            Nothing switches colour by hand. A surface declares its ground and the semantic tokens
            resolve to the pair for it, so a component is correct on both without knowing which it
            is on.
          </p>
          <div className="brg-row">
            <span className="brg-row__label">Restricted-party screening, both sides</span>
            <span className="brg-row__value" data-state="checked">Checked</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">Product specification against the shipment</span>
            <span className="brg-row__value" data-state="unproved">Not supplied</span>
          </div>
        </div>
      </div>

      <div className="brg-mx" style={{ paddingBlock: "36px 80px" }}>
        <div className="brg-eyebrow">Five scripts</div>
        <p className="brg-note" style={{ marginBlock: "10px 16px" }}>
          Tracking goes to zero for Arabic, because letter-spacing breaks the joins and the words
          come apart. Reduced for Chinese. Arabic mirrors the whole shell, including the span and
          the tape, from logical properties alone.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SCRIPTS.map((entry) => (
            <button
              className="brg-item"
              type="button"
              key={entry.code}
              data-chosen={script.code === entry.code ? "true" : undefined}
              style={{ width: "auto", paddingInlineEnd: 18, borderBlockStart: 0 }}
              onClick={() => setScript(entry)}
            >
              <span className="brg-eyebrow">{entry.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
