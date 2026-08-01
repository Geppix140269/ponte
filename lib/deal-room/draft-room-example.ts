/**
 * The example draft room, transcribed from the owner's design project.
 *
 * Source: `ponte-draft-data.js` in `cad4950a-c95c-45f7-92a7-6d8ab2b53853`,
 * supporting screen 1 of `Ponte Deal Room - Four New Screens v1.html`.
 *
 * ## Everything here is an example, and every surface says so
 *
 * Constitution section 5 forbids manufactured activity, so the organisation,
 * the figures and the history below are the design package's own illustrative
 * deal and are labelled as an example wherever they appear. They are NOT a
 * member's, they are not a market's, and none of them is presented as real.
 *
 * Transcribed rather than invented, for the same reason `DealRoomPreview` uses
 * the package's illustrative room: a second made-up deal would be a second
 * thing to keep true.
 *
 * ## Why this is data and not markup
 *
 * The same content drives the walkthrough today and the real draft room when
 * ADR-0028 State B is built. Keeping it here means the two cannot drift into
 * describing different products.
 */

/** A fact on the masthead. `open` is a question the procedure answers. */
export interface DraftFact {
  label: string;
  value: string;
  detail?: string;
  /** True where the fact is deliberately not yet fixed. Drawn, never hidden. */
  open?: boolean;
}

/** One region of the room. Present whether or not it is filled. */
export interface DraftRegion {
  id: string;
  name: string;
  /** The chip on the region header. */
  state: "ready" | "empty" | "proposal" | "neutral" | "partial";
  /** What the region is for, in one line. */
  purpose: string;
  /** The headline of the empty composition. */
  zero?: string;
  /** What the member can do about it, and when. */
  zeroBody?: string;
  cta?: string;
  cta2?: string;
  /** Caption under a ghost specimen, where the region's SHAPE needs showing. */
  ghost?: string;
}

export interface RecognitionEntry {
  state: "done" | "next" | "wait";
  title: string;
  detail: string;
  when: string;
}

export const DRAFT_ROOM = {
  reference: "DR-2041",
  deal: "PD-8837",
  published: "Published 28 July 2026",
  title: "Organic extra virgin olive oil, supply, 24 t per quarter",
  owner: "Mediterranea Foods S.L.",
  place: "Jaén, Spain",
  family: "Product · supply",
  /** The seal. It is the first thing that answers "who can see this?". */
  seal: "Private to you",
  facts: [
    { label: "Product", value: "Organic extra virgin olive oil", detail: "HS 1509.20 · organic certified" },
    { label: "Quantity and capacity", value: "24 t per quarter", detail: "Mill capacity declared 180 t / year" },
    { label: "Origin", value: "Jaén, Andalucía, Spain" },
    { label: "Destination", value: "Open", detail: "Not yet agreed", open: true },
    { label: "Delivery basis", value: "Open", detail: "To be agreed in the procedure", open: true },
    { label: "Price basis", value: "Open", detail: "To be agreed in the procedure", open: true },
    { label: "Timing", value: "From the 2026 harvest", detail: "First shipment window not fixed" },
    { label: "Languages", value: "English · Spanish", detail: "Three more available on activation" },
  ] satisfies DraftFact[],
} as const;

/** The chip word for each region state. Never a colour alone. */
export const REGION_STATE_LABEL: Record<DraftRegion["state"], string> = {
  ready: "Ready",
  empty: "Nothing yet",
  proposal: "Proposed, unagreed",
  neutral: "Not started",
  partial: "In progress",
};

export const DRAFT_REGIONS: DraftRegion[] = [
  {
    id: "summary",
    name: "Commercial opportunity",
    state: "ready",
    purpose:
      "The Deal snapshot a counterparty reads first. Built from what you published, so there is nothing to write again.",
  },
  {
    id: "facts",
    name: "Structured facts",
    state: "ready",
    purpose: "Quantity, capacity, origin and basis, presented as a register rather than as prose.",
  },
  {
    id: "evidence",
    name: "Evidence and documents",
    state: "empty",
    purpose:
      "Certificates, analyses, capacity records and photographs. Each item carries its provenance and who can open it.",
    zero: "No evidence added yet. This area is ready for it.",
    zeroBody:
      "You can add evidence now or after a counterparty is admitted. Nothing here becomes visible to anybody until you decide it does.",
    cta: "Add the first evidence item",
    cta2: "See what counts as evidence",
    ghost: "Example of the evidence register once items are added",
  },
  {
    id: "procedure",
    name: "Procedure preview",
    state: "proposal",
    purpose:
      "The commercial procedure you will propose. It becomes governing only when a counterparty agrees a version.",
    zero: "A ten-step procedure is prepared and unagreed.",
    zeroBody:
      "You can review and amend every step now. No completion figure exists until both principal parties approve a version.",
    cta: "Review the proposed procedure",
    cta2: "Start from a different template",
  },
  {
    id: "branches",
    name: "Private counterparty branches",
    state: "empty",
    purpose:
      "A separate protected workspace for each counterparty. What happens in one is never visible in another.",
    zero: "No branch yet. Five are included when the room is activated.",
    zeroBody:
      "A branch opens when you invite a counterparty, or when you accept an application. Each one is isolated by default.",
    cta: "Preview how a branch works",
    ghost: "Example of two branches, each isolated from the other",
  },
  {
    id: "participants",
    name: "Participants and roles",
    state: "empty",
    purpose: "Who is admitted, in what role, with what authority, under which terms.",
    zero: "You are the only participant. That is the correct state for a room in preparation.",
    zeroBody:
      "Admission is formal: organisation, role, declared authority, participation agreement and NDA. Nobody is admitted by an invitation alone.",
    cta: "Review the admission requirements",
  },
  {
    id: "progress",
    name: "Progress model",
    state: "neutral",
    purpose: "How this room will report progress once a procedure is agreed.",
    zero: "No completion figure before the procedure is agreed.",
    zeroBody:
      "This is deliberate. A percentage against a procedure nobody has accepted would be a claim Ponte cannot support.",
  },
  {
    id: "activity",
    name: "Activity history",
    state: "partial",
    purpose: "An append-only register of durable events. Messages are not events.",
    zero: "Three events so far, all your own.",
    zeroBody:
      "Every future change records the actor, the organisation, the timestamp and the permission boundary.",
  },
];

/**
 * Progressive recognition, in the Professional Momentum shape.
 *
 * Action, recognition, value created, progress preserved, next action. The
 * design brief bans points, coins, streaks, confetti and exaggerated praise, so
 * every line below describes what was created and what it makes possible, and
 * nothing congratulates anybody.
 */
export const DRAFT_RECOGNITION: RecognitionEntry[] = [
  {
    state: "done",
    title: "Product identified",
    detail:
      "Organic extra virgin olive oil, HS 1509.20. A counterparty can now find this room by product rather than by name.",
    when: "28 Jul",
  },
  {
    state: "done",
    title: "Quantity and delivery basis added",
    detail:
      "24 t per quarter against a declared mill capacity of 180 t per year. The commercial shape of the deal is legible without a conversation.",
    when: "31 Jul",
  },
  {
    state: "done",
    title: "The Spanish presentation is ready",
    detail:
      "Your room reads correctly in Spanish. Three further languages are prepared and become available on activation.",
    when: "1 Aug",
  },
  {
    state: "next",
    title: "Next: add one piece of evidence",
    detail:
      "An organic certificate or a laboratory analysis. Evidence is the difference between a claim and a record, and it is what a counterparty looks for first.",
    when: "",
  },
  {
    state: "wait",
    title: "Then: your room is ready to invite counterparties",
    detail: "Reached when the procedure is reviewed and at least one evidence item is present.",
    when: "",
  },
];

/** The room's own history so far. Every entry is an act of the owner's. */
export const DRAFT_HISTORY: { when: string; what: string; detail: string }[] = [
  { when: "28 Jul 09:12", what: "Opportunity published", detail: "Visible in Explore to qualified members" },
  { when: "31 Jul 14:40", what: "Room prepared from PD-8837", detail: "Private to you" },
  { when: "1 Aug 08:55", what: "Spanish presentation generated", detail: "Second language ready" },
];
