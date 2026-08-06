/**
 * `B06` assets, and the visibility ladder that governs them.
 *
 * ## Visibility is per item, not per listing
 *
 * A specification sheet and a phytosanitary certificate belong to the same
 * listing and should not have the same audience: one sells the goods, the other
 * is evidence a member hands over once a counterparty is real. A single
 * listing-wide switch forces the member to choose between publishing the
 * certificate and hiding the specification, and most will hide everything.
 *
 * ## The gate is real, and it is here
 *
 * `DECISION-16`: the upload route requires sign-in. `uploadPermitted` is the
 * one place that says so, it takes the session as an argument, and the surface
 * cannot open a file picker without asking it. Item 11 of the thirteen things
 * that must not survive is "ungated document upload"; a gate that lives in a
 * component's JSX is a gate that the next component forgets.
 */

export type Visibility = "public" | "on_accepted_interest" | "private";

export interface VisibilityLevel {
  key: Visibility;
  label: string;
  audience: string;
}

/**
 * The three layers, widest first.
 *
 * The order is the ladder and is not alphabetical or arbitrary: a member
 * reading down the list is reading outward-in, from "anyone" to "only you",
 * which is the direction the decision actually runs.
 */
export const VISIBILITY_LEVELS: readonly VisibilityLevel[] = [
  { key: "public", label: "Public", audience: "Anyone browsing Ponte" },
  {
    key: "on_accepted_interest",
    label: "On accepted interest",
    audience: "Only a counterparty you have accepted",
  },
  { key: "private", label: "Private", audience: "Only you. Held, never shown." },
];

export function visibilityLevel(key: Visibility): VisibilityLevel {
  const found = VISIBILITY_LEVELS.find((level) => level.key === key);
  // Every Visibility has a level; the fallback exists so a value widened by a
  // future migration cannot render as "public" by accident. Unknown is private.
  return found ?? VISIBILITY_LEVELS[2];
}

export interface ListingAsset {
  id: string;
  /** The extension shown in the type block: JPG, PDF. Uppercase, three chars. */
  kind: string;
  name: string;
  bytes: number;
  visibility: Visibility;
}

/**
 * May this session upload?
 *
 * `DECISION-16`. Signed out, the answer is no and the reason is given: a file
 * uploaded by nobody belongs to nobody, and Ponte will not hold a member's
 * specification sheet against a browser session that expires in seven days.
 */
export function uploadPermitted(signedIn: boolean): { allowed: boolean; reason: string | null } {
  if (signedIn) return { allowed: true, reason: null };
  return {
    allowed: false,
    reason: "Sign in first, so the file is held against your account",
  };
}

/** "2.1 MB", "412 KB". Sizes a member recognises from their own file manager. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** The summary under the statement: "4 items · 2 public". */
export function assetSummary(assets: readonly ListingAsset[]): string | null {
  if (assets.length === 0) return null;
  const publicCount = assets.filter((a) => a.visibility === "public").length;
  const items = `${assets.length} item${assets.length === 1 ? "" : "s"}`;
  return `${items} · ${publicCount} public`;
}

/**
 * Ponte does not check what a document claims.
 *
 * Shown wherever assets are listed. A member who uploads a certificate and sees
 * no caveat reasonably concludes Ponte read it; it did not, and a buyer who
 * believes it did is the person who pays for the misunderstanding.
 */
export const ASSET_PERIMETER =
  "Ponte does not check what a document claims. It shows buyers what you gave it and says where it came from.";
