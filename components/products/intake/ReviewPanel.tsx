"use client";

import { useState } from "react";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
// From `terms`, not `extract-document`: the extraction reaches the model, which
// reaches Supabase's admin client, and neither belongs in a browser bundle.
import { TERM_KEYS, TERM_LABELS, type CommercialTerms } from "@/lib/products/terms";
import { SOMETHING_ELSE, optionsFor } from "@/lib/products/term-options";
import { type ReviewState } from "@/lib/products/intake";
import type { Provenance, SourcedValue } from "@/lib/products/model";

/**
 * Optional commercial terms, grouped for progressive disclosure.
 *
 * The review screen used to print all thirteen terms as thirteen "Not stated"
 * rows, each with its own Add control, and then warn that thirteen terms were
 * unstated. That was the schema-as-interface pattern the North Star forbids: a
 * member describing "cement, 10,000 tonnes" was met with a blank contract
 * editor and told the empty rows were a problem, before any draft even existed.
 *
 * Stated terms show directly. The ones the member has not given are optional,
 * grouped into these three clear sections, and collapsed behind one control
 * rather than expanded all at once. Adding them here is an improvement to the
 * draft, never a prerequisite for creating it, and contract-level detail
 * (counterparties, signatories) is the last group rather than an early demand.
 */
const OPTIONAL_TERM_GROUPS: { label: string; keys: (keyof CommercialTerms)[] }[] = [
  {
    label: "Quantity and delivery",
    keys: ["quantity", "unit", "recurrence", "origin", "destination", "incoterm", "availability"],
  },
  { label: "Pricing and payment", keys: ["pricingBasis", "paymentStructure"] },
  { label: "Contract detail", keys: ["contractTerm", "validity", "counterparties", "signatories"] },
];

/**
 * The trust boundary. Nothing has been created when this renders, and nothing
 * is created until the member presses the button at the bottom of it.
 *
 * ## Four states, never three and never one
 *
 * Design Constitution section 14: evidence, declaration, review and
 * verification are separate, and no single generic verified treatment may
 * collapse them. The decision record names the four this journey must show:
 *
 *   Extracted from document   a claim the document makes. Ponte repeats it and
 *                             shows the words it came from. Not a fact yet.
 *   Confirmed by member       the member stated or corrected it.
 *   Verified by Ponte         rendered as NOT AVAILABLE, because Ponte does not
 *                             verify product claims on this journey. An empty
 *                             box here would imply a verification a member
 *                             could obtain, which is the manufactured trust
 *                             North Star 5.2 forbids. Removing the row would
 *                             collapse four states into three.
 *   Missing or unresolved     the document did not say, and nor has the member.
 *
 * Each is carried by a word AND by marker geometry (dashed square, filled
 * circle, dotted circle, rule) before any colour is applied, so the distinction
 * survives greyscale and colour blindness. Section 18.
 *
 * ## Every extracted value shows its quote
 *
 * The verbatim words are printed under the value. That is what makes "extracted"
 * mean something a member can check rather than a badge they learn to ignore,
 * and it is the visible half of the parser rule that discards any term the
 * model could not quote.
 */

/** Exported so a test can assert the four states are four different words. */
export const PROVENANCE_WORD: Record<Provenance, string> = {
  extracted: "Extracted from document",
  ai_identified: "Identified by Ponte, not yet confirmed",
  member_confirmed: "Confirmed by you",
  ponte_verified: "Verified by Ponte",
  missing: "Not stated",
};

const PROVENANCE_CLASS: Record<Provenance, string> = {
  extracted: "pprov pprov--extracted",
  ai_identified: "pprov pprov--identified",
  member_confirmed: "pprov pprov--member",
  ponte_verified: "pprov pprov--ponte",
  missing: "pprov pprov--missing",
};

function ProvenanceMark({ provenance }: { provenance: Provenance }) {
  return <span className={PROVENANCE_CLASS[provenance]}>{PROVENANCE_WORD[provenance]}</span>;
}

/**
 * Normalise an attribute string for comparison.
 *
 * `sulfur` and `sulphur` are the same element written on two sides of an
 * ocean, and both appear constantly in real trade documents: the acceptance
 * fixture writes "Ultra Low Sulfur Diesel" while Ponte's catalogue writes
 * "Sulphur content". `max` and `maximum` are the same qualifier. Neither pair
 * is worth printing twice.
 */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/sulfur/g, "sulphur")
    .replace(/\bmax\b/g, "maximum")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Does the document already state this catalogue attribute?
 *
 * True only when the **values agree**. A document saying 50 ppm where Ponte's
 * record says 10 ppm is a disagreement the member has to see, and hiding
 * either half would be the review screen resolving a question that is not its
 * to resolve.
 *
 * Labels match loosely, by prefix, so "Sulfur" and "Sulphur content" are one
 * row rather than two identical ones.
 */
function statesSame(
  stated: { label: string; value: string },
  attribute: { label: string; value: string },
): boolean {
  if (fold(stated.value) !== fold(attribute.value)) return false;
  const a = fold(stated.label);
  const b = fold(attribute.label);
  return a === b || a.startsWith(b) || b.startsWith(a);
}

/**
 * One commercial term, and how the member states it.
 *
 * A member never types a value the product already knows. Where the term has a
 * vocabulary - Incoterm, Unit, Origin, Destination, Recurrence, Availability -
 * this offers that vocabulary and the member picks. Typing is reached only
 * through "Something else", for the case the list does not cover.
 *
 * Every row here used to be a blank box, including the ones whose answers are
 * fixed international codes. That asked a trader to spell FOB, and let two
 * members write "MT" and "metric tonnes" for the same thing.
 *
 * Terms with no canonical vocabulary yet - a quantity, a date range, a pricing
 * basis - stay typed, because a list invented here would teach a vocabulary the
 * product does not hold. `lib/products/term-options.ts` records which are which,
 * and why.
 */
function TermRow({
  label,
  value,
  options,
  onEdit,
}: {
  label: string;
  value: SourcedValue;
  options?: readonly string[] | null;
  onEdit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.value ?? "");
  // Set when the member picks "Something else", so the text box appears only
  // once they have said the list does not cover them.
  const [freeText, setFreeText] = useState(false);

  const save = (next: string) => {
    onEdit(next);
    setEditing(false);
    setFreeText(false);
  };

  const picking = editing && options && options.length > 0 && !freeText;

  return (
    <div className="prow">
      <span className="prow__k">{label}</span>
      {picking ? (
        <select
          className="prow__v prow__sel"
          aria-label={label}
          autoFocus
          defaultValue={value.value && options.includes(value.value) ? value.value : ""}
          onChange={(e) => {
            if (e.target.value === SOMETHING_ELSE) {
              setDraft(value.value ?? "");
              setFreeText(true);
              return;
            }
            if (e.target.value !== "") save(e.target.value);
          }}
        >
          <option value="">Choose {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={SOMETHING_ELSE}>Something else, let me type it</option>
        </select>
      ) : editing ? (
        <>
          <input
            className="snote hssearch prow__v"
            style={{ minHeight: "auto", padding: "6px 10px" }}
            aria-label={label}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="button" className="prow__e" onClick={() => save(draft)}>
            Save
          </button>
        </>
      ) : (
        <>
          <span className={value.value ? "prow__v" : "prow__v ns"}>{value.value ?? "Not stated"}</span>
          <ProvenanceMark provenance={value.provenance} />
          <button type="button" className="prow__e" onClick={() => setEditing(true)}>
            {value.value ? "Change" : "Add"}
          </button>
        </>
      )}
      {value.quote ? (
        <span className="prow__q">
          {/* The document's own words. Never paraphrased, never shortened past
              the point of being checkable. */}
          {`"${value.quote}"`}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The optional terms, collapsed by default.
 *
 * Every row is still rendered, so the wiring to the reducer and the four
 * provenance states are unchanged, but the whole group is hidden until the
 * member opts in, so the review never opens on a wall of empty fields. The
 * `hidden` attribute rather than a conditional keeps the fields present for
 * keyboard users who tab into the opened panel and for the state evidence.
 */
function OptionalTerms({
  keys,
  shared,
  onEditShared,
}: {
  keys: (keyof CommercialTerms)[];
  shared: CommercialTerms;
  onEditShared: (key: keyof CommercialTerms, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (keys.length === 0) return null;

  return (
    <div className="pintake__optional">
      <button
        type="button"
        className="fbtn fbtn--ghost"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide optional terms" : `Add commercial terms (${keys.length} optional)`}
      </button>
      <div className="pintake__optbody" hidden={!open}>
        <p className="pintake__note">
          These are optional. Add any that help now, or create the draft and add delivery, pricing and contract detail
          on the record when you are ready.
        </p>
        {OPTIONAL_TERM_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => keys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <div className="prev__g" key={group.label}>
              <div className="prev__gl">{group.label}</div>
              {groupKeys.map((key) => (
                <TermRow
                  key={key}
                  label={TERM_LABELS[key]}
                  value={shared[key]}
                  options={optionsFor(key)}
                  onEdit={(next) => onEditShared(key, next)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface ReviewPanelProps {
  review: ReviewState;
  intentLabel: string;
  onEditShared: (key: keyof CommercialTerms, value: string) => void;
  onEditProduct: (id: string, key: keyof CommercialTerms, value: string) => void;
  onToggleProduct: (id: string) => void;
  onConfirm: () => void;
  /** Honest limits recorded by the extraction, shown rather than swallowed. */
  notes?: readonly string[];
}

export default function ReviewPanel({
  review,
  intentLabel,
  onEditShared,
  onEditProduct,
  onToggleProduct,
  onConfirm,
  notes = [],
}: ReviewPanelProps) {
  const included = review.products.filter((p) => p.included);
  const many = review.products.length > 1;
  // Terms the member or the document actually gave, shown directly, versus the
  // ones still open, which are optional and collapsed rather than dumped.
  const statedShared = TERM_KEYS.filter((key) => review.shared[key].provenance !== "missing");
  const optionalShared = TERM_KEYS.filter((key) => review.shared[key].provenance === "missing");

  return (
    <section className="sstep reveal">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">Review before anything is created</span>
      </div>
      <h1 className="pintake__lead">
        Check what Ponte understood, <em>then confirm it.</em>
      </h1>
      <p className="pintake__sub">
        Nothing has been created or published. {intentLabel} Ponte has structured what you gave it and marked where each
        fact came from. Change anything that is wrong before you continue.
      </p>

      {review.document ? (
        <p className="prev__doc">
          <PonteIcon name="profile.document" size={20} />
          <span>
            {review.document.filename} stays with this intake for the length of your session. Ponte does not store your
            document yet, so re-attach it if you want it kept with the draft.
          </span>
        </p>
      ) : null}

      <div className="prev">
        {review.products.map((product) => (
          <div className="prev__g" key={product.id}>
            <div className="prev__gl">
              {many ? `Product: ${product.product.normalised}` : "Product"}
            </div>

            {/* What the member or the document actually said. */}
            <div className="prow">
              <span className="prow__k">Your words</span>
              <span className="prow__v">{product.product.originalWording}</span>
              <ProvenanceMark provenance={product.product.provenance} />
            </div>
            {product.documentAttributes.map((attribute) => (
              <div className="prow" key={`doc-${attribute.key}`}>
                <span className="prow__k">{attribute.label}</span>
                <span className="prow__v">{attribute.value}</span>
                <ProvenanceMark provenance="extracted" />
              </div>
            ))}

            {/*
              What PONTE made of it. Deliberately without a provenance marker.

              The normalised product, its category and its technical attributes
              come from Ponte's product record, not from the document and not
              from the member. Marking them "Extracted from document" was a
              false provenance claim on the one screen that must not make any,
              and marking them "Confirmed by you" would claim a confirmation
              that has not happened yet: this screen is where it happens.
            */}
            <div className="prow">
              <span className="prow__k">Ponte product</span>
              <span className="prow__v">{product.product.normalised}</span>
            </div>
            <div className="prow">
              <span className="prow__k">Category</span>
              <span className="prow__v">{product.product.categoryPath.join(" / ")}</span>
            </div>
            {/*
              A catalogue attribute the document already stated, in the same
              words, is not shown twice.

              Only when they AGREE. A document that says 50 ppm where Ponte's
              record says 10 ppm is a disagreement the member has to see, and
              hiding either half of it would be the review screen deciding a
              question that is not its to decide.
            */}
            {product.product.attributes
              .filter(
                (attribute) =>
                  !product.documentAttributes.some((stated) => statesSame(stated, attribute)),
              )
              .map((attribute) => (
                <div className="prow" key={attribute.key}>
                  <span className="prow__k">{attribute.label}</span>
                  <span className="prow__v">{attribute.value}</span>
                </div>
              ))}
            <div className="prow">
              <span className="prow__k">Customs classification</span>
              <span className={product.product.candidateHs ? "prow__v" : "prow__v ns"}>
                {product.product.candidateHs
                  ? `HS ${product.product.candidateHs.code}, suggested. You confirm it later.`
                  : "None suggested yet"}
              </span>
              {product.product.candidateHs ? null : <ProvenanceMark provenance="missing" />}
            </div>
            <p className="pintake__note">
              The four rows above are Ponte&apos;s product record, not claims from your document. Confirming below
              accepts them.
            </p>
            <div className="prow">
              <span className="prow__k">Verified by Ponte</span>
              <span className="prow__v ns">Not available on this journey</span>
              <ProvenanceMark provenance="ponte_verified" />
            </div>

            {TERM_KEYS.filter((key) => product.terms[key].provenance !== "missing").map((key) => (
              <TermRow
                key={key}
                label={`${TERM_LABELS[key]}, this product`}
                value={product.terms[key]}
                options={optionsFor(key)}
                onEdit={(next) => onEditProduct(product.id, key, next)}
              />
            ))}

            {many ? (
              <div className="pintake__row">
                <button type="button" className="fbtn fbtn--ghost" onClick={() => onToggleProduct(product.id)}>
                  {product.included ? "Leave this product out" : "Include this product"}
                </button>
              </div>
            ) : null}
          </div>
        ))}

        <div className="prev__g">
          <div className="prev__gl">{many ? "Terms shared by every product" : "Commercial terms"}</div>
          {statedShared.length > 0 ? (
            statedShared.map((key) => (
              <TermRow
                key={key}
                label={TERM_LABELS[key]}
                value={review.shared[key]}
                options={optionsFor(key)}
                onEdit={(next) => onEditShared(key, next)}
              />
            ))
          ) : (
            <p className="pintake__note">
              No commercial terms yet. They are optional: add any below now, or on the draft once it is created.
            </p>
          )}
          <OptionalTerms keys={optionalShared} shared={review.shared} onEditShared={onEditShared} />
        </div>
      </div>

      {notes.length > 0 ? (
        <ul className="pintake__limits">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="fbtn fbtn--lg fbtn--block"
          disabled={included.length === 0}
          onClick={onConfirm}
        >
          {review.plan === "separate" && included.length > 1
            ? `Confirm and create ${included.length} drafts`
            : review.plan === "programme"
              ? "Confirm and create one supply programme"
              : "Confirm and create the draft"}
        </button>
        {included.length === 0 ? (
          <p className="pintake__note">Include at least one product to continue.</p>
        ) : null}
      </div>
    </section>
  );
}
