/**
 * The protected invitation.
 *
 * Acceptance criterion 3: "The invitation reveals no protected room content."
 * That is what this module is for. It builds the preview facts, mints and
 * hashes the token, and states the expiry rule.
 *
 * ## The token
 *
 * The raw token exists in exactly two places: the URL sent to the invitee, and
 * the invitee's browser. It is **never** stored. The row holds
 * `sha256(token)`, and resolution hashes the presented value and looks up the
 * digest. So a database disclosure does not yield working invitations, which is
 * the same reasoning behind not storing a password.
 *
 * A capability token in a URL path is a deliberate, bounded choice - an invitee
 * has no account yet, so there is nothing else to authenticate them with. The
 * mitigations are all here: 32 bytes of CSPRNG entropy, single use, a short
 * expiry, hashed at rest, and the landing route sends `Referrer-Policy:
 * no-referrer` so the token cannot leak through a referrer header.
 *
 * ## The preview
 *
 * `buildPreview` is an allowlist, not a redaction pass. It constructs a new
 * object from named fields rather than copying a room and deleting things,
 * because a redaction pass fails open the moment somebody adds a field.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { MarketFamily } from "./procedure";

/** How long an invitation stands. Short enough to bound a leaked URL. */
export const INVITATION_TTL_DAYS = 14;

export interface MintedInvitation {
  /** Goes in the URL. Never persisted. */
  token: string;
  /** Goes in the row. */
  tokenSha256: string;
  expiresAt: Date;
}

export function mintInvitationToken(now: Date = new Date()): MintedInvitation {
  // base64url of 32 bytes: 256 bits, URL-safe without escaping.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenSha256: hashInvitationToken(token), expiresAt };
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Compare two digests without leaking their difference through timing.
 *
 * The lookup is by indexed digest, so this is belt and braces rather than the
 * primary defence. It costs nothing and removes a whole class of argument.
 */
export function invitationTokenMatches(presented: string, storedSha256: string): boolean {
  const a = Buffer.from(hashInvitationToken(presented), "hex");
  const b = Buffer.from(storedSha256, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Everything the invitee is shown before they are admitted.
 *
 * Note what is absent, and that the absence is the specification: no evidence,
 * no procedure, no other participant, no other sub-room, no room reference that
 * could be enumerated, no counts of anything, no commercial terms. The Deal
 * subject is the permitted preview level, and it is the same subject the Deal's
 * own published record already shows.
 */
export interface InvitationPreview {
  invitingOrganisation: string;
  /** Permitted description of the Deal. Nothing that is not already published. */
  dealSubject: string;
  marketFamily: MarketFamily;
  proposedRole: string;
  proposedParticipantClass: string;
  roomSponsor: string;
  admissionRequirements: readonly string[];
  /** What is deliberately not disclosed yet, said out loud. DR-03 requires it. */
  notYetDisclosed: readonly string[];
  expiresAt: string;
}

const ADMISSION_REQUIREMENTS: readonly string[] = [
  "Sign in to Ponte, or create an account",
  "Identify the organisation you act for, or the professional capacity you act in",
  "Declare your role in this transaction",
  "Declare that you are authorised to act in that role",
  "Accept the Deal Room Participation Agreement",
  "Accept the confidentiality and non-disclosure obligations",
  "Accept the room rules",
];

const NOT_YET_DISCLOSED: readonly string[] = [
  "Any document or evidence held in the room",
  "The procedure the parties will follow",
  "Commercial terms of any kind",
  "Who else is participating",
  "Any other workspace connected to this Deal",
];

export function buildPreview(input: {
  invitingOrganisation: string;
  dealSubject: string;
  marketFamily: MarketFamily;
  proposedRole: string;
  proposedParticipantClass: string;
  roomSponsor: string;
  expiresAt: Date;
}): InvitationPreview {
  return {
    invitingOrganisation: input.invitingOrganisation,
    dealSubject: input.dealSubject,
    marketFamily: input.marketFamily,
    proposedRole: input.proposedRole,
    proposedParticipantClass: input.proposedParticipantClass,
    roomSponsor: input.roomSponsor,
    admissionRequirements: ADMISSION_REQUIREMENTS,
    notYetDisclosed: NOT_YET_DISCLOSED,
    expiresAt: input.expiresAt.toISOString(),
  };
}

/**
 * The keys a preview may ever contain.
 *
 * Exported so the test can assert that `buildPreview` produces exactly these
 * and nothing else. A future field added to the preview without being added
 * here fails the test, which is the point: this is the list somebody has to
 * change deliberately.
 */
export const PREVIEW_KEYS: readonly string[] = [
  "invitingOrganisation",
  "dealSubject",
  "marketFamily",
  "proposedRole",
  "proposedParticipantClass",
  "roomSponsor",
  "admissionRequirements",
  "notYetDisclosed",
  "expiresAt",
];

export type InvitationResolution =
  | { ok: true; invitationId: string }
  | { ok: false; reason: "not_found" | "expired" | "revoked" | "already_accepted" | "declined" };

/**
 * Why every failure looks the same to the caller.
 *
 * `not_found` covers a wrong token, a deleted invitation and a token for
 * another room. Distinguishing them would let someone probe for valid tokens,
 * and there is nothing useful a real invitee could do with the difference.
 */
export function resolveInvitationState(row: {
  id: string;
  state: string;
  expiresAt: string;
} | null, now: Date = new Date()): InvitationResolution {
  if (!row) return { ok: false, reason: "not_found" };
  if (row.state === "revoked") return { ok: false, reason: "revoked" };
  if (row.state === "accepted") return { ok: false, reason: "already_accepted" };
  if (row.state === "declined") return { ok: false, reason: "declined" };
  if (row.state === "expired" || Date.parse(row.expiresAt) < now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, invitationId: row.id };
}

export const INVITATION_FAILURE_MESSAGE: Record<
  Exclude<InvitationResolution, { ok: true }>["reason"],
  string
> = {
  not_found: "This invitation link is not valid.",
  expired: "This invitation has expired. Ask the person who invited you to send a new one.",
  revoked: "This invitation was withdrawn by the organisation that sent it.",
  already_accepted: "This invitation has already been accepted. Sign in to reach the workspace.",
  declined: "This invitation was declined. Ask the person who invited you to send a new one if that was a mistake.",
};
