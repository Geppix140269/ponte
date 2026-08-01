"use client";

import { useState } from "react";
import { PREVIEW_LANGUAGES, STAYS_PRIVATE } from "@/lib/deal-room/screens-example";

/**
 * Screen 3: what an invited party sees, in each of the five languages.
 *
 * From `Ponte Deal Room - Four New Screens v1.html`. Two jobs on one surface,
 * because they answer the same question: what will they see?
 *
 * ## The frame is persistent chrome, and that was a decision
 *
 * The design brief asked whether this should be chrome, a mode toggle or a
 * separate route. The drawing answers chrome, and gives the reason: a mode
 * toggle is too easy to forget you left on, and a separate route loses the
 * owner's context at the exact moment they are deciding what to expose.
 *
 * So: a 3px ink border, a hatched margin, and an ink bar that cannot be
 * dismissed. It says it in words as well - "This is what an invited party
 * sees. It is not your room." - and carries one explicit exit. There is no way
 * to forget which view you are in.
 *
 * ## The language switch lives in the chrome, not in a footer
 *
 * Multilingual operation is a headline reason the room keeps being used after
 * the counterparty is known (ADR-0027), so it is not a preference buried at
 * the bottom. The preview renders the language the COUNTERPARTY chose, not the
 * owner's, which is the whole point of looking.
 *
 * Arabic flips the entire composition through logical properties. There is no
 * second stylesheet: `padding-inline`, `margin-inline` and `border-inline` do
 * the work, and `dir` on the root does the rest.
 *
 * ## Mixed direction is isolated, not hoped for
 *
 * A reference, a date, an HS code and a quantity keep their own left-to-right
 * order inside an Arabic sentence, in `.ltr` islands with `unicode-bidi:
 * isolate`. Without it `DR-2041` reverses mid-paragraph, which is the class of
 * bug that makes a product look untrustworthy in a language its authors do not
 * read.
 */
export default function CounterpartyPreview({ idPrefix = "pv" }: { idPrefix?: string }) {
  const [code, setCode] = useState(PREVIEW_LANGUAGES[0].code);
  const language = PREVIEW_LANGUAGES.find((l) => l.code === code) ?? PREVIEW_LANGUAGES[0];

  return (
    <div className="dm">
      <div className="pv">
        <div className="pv__bar">
          <i aria-hidden="true" />
          <b>Counterparty preview</b>
          <span className="w">This is what an invited party sees. It is not your room.</span>
          <span className="x">
            {/* The switch is in the chrome, and it is a real control. */}
            <span className="lang" role="group" aria-label="Preview language">
              {PREVIEW_LANGUAGES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={option.code === code}
                  onClick={() => setCode(option.code)}
                >
                  {option.code}
                </button>
              ))}
            </span>
            <span className="dmb dmb--2 dmb--sm" aria-disabled="true">
              Leave preview
            </span>
          </span>
        </div>

        {/*
          `lang` and `dir` on the rendered room, not on the chrome. The owner's
          own interface stays in their language while the preview speaks the
          counterparty's, which is the distinction the whole screen exists for.
        */}
        <div className="pv__in">
          <div className="dm" lang={language.lang} dir={language.dir}>
            <header className="pres">
              <p className="pres__t">
                <span>{language.kicker}</span>
                {/* Isolated: a reference must not reverse inside an Arabic line. */}
                <span className="ltr mono">DR-2041</span>
                <span className="r">
                  <span className="pres__seal">
                    <i aria-hidden="true" />
                    {language.published}
                  </span>
                </span>
              </p>

              <h1 id={`${idPrefix}-title`}>{language.title}</h1>
              <p className="pres__by">
                <span className="ltr">{language.by}</span>
              </p>

              <dl className="pres__f">
                {language.facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </header>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              <div className="rg">
                <div className="rg__h">
                  <b>{language.stage}</b>
                  <span>{language.stageValue}</span>
                </div>
              </div>
              <div className="rg">
                <div className="rg__h">
                  <b>{language.evidence}</b>
                  <span>{language.evidenceValue}</span>
                </div>
              </div>
              <p className="rgz__a">
                <span className="dmb" aria-disabled="true">
                  {language.cta}
                </span>
              </p>
              <p className="dmnote" style={{ fontFamily: "var(--pf-f-mono)", fontSize: 10.5, color: "var(--pf-ink-3)" }}>
                {language.note}
              </p>
            </div>
          </div>
        </div>

        <p className="pv__foot">
          Preview language: {language.name}. Your own interface is unchanged.
        </p>
      </div>

      {/* A stated list of six. Never an implication. */}
      <section className="dmsec" style={{ marginTop: 20 }} aria-labelledby={`${idPrefix}-priv`}>
        <h3 id={`${idPrefix}-priv`}>
          What stays private
          <span>Six things they never see, whatever they are shown</span>
        </h3>
        <div className="priv">
          {STAYS_PRIVATE.map(([title, detail], index) => (
            <div key={title}>
              <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
              <span>
                <b>{title}</b>
                <span>{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
