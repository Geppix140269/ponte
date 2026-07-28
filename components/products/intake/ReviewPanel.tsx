"use client";

import { useState } from "react";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
// From `terms`, not `extract-document`: the extraction reaches the model, which
// reaches Supabase's admin client, and neither belongs in a browser bundle.
import { TERM_KEYS, TERM_LABELS, type CommercialTerms } from "@/lib/products/terms";
import { incompleteTerms, type ReviewState } from "@/lib/products/intake";
import type { Provenance, SourcedValue } from "@/lib/products/model";

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

function TermRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: SourcedValue;
  onEdit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.value ?? "");

  return (
    <div className="prow">
      <span className="prow__k">{label}</span>
      {editing ? (
        <>
          <input
            className="snote hssearch prow__v"
            style={{ minHeight: "auto", padding: "6px 10px" }}
            aria-label={label}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            className="prow__e"
            onClick={() => {
              onEdit(draft);
              setEditing(false);
            }}
          >
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
  const open = incompleteTerms(review);
  const included = review.products.filter((p) => p.included);
  const many = review.products.length > 1;

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
          {TERM_KEYS.map((key) => (
            <TermRow
              key={key}
              label={TERM_LABELS[key]}
              value={review.shared[key]}
              onEdit={(next) => onEditShared(key, next)}
            />
          ))}
        </div>
      </div>

      {open.length > 0 ? (
        <p className="pintake__note">
          {open.length} {open.length === 1 ? "term is" : "terms are"} still unstated. Ponte will not guess them. You can
          continue and complete them on the record, or add them here.
        </p>
      ) : null}

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
