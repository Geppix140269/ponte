import {
  ACTIVE_PERIOD_DAYS,
  ADDITIONAL_BRANCH_PRICE_CENTS,
  BASE_ROOM_PRICE_CENTS,
  CURRENCY,
  INCLUDED_ACTIVE_BRANCHES,
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
} from "./pricing";

/**
 * The crescendo, as the owner defined it, in the order a member lives it.
 *
 * > Create the opportunity for free, publish the opportunity for free,
 * > privately build and experience the Deal Room for free, pay when the Deal
 * > Room is activated for external use.
 *
 * ## Three objects, not one
 *
 * The definitive brief of 1 August 2026 is explicit that these are distinct
 * and must never be conflated:
 *
 *   A. the publicly visible commercial opportunity   - free
 *   B. the privately prepared Deal Room draft        - free
 *   C. the activated, externally usable Deal Room    - paid
 *
 * The payment trigger is the OWNER'S EXPLICIT DECISION to activate a room they
 * have already built and seen. It is not a counterparty accepting, not
 * publishing, not creating the draft, and not previewing an invitation.
 *
 * ## Why the walkthrough carries the commercial model
 *
 * Because the model is the pitch. A reader who finishes this should be able to
 * say exactly where the money starts and what it buys, and should have seen
 * the value before being asked. So every stage states its price, including the
 * four that are free, and the paid stage states the whole entitlement rather
 * than the headline figure alone.
 *
 * Nothing here is a screenshot. A picture of the product goes stale the first
 * time the product changes; every stage is drawn with the product's own
 * approved components. And no figure is typed: all of them are read from
 * `pricing.ts`, so the walkthrough cannot quote a price Ponte does not charge.
 */

export interface WalkthroughStage {
  key: string;
  /** The short name on the crossing. */
  title: string;
  /** One line under the title on the crossing. */
  summary: string;
  /** What is actually happening, addressed to the reader. */
  body: string;
  /** The facts of this stage, as short labelled pairs. Never decorative. */
  facts: { label: string; value: string }[];
  /** What it costs at this stage, in plain words. */
  price: string;
  /** True for the one stage where money is asked for. */
  paid?: boolean;
}

function money(cents: number, currency: string): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : "";
  return `${symbol}${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;
}

const ROOM = money(BASE_ROOM_PRICE_CENTS, CURRENCY);
const BRANCH = money(ADDITIONAL_BRANCH_PRICE_CENTS, CURRENCY);
const CEILING = money(MAXIMUM_ROOM_PERIOD_PRICE_CENTS, CURRENCY);

/** Said at four of the seven stages, so it is said identically at all four. */
const FREE = "Free.";

export const WALKTHROUGH: WalkthroughStage[] = [
  {
    key: "describe",
    title: "Describe what you want to do",
    summary: "Sell, source, perform a service, or take a line into a market.",
    body:
      "You say it in your own words, in your own language. Ponte identifies the product or the service and structures it into a commercial record. You are not asked for a customs code, and you are never asked to invent a fact you do not have.",
    facts: [
      { label: "You give", value: "One commercial intention, in plain words" },
      { label: "Ponte gives", value: "A structured, classified record" },
      { label: "Still private", value: "Nothing is public until you publish it" },
    ],
    price: `${FREE} Describing an opportunity costs nothing.`,
  },
  {
    key: "publish",
    title: "Publish the opportunity",
    summary: "Live on the board once it carries the minimum commercial facts.",
    body:
      "There is a minimum, and it is a floor rather than a review: enough for a counterparty to act on. Above it, your record carries a completion percentage rather than a gate, because a more complete opportunity is the one people open. Your direct contact details are never published with it.",
    facts: [
      { label: "The floor", value: "The facts a counterparty needs to act" },
      { label: "Above it", value: "A completion percentage, not a queue" },
      { label: "Never public", value: "Your email, telephone and WhatsApp" },
    ],
    price: `${FREE} Publishing is free, and stays free.`,
  },
  {
    key: "build",
    title: "Build your Deal Room, privately",
    summary: "A real room around your real opportunity. Not a demo.",
    body:
      "This is your showroom, and nobody else can see it yet. It is built on your actual opportunity, not a sample: the deal snapshot, its structured facts, the evidence areas, the procedure, the branch structure and the progress model. Building the room is free. No activation period begins until payment.",
    facts: [
      { label: "Built from", value: "Your opportunity, not a demonstration" },
      { label: "You can", value: "Prepare, edit and explore it freely" },
      { label: "Nobody else", value: "Can see it, or know it exists" },
    ],
    price: `${FREE} Building the room is free. No activation period begins until payment.`,
  },
  {
    key: "languages",
    title: "See it in five languages",
    summary: "English, Spanish, Russian, Simplified Chinese and Arabic.",
    body:
      "Read your own room in your own language, and see it as a counterparty in theirs, including Arabic right to left. This is not a translation bolted on at the end: the room is multilingual, so two parties can each work in their own language against one shared record. You can preview exactly what an invited counterparty will experience before anybody is invited.",
    facts: [
      { label: "Five languages", value: "Included, at every stage" },
      { label: "Preview", value: "What the counterparty will see" },
      { label: "Originals", value: "Kept. A translation never replaces one" },
    ],
    price: `${FREE} The multilingual presentation is part of the room.`,
  },
  {
    key: "activate",
    title: "Activate it, when you decide",
    summary: "The moment it becomes usable with anybody outside.",
    body:
      "Nothing has been asked of you until here, and nothing is charged until you say so. Activation is what makes the room externally operational: it can be shared, counterparties can be invited, and protected commercial progression begins. You also choose here whether the room is discoverable, so qualified members can apply to join, or private, so only people you invite can begin.",
    facts: [
      { label: "You choose", value: "Discoverable and open to applications, or invitation only" },
      { label: "Unlocks", value: "Invitations, admission and shared progression" },
      { label: "Never silent", value: "You confirm the payment. Nothing activates on its own" },
    ],
    price: `${ROOM} for ${ACTIVE_PERIOD_DAYS} calendar days, including ${INCLUDED_ACTIVE_BRANCHES} active counterparty branches and all five languages.`,
    paid: true,
  },
  {
    key: "branches",
    title: "A private branch for each counterparty",
    summary: "They cannot see each other. You see all of them.",
    body:
      "You are rarely negotiating with one party. Each buyer, supplier, agent or provider gets their own branch inside the master room, and each is a real permission boundary: no participant can see another branch, or infer that it exists, or learn how many there are. That is what makes the master room a dashboard rather than a group chat.",
    facts: [
      { label: "Included", value: `${INCLUDED_ACTIVE_BRANCHES} active branches` },
      { label: "Beyond that", value: `${BRANCH} for each additional active branch` },
      { label: "Never more than", value: `${CEILING} per room, per ${ACTIVE_PERIOD_DAYS} days` },
    ],
    price: `Counterparties you invite never pay anything to take part.`,
  },
  {
    key: "end",
    title: "And it stays",
    summary: "Signature happens elsewhere. The record remains here.",
    body:
      "Ponte carries a deal to the point of signature and stops. Signing happens between the parties, in whatever form their lawyers require. When the term ends the room becomes read only and nothing is deleted, so what remains is the history of how you got there, which is the part you will want the next time you deal with the same people.",
    facts: [
      { label: "Ends at", value: "Contract signature, externally, or closure" },
      { label: "After the term", value: "Read only. Nothing is deleted" },
      { label: "Builds", value: "A portfolio of every deal you have run" },
    ],
    price: "Nothing further. Reactivate a room later if the deal returns.",
  },
];
