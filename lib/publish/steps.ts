/**
 * The listing path as a machine: which surface a member is on, what comes
 * next, and what "back" means from each one.
 *
 * ## Why the order is data and not control flow
 *
 * The live path decided its next screen inside each screen. That is how
 * `/structure` ended up with a step that could not be left (`P0-2`) and a
 * heading that contradicted the choice the member had just made (`P0-5`): the
 * rule about what follows what existed in nine places and was wrong in two.
 *
 * Here it exists once. `nextNode` and `backNode` are total functions over the
 * node list, so "back never loses work" is a property of the machine rather
 * than a promise each component makes independently.
 *
 * ## The progress rule
 *
 * Five segments, one per stage, filled or not. It carries NO numeral and
 * encodes no percentage: a stage is whole or it is not. Several nodes share a
 * stage (`B03` through `B06` are all stage 3), which is deliberate: the rule
 * measures the journey, not the screens, and a member who adds four photographs
 * has not advanced four fifths of the way to publishing.
 */

import type { MarketFamily } from "../taxonomy/market";

export type PublishNode =
  | "intent"
  | "capacity"
  | "tell"
  | "listing"
  | "assets"
  | "preview"
  | "gate"
  | "screening"
  | "published";

export interface NodeDefinition {
  node: PublishNode;
  /** The surface's identifier in the design reference. */
  id: string;
  /** 1..5. Several nodes share one. */
  stage: number;
  /** The label on the back control, or null where there is no way back. */
  back: string | null;
}

export const STAGES = 5;

/**
 * Every node, in path order.
 *
 * `assets` is stage 3 alongside `listing` because it is part of describing the
 * record rather than a stage of its own; the reference numbers `B06` as segment
 * 3 for the same reason.
 */
export const NODES: readonly NodeDefinition[] = [
  { node: "intent", id: "B01", stage: 1, back: null },
  { node: "capacity", id: "B01b", stage: 1, back: "Deal intent" },
  { node: "tell", id: "B02", stage: 2, back: "Capacity" },
  { node: "listing", id: "B03-B05", stage: 3, back: "Tell Ponte" },
  { node: "assets", id: "B06", stage: 3, back: "The listing so far" },
  { node: "preview", id: "B07", stage: 4, back: "The listing so far" },
  { node: "gate", id: "B08", stage: 5, back: "Preview" },
  { node: "screening", id: "B09s", stage: 5, back: "Preview" },
  // Published is terminal. There is no back: the listing is public, and a
  // control implying it could be un-published by going backwards would be a lie.
  { node: "published", id: "B09", stage: 5, back: null },
];

export function nodeDefinition(node: PublishNode): NodeDefinition {
  const found = NODES.find((n) => n.node === node);
  if (!found) throw new Error(`unknown publish node: ${node}`);
  return found;
}

export function stageOf(node: PublishNode): number {
  return nodeDefinition(node).stage;
}

/**
 * Which nodes this record actually visits.
 *
 * `assets` is the product family's own surface: a trade service has no
 * photograph of the goods because there are no goods, and a distribution
 * arrangement's evidence is a mandate rather than a specification sheet. Both
 * are `B06`-shaped work that Set 2 scopes to products explicitly, so the node
 * is skipped rather than shown empty.
 *
 * `gate` appears only for a member who is not signed in. A signed-in member
 * walking through a sign-in screen is the "wall after doing real work" that
 * `B08` exists to avoid.
 */
export function pathFor(opts: { family: MarketFamily | null; signedIn: boolean }): PublishNode[] {
  return NODES.filter((definition) => {
    if (definition.node === "assets") return opts.family === "products";
    if (definition.node === "gate") return !opts.signedIn;
    return true;
  }).map((definition) => definition.node);
}

/**
 * Where a surface sits on the arc: which span, and how far through it.
 *
 * `ADR-0032-AMENDMENT-2` entry 2. The deck reports position WITHIN a stage as
 * well as across stages, because several surfaces share one stage and a deck
 * that sat still through four answers and then jumped a whole fifth of the
 * crossing would be a stage indicator wearing a drawing.
 *
 * The stage is divided between the surfaces THIS MEMBER'S PATH actually visits,
 * not between every surface that could share it. `assets` is skipped for a
 * service, and a member who never sees it must not watch the deck stall halfway
 * through stage three waiting for a screen that is not coming.
 *
 * `progress` is the surface's own progress, 0 to 1. The nodes still light on
 * whole stages: only the deck moves continuously.
 */
export function arcPosition(
  node: PublishNode,
  opts: { family: MarketFamily | null; signedIn: boolean },
  progress = 0,
): { current: number; within: number } {
  /*
    The crossing is COMPLETE on the confirmation, so the deck is whole and no
    node is highlighted. `nodeStates` marks a node "current" while `current`
    equals its index, so a value past the last node is what says "arrived"
    rather than "standing on the far shore, still going". Anything less would
    draw a member's published listing as an unfinished span.
  */
  if (node === "published") return { current: STAGES + 1, within: 0 };

  const stage = stageOf(node);
  const sharing = pathFor(opts).filter((other) => stageOf(other) === stage);
  const index = Math.max(0, sharing.indexOf(node));
  const clamped = Math.min(1, Math.max(0, progress));
  return { current: stage - 1, within: (index + clamped) / sharing.length };
}

export function nextNode(
  current: PublishNode,
  opts: { family: MarketFamily | null; signedIn: boolean },
): PublishNode | null {
  const path = pathFor(opts);
  const index = path.indexOf(current);
  if (index === -1 || index === path.length - 1) return null;
  return path[index + 1];
}

/**
 * The node behind this one.
 *
 * Null at the entrance and null once published. Everywhere else there is one,
 * and it is a node the member has actually been to, because the path is
 * filtered by the same rules going backwards as forwards.
 */
export function backNode(
  current: PublishNode,
  opts: { family: MarketFamily | null; signedIn: boolean },
): PublishNode | null {
  if (current === "published") return null;
  const path = pathFor(opts);
  const index = path.indexOf(current);
  if (index <= 0) return null;
  return path[index - 1];
}

/** The label on the back control, taken from the node it actually returns to. */
export function backLabel(
  current: PublishNode,
  opts: { family: MarketFamily | null; signedIn: boolean },
): string | null {
  const previous = backNode(current, opts);
  if (!previous) return null;
  return nodeDefinition(current).back ?? BACK_LABELS[previous];
}

/**
 * What each node is called when it is the destination of a back control.
 *
 * A member reads the back label to learn where they are going, so it names the
 * DESTINATION and not the current screen. "Back" alone told them nothing, which
 * is why the reference labels every one of these.
 */
const BACK_LABELS: Readonly<Record<PublishNode, string>> = {
  intent: "Deal intent",
  capacity: "Capacity",
  tell: "Tell Ponte",
  listing: "The listing so far",
  assets: "Assets",
  preview: "Preview",
  gate: "Sign in",
  screening: "Checks",
  published: "Published",
};
