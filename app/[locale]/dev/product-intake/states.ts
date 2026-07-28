/**
 * Every state of the product intake, built as a value.
 *
 * Constitution section 21 requires desktop and 390 x 844 evidence of the states
 * a change touches, and section 19 makes a happy-path-only component
 * incomplete. Several of this journey's states cannot be produced on demand in
 * a browser without breaking something on purpose: a blocked file format needs
 * a legacy binary to hand, an extraction failure needs the model to be down,
 * and a resumed session needs the member to have left and come back.
 *
 * So each one is constructed here, from the real reducer, and rendered by the
 * gallery route beside this file. Nothing is mocked: these are the same values
 * the running journey produces, driven through the same transitions.
 *
 * The gallery is development-only and 404s in production.
 */

import { readFileSync } from "node:fs";
import { parseExtraction } from "@/lib/products/extract-document";
import {
  intakeReducer,
  newSession,
  rehydrate,
  serialise,
  type IntakeAction,
  type IntakeSession,
} from "@/lib/products/intake";
import { resolveProduct } from "@/lib/products/resolve";
import { scanForProducts } from "@/lib/products/scan";

function drive(...actions: IntakeAction[]): IntakeSession {
  return actions.reduce(intakeReducer, newSession("offer_product"));
}

const fixture = readFileSync("lib/products/__tests__/fixtures/multi-product-sco.txt", "utf8");

const multiExtraction = parseExtraction(
  {
    intent: { value: "offer", quote: "confirm the availability of Gasoil 10ppm" },
    terms: {
      quantity: { value: "200,000 MT", quote: "Quantity available: 200,000 MT per month, per product" },
      recurrence: { value: "Monthly", quote: "200,000 MT per month, per product" },
      incoterm: { value: "CIF", quote: "immediate shipment on CIF basis to Houston Port" },
      destination: { value: "Houston Port", quote: "CIF basis to Houston Port, or any other safe world port" },
      origin: { value: "Asia, West Africa, India", quote: "Origin: Asia / West Africa / India" },
      contractTerm: { value: "24 months", quote: "Contract structure: 24-month term contract" },
      pricingBasis: { value: "Local Platts minus 50 USD per MT", quote: "Pricing: local Platts minus 50 USD per MT" },
      paymentStructure: {
        value: "30 percent on signing, 70 percent at loading",
        quote: "Payment terms: 30 percent / 70 percent",
      },
      validity: { value: "Expires 31 July 2026", quote: "Expiring date: 31 July 2026" },
    },
  },
  { filename: "supply-offer.txt", scanned: scanForProducts(fixture), modelRead: true },
);

const singleExtraction = parseExtraction(
  {
    intent: { value: "offer", quote: "we can supply Jet A-1" },
    terms: {
      quantity: { value: "50,000 MT", quote: "50,000 MT per month" },
      incoterm: { value: "FOB", quote: "FOB Rotterdam" },
    },
  },
  {
    filename: "jet-offer.txt",
    scanned: scanForProducts("We can supply Jet A-1 to ASTM D1655, 50,000 MT per month, FOB Rotterdam."),
    modelRead: true,
  },
);

const reviewSession = drive(
  { type: "chooseMethod", method: "describe" },
  { type: "resolution", outcome: resolveProduct("EN 590 diesel") },
  { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
);

const confirmedSession = intakeReducer(reviewSession, { type: "confirm" });
const draftedSession = intakeReducer(confirmedSession, { type: "draftCreated", ref: "PT-2026-0001" });

/** One capture, with the name the evidence run uses for its file. */
export interface GalleryState {
  id: string;
  title: string;
  /** Why this state exists, so the evidence is readable without the brief. */
  note: string;
  session: IntakeSession;
}

export const GALLERY: readonly GalleryState[] = [
  { id: "initial", title: "Initial", note: "Three routes across. Nothing chosen, and no percentage shown.", session: newSession("offer_product") },
  {
    id: "typing",
    title: "Typing",
    note: "The member's own words, echoed as given.",
    session: drive({ type: "chooseMethod", method: "describe" }, { type: "type", wording: "gas oil" }),
  },
  {
    id: "voice",
    title: "Voice input",
    note: "Dictation, in any language, landing in the same editable field.",
    session: drive({ type: "chooseMethod", method: "describe" }, { type: "type", wording: "gasolio" }, { type: "voiceStart" }),
  },
  {
    id: "upload",
    title: "Upload",
    note: "The document intake, before a file is chosen.",
    session: drive({ type: "chooseMethod", method: "upload" }),
  },
  {
    id: "analysing",
    title: "Analysing",
    note: "Work happening now, named in the member's words.",
    session: drive({ type: "analyse", method: "describe", what: "gas oil" }),
  },
  {
    id: "analysing-document",
    title: "Analysing a document",
    note: "The same primitive, reading an upload.",
    session: drive({ type: "documentChosen", filename: "supply-offer.pdf", bytes: 337_600 }),
  },
  {
    id: "resolved",
    title: "Resolved",
    note: "One product, its matched terms, its category path and a suggested classification.",
    session: drive({ type: "chooseMethod", method: "describe" }, { type: "resolution", outcome: resolveProduct("ULSD") }),
  },
  {
    id: "candidates",
    title: "Multiple candidates",
    note: "A clear leader with the rest still visible.",
    session: drive({ type: "chooseMethod", method: "describe" }, { type: "resolution", outcome: resolveProduct("EN 590") }),
  },
  {
    id: "ambiguous",
    title: "Ambiguous",
    note: "The acceptance case. `gas oil` asks which grade, and pre-selects nothing.",
    session: drive({ type: "chooseMethod", method: "describe" }, { type: "resolution", outcome: resolveProduct("gas oil") }),
  },
  {
    id: "unmatched",
    title: "Not recognised",
    note: "What Ponte looked for, and both other routes offered. Never a blank screen.",
    session: drive(
      { type: "chooseMethod", method: "describe" },
      { type: "resolution", outcome: resolveProduct("intergalactic widgets") },
    ),
  },
  {
    id: "browse",
    title: "Browse",
    note: "The HS drill-down, retained and unchanged. Available, and not the default.",
    session: drive({ type: "chooseMethod", method: "browse" }),
  },
  {
    id: "extracted",
    title: "Document read, one product",
    note: "Nothing created yet.",
    session: drive({ type: "extraction", extraction: singleExtraction }),
  },
  {
    id: "multi-product",
    title: "Multi-product document",
    note: "Three products, named separately. Separate drafts or one programme, and Ponte chooses neither.",
    session: drive({ type: "extraction", extraction: multiExtraction }),
  },
  {
    id: "multi-product-chosen",
    title: "Multi-product, plan chosen",
    note: "Separate drafts selected. The gold runner marks the member's own signal.",
    session: drive({ type: "extraction", extraction: multiExtraction }, { type: "choosePlan", plan: "separate" }),
  },
  {
    id: "extraction-failed",
    title: "Extraction failure",
    note: "The file arrived; Ponte could not read it. Two working routes offered.",
    session: drive({ type: "extractionFailed", filename: "supply-offer.pdf", reason: "Ponte could not complete the reading of this document." }),
  },
  {
    id: "upload-failed",
    title: "Upload failure",
    note: "The file did not arrive. Retry, in place.",
    session: drive({ type: "uploadFailed", filename: "supply-offer.pdf", reason: "The upload did not reach Ponte." }),
  },
  {
    id: "blocked",
    title: "Blocked format",
    note: "A format named, a reason given, and the alternatives that do work.",
    session: drive({
      type: "blocked",
      filename: "offer.doc",
      format: "doc",
      reason: "Legacy Word documents are a binary format Ponte cannot read yet.",
    }),
  },
  {
    id: "review",
    title: "Review",
    note: "The trust boundary. Extracted, confirmed, verified and missing, distinguished in words and in shape.",
    session: reviewSession,
  },
  {
    id: "review-document",
    title: "Review of a document",
    note: "Every extracted term shows the verbatim words it came from.",
    session: drive(
      { type: "extraction", extraction: multiExtraction },
      { type: "choosePlan", plan: "separate" },
      { type: "openReview" },
    ),
  },
  {
    id: "edited",
    title: "Edited",
    note: "A member-changed field, marked confirmed by the member rather than extracted.",
    session: drive(
      { type: "chooseMethod", method: "describe" },
      { type: "resolution", outcome: resolveProduct("EN 590 diesel") },
      { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
      { type: "editTerm", scope: "shared", key: "incoterm", value: "FOB" },
    ),
  },
  {
    id: "incomplete",
    title: "Incomplete",
    note: "The product resolved; decisive terms still open, and Ponte will not guess them.",
    session: reviewSession,
  },
  {
    id: "confirmed",
    title: "Confirmed",
    note: "The member accepted the review. Still nothing published.",
    session: confirmedSession,
  },
  {
    id: "draft-created",
    title: "Draft created",
    note: "A draft exists, with its reference.",
    session: draftedSession,
  },
  {
    id: "completed",
    title: "Completed",
    note: "The journey's end.",
    session: intakeReducer(draftedSession, { type: "complete" }),
  },
  {
    id: "auth-interrupted",
    title: "Authentication interruption",
    note: "The gate fires over preserved work. The stage is untouched.",
    session: intakeReducer(
      drive({ type: "chooseMethod", method: "describe" }, { type: "type", wording: "gas oil, 10 ppm, CIF Rotterdam" }),
      { type: "interrupt" },
    ),
  },
  {
    id: "resumed",
    title: "Resumed",
    note: "The same session, serialised and restored, stating what it brought back.",
    session:
      rehydrate(
        serialise(
          intakeReducer(
            drive({ type: "chooseMethod", method: "describe" }, { type: "type", wording: "gas oil, 10 ppm, CIF Rotterdam" }),
            { type: "interrupt" },
          ),
        ),
      ) ?? newSession("offer_product"),
  },
];

export function galleryState(id: string): GalleryState | null {
  return GALLERY.find((s) => s.id === id) ?? null;
}
