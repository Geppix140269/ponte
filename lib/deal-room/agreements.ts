import { createHash } from "node:crypto";
import type { AgreementKind } from "./states";

/**
 * The agreement texts a participant accepts, and their identity.
 *
 * The owner's decision of 29 July 2026 fixed the acceptance record as profile
 * identity, organisation or declared capacity, agreement kind, an immutable
 * document version, a SHA-256 of the accepted content, and a UTC timestamp,
 * with no IP address and no user agent.
 *
 * The last clause of that decision is the one this module exists for: "The
 * accepted document version must remain retrievable or reproducible from an
 * immutable canonical source so the stored hash can later be verified."
 *
 * So the text lives here, in the repository, at a named version. The checksum
 * is **computed from the text** rather than written down beside it, which means
 * the two cannot drift: editing a word without changing the version produces a
 * different hash from the one already stored against every acceptance, and that
 * is a discrepancy somebody can find. Writing the hash as a literal would let
 * an edit pass silently.
 *
 * A version is immutable by convention and by consequence. To change wording,
 * add a version; the acceptances that referenced the old one keep pointing at
 * text this file can still reproduce.
 *
 * These are click-to-accept records. They are not a qualified, advanced or
 * otherwise regulated electronic signature, and nothing in the product may
 * describe them as one.
 */

export interface AgreementDocument {
  kind: AgreementKind;
  version: string;
  title: string;
  body: string;
  /** SHA-256 of `body`, computed at load. Never a literal. */
  sha256: string;
}

function document(kind: AgreementKind, version: string, title: string, body: string): AgreementDocument {
  const normalised = body.trim().replace(/\r\n/g, "\n");
  return {
    kind,
    version,
    title,
    body: normalised,
    sha256: createHash("sha256").update(normalised, "utf8").digest("hex"),
  };
}

const PARTICIPATION = `
Ponte Deal Room Participation Agreement

1. You are joining a private workspace to progress one defined transaction.
2. You act for the organisation you identified, or in the professional capacity
   you declared. You have stated that you are authorised to act in the role you
   declared. Ponte has not verified that authority.
3. Everything you do in this room is recorded against your name, with the time
   it happened. That record is append-only: it cannot be edited or removed,
   including by Ponte.
4. Uploading a document is not a claim that Ponte has checked it. Evidence
   accepted for the agreed procedure means the participants accepted it for that
   purpose, and nothing more.
5. Progress shown in this room measures completion of the agreed procedure. It
   does not measure trust, value, risk, or the likelihood that this transaction
   completes.
6. Ponte provides the workspace. It is not a party to your transaction, does not
   guarantee any counterparty, and does not hold, transmit or settle funds.
7. If the room becomes read-only, the history remains readable to the people who
   were admitted. Nothing is deleted.
`;

const NDA = `
Confidentiality and non-disclosure obligations

1. Information disclosed inside this private workspace is confidential. It is
   disclosed to you for the purpose of assessing and progressing this
   transaction, and for no other purpose.
2. You will not disclose it outside the workspace, except to people within your
   own organisation who need it for the same purpose and are bound by
   obligations no weaker than these.
3. These obligations do not apply to information that is already public through
   no act of yours, that you already held without a duty of confidence, or that
   you are required to disclose by law or by a regulator. Where you are so
   required, you will say so as soon as you lawfully can.
4. You will not use the information to circumvent the participants of this room.
5. These obligations continue after the room closes and after your participation
   ends.
6. This acceptance is a record that you agreed to this text, at this version, at
   the recorded time. It is not an electronic signature.
`;

const ROOM_RULES = `
Room rules

1. The agreed procedure is how this room works. Responsibilities, evidence
   requirements and completion conditions come from it, and it does not govern
   until every required approver has approved it.
2. State what is true. Do not represent a declaration as a check, an estimate as
   a measurement, or an intention as a commitment.
3. Raise a blocker when something is stopping progress. A blocker is a fact
   about the transaction, not a complaint about a person.
4. Answer clarifications on evidence you supplied. A corrected document is a new
   version; the earlier one is retained.
5. What you can see in this workspace, you may not assume exists elsewhere. Do
   not attempt to discover other workspaces connected to this Deal.
6. Ponte staff do not participate in this room unless the room's operating mode
   says so and a separate paid scope covers it.
`;

const AUTHORITY = `
Declaration of authority to participate

1. You declare that you are authorised by the organisation you identified, or
   entitled in the professional capacity you declared, to participate in this
   room in the role you stated.
2. You understand that participating and having authority to commit your
   organisation are different things. This declaration is the first, not the
   second.
3. Ponte records this declaration. Ponte has not sighted evidence of it, and
   nothing in this room presents it as verified.
4. If your authority changes or ends, you will say so in the room.
`;

export const AGREEMENT_DOCUMENTS: Record<AgreementKind, AgreementDocument> = {
  participation: document("participation", "v1-2026-07-29", "Deal Room Participation Agreement", PARTICIPATION),
  nda: document("nda", "v1-2026-07-29", "Confidentiality and non-disclosure obligations", NDA),
  room_rules: document("room_rules", "v1-2026-07-29", "Room rules", ROOM_RULES),
  authority_declaration: document(
    "authority_declaration",
    "v1-2026-07-29",
    "Declaration of authority to participate",
    AUTHORITY,
  ),
};
