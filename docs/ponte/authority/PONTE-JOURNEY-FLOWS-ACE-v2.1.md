# Ponte journey flows: A, C and E — v2

**Date:** 2 August 2026
**Author:** UX/UI Design Director
**Status:** Architecture APPROVED by Giuseppe on 2 August 2026. Six required node corrections and three placement clarifications are incorporated below. Screen grouping is authorised and follows in `PONTE-SCREEN-GROUPING-ACE-v1.md`.
**Derives from:** `PONTE-OPPORTUNITY-JOURNEY-MODEL-v2.1.md`.
**Supersedes:** v1 of the same date.

**Changed in v2**

1. Journey C resequenced. The procedure is built before the invitation is opened, resolving a contradiction where a counterparty could review something that did not yet exist.
2. Mutual identity disclosure now requires informed consent on both sides, stated before either party commits.
3. A real no-response state replaces the false promise that an owner always replies.
4. Deal Room creation from an accepted interest is idempotent.
5. Unlimited and indefinite draft storage promises removed. They were never decided.
6. Storage model at A8 stated precisely, and A8 renamed.
7. E5 assigned as an **accepted-interest state**, not a "private conversation". No free private-messaging product is introduced in v1.

---

## Conventions across all three journeys

### Save, resume and storage

The v1 statement "resume from any device" was true only after sign-in. Corrected:

| Stage | Where the draft lives | What the user is told |
|---|---|---|
| **Before A8** | Local to that browser only | "Saved in this browser." No claim about duration, no claim about other devices. |
| **After A8** | Account-backed | "Saved to your account. Continue on any device." |
| **Uploaded documents before sign-in** | **Not retained server-side anonymously without explicit disclosure.** If a document must be processed server-side to classify it, the user is told what is sent, what is kept and for how long, before it is sent. | Stated at the point of upload, not buried in terms |
| **Retention of drafts** | Governed by `PARAM-02`, not yet set | Nothing is promised. No "unlimited", no "indefinitely", no "forever". |

Other rules, unchanged: autosave after every meaningful action rather than on a timer or on submit. Back never loses work. Exit anywhere and the draft persists. Sign-in mid-flow restores the exact node, never a home page. Session expiry preserves the draft. On network interruption the last autosaved state is authoritative and the user is told in plain words what was and was not saved.

### Input, per `DOCTRINE-04`

Every value-entry node offers tap or guided selection, voice, and typing with search. Typing is never the only route where a value can reasonably be selected or spoken. Exact commercial information may require typing and that is expected.

### Failure states required at every input node

Microphone permission denied. Voice transcription unclear. Unsupported or unreadable document. Low-confidence classification. Each needs a recovery that does not restart the journey.

---

## Journey A. Publish a free listing

**Goal:** a credible, searchable public listing. Free. **Object created:** member opportunity `PT-####`.
**Applies identically to all six matrix cells.** Only A4's schema changes.

| Node | User does | System does | Gate | On failure |
|---|---|---|---|---|
| **A0 Entry** | Arrives from home, search, a shared link or a saved draft | Restores context if any | None | Context missing, start at A1 rather than dead-ending |
| **A1 Direction** | Chooses need or offer | Records direction on the opportunity, not the account (`DOCTRINE-03`) | None | |
| **A2 Family** | Chooses product, trade service, or distribution and representation | Loads the family schema | None | |
| **A2b Position** | *Distribution only.* Chooses one of the four positions | Records position, required for correct matching | None | Cannot be skipped for distribution |
| **A3 Describe** | Speaks, uploads, taps the category drill-down, or types | Parses, classifies, extracts facts. **If an upload is processed server-side before sign-in, discloses that before sending.** | None | Mic denied, unreadable document or unclear speech each fall back to the next input route without losing the node |
| **A4 What Ponte understood** | Reviews the structured result, corrects any value in place | One fact per line. Inferred values marked distinctly from read values. | None | Low-confidence field is marked and asks for confirmation rather than guessing silently |
| **A5 Complete to threshold** | Supplies remaining P-gated fields | Shows only what is missing, never re-asks what it holds | None | |
| **A6 Validity** | Accepts or edits validity | Defaults to 60 calendar days, caps at 90 (`DECISION-12`). Displays the exact expiry date. | None | Above 90 refused with the reason stated |
| **A7 Capacity** | **Actively confirms**: "For this opportunity, I am acting as..." | **A previous answer is offered as a suggestion. It is never silently applied.** The user must select. | None | No selection, no publication |
| **A7b Authority** | *Representative or intermediary only.* Makes the authority declaration | Records it. Sets public intermediary disclosure. | None | Declaration refused, publication unavailable |
| **A8 Continue to publication** | Proceeds | Prompts sign-in. Converts the local draft to an account-backed draft. | **Sign in** | Sign-in abandoned, the draft stays local to that browser and is offered again on return to that browser only |
| **A9 Visibility** | Reviews the public and private split, moves revealable fields, chooses whether to show company identity publicly | Three layers. MP fields shown as fixed and not movable. Identity defaults to reveal-on-accepted-interest (`DECISION-08`). | None | Attempt to hide an MP field explains why it cannot move |
| **A10 Publish** | Confirms | Verifies contact. Checks rate limit (`DECISION-10`). Runs screening tiers 1 to 3. | **Verified contact** | See branches |
| **A11 Published** | Sees the live listing, its reference and its expiry date | Publishes | | |

**A8 naming.** Renamed from "Save". User-facing label is **"Continue to publication"**. It describes the destination rather than the mechanism, and it does not imply the work is finished.

### Journey A branches

| Branch | Trigger | Behaviour |
|---|---|---|
| Needs information | Tier 1 or 2 resolvable failure | Returns to the specific node with the specific problem named. Never a generic failure. Draft retains everything. |
| Duplicate detected | Tier 2 | Shows the existing listing. Offers to edit it, reopen it, or confirm this is genuinely distinct and why. Blocked independently of rate limits. |
| Rate limit reached | `DECISION-10` | States the limit, states when it resets, offers business verification as the route to the higher limit. Never an unexplained rejection. |
| Hard policy flag | Tier 3 | Held for exceptional human review with a stated response expectation, described accurately. |
| Above business threshold | `DECISION-10` | Risk-based review or an account-specific increase. Never a silent refusal. |

### Journey A lifecycle continuation

Published, then at the stated validity date it expires, becomes private and archived. Reopening requires the creator to reconfirm accuracy, then fresh screening (`DECISION-01`). At expiry with no responses, offer reopening, a suggested change to limiting terms, or conversion to an investigation (`DECISION-13`). The creator may pause or close at any time (`DECISION-04`).

---

## Journey C. Create a Deal Room directly

**Goal:** a private, structured, activated transaction with a counterparty the member already holds. **Objects created:** `DR-####` holding deal `PD-####`.
**Resequenced in v2.** Something reviewable must exist before an invitation is opened. The creator may keep refining the procedure after the invitation, but not from nothing.

| Node | User does | System does | Gate | On failure |
|---|---|---|---|---|
| **C0 Entry** | Chooses "Create a Deal Room" | | None | |
| **C1 Describe the deal** | Speaks, uploads or taps the subject of the transaction | Structures it. A room is transaction-specific and carries deal facts, not a listing schema. | None | Same input fallbacks as A3 |
| **C2 What Ponte understood** | Confirms or corrects the deal facts | Marks inferred versus read | None | |
| **C3 Continue** | Proceeds | Prompts sign-in. Converts the local draft to an account-backed draft. | **Sign in** | Draft stays local to that browser |
| **C4 Build the proposed procedure** | Builds steps, branches and expected evidence | Building the room is free. **No activation period begins until payment.** Retention follows `PARAM-02`. | None | |
| **C5 Invite counterparty** | Names and invites | Sends the invitation, carrying the proposed procedure that now exists | **Verified contact** | Invitation bounces, the user is told, the room persists |
| **C6 Counterparty reviews** | Views the deal summary, the proposed procedure, participants and relevant verification status. Accepts, declines, or proposes factual corrections. (`DECISION-06`) | Applies pre-activation limits: no procedural execution, no evidence upload, no unrestricted messaging, no further invitations, no staged or restricted documents | **Verified contact** for the counterparty | Declined, the creator may invite another. No response, the room remains a free draft subject to `PARAM-02`. |
| **C7 Activate** | The creator or any admitted counterparty activates | States $79 and 30 consecutive calendar days. **Displays the exact expiry date, time and timezone before payment.** States that activating does not make the room public. (`DECISION-05`, `DECISION-07`) | **Business verification of the paying party**, and normally at least one counterparty accepted into admission | Verification incomplete, the route to complete it is offered without losing the room. Payment fails or is cancelled, the room returns to draft with nothing lost and nothing charged. |
| **C8 Active** | All admitted participants gain transactional function | Starts the 30 calendar days | | |

**The creator may continue to refine the procedure after C5.** Resequencing establishes that a reviewable proposal exists at the moment of invitation. It does not freeze the procedure.

### Journey C lifecycle continuation

| Point | Behaviour |
|---|---|
| 7 days before expiry | Persistent in-room warning begins. Creator, activator and room administrators warned by email and in product at 7, 3 and 1 day. Other admitted participants at 3 and 1 day. **Every warning states the exact expiry date, time and timezone** (`DECISION-02`). |
| Expiry | Read-only. No messaging, uploads, approvals or procedural progress. Full history remains readable to all participants (`DECISION-01`, `DECISION-14`). |
| Renewal | $79 for a further 30 calendar days. Manual by default, automatic only on explicit opt-in. Renewed before expiry, the new period begins at the existing expiry time; after, when payment succeeds. One confirmation against a saved payment method, never an unexplained charge (`DECISION-03`). |
| Conclusion | Room sealed as a record |
| Retention | Per the published legal and data-retention policy. No copy promises permanence unconditionally. |

---

## Journey E. Respond to someone else's listing

**Goal:** turn a published listing into a live conversation, then a room. Free to respond.

| Node | User does | System does | Gate | On failure |
|---|---|---|---|---|
| **E0 Discover** | Finds a listing via search, browse or a shared link | | None | |
| **E1 View** | Reads the public layer: MP fields, country, commercial capacity, principal or intermediary status, profile facts, accurate verification level, member history | Shows what is withheld and on what condition it is revealed | None | |
| **E2 Express interest** | Submits a short structured statement covering capacity, relevance and what they can fulfil (`DECISION-09`) | **Before submission, states plainly: "If the owner accepts your interest, your company identities will be revealed to each other."** Applies rate limiting and spam detection. | **Sign in and verified contact. Business verification is NOT required.** | Rate limited, the limit and its reset are stated |
| **E3 Pending** | Respondent sees the interest as **Pending**. May withdraw it at any time. | Notifies the owner. Sends measured reminders to the owner. **Does not imply Ponte guarantees a reply.** | None | See the no-response branch |
| **E3b Owner may require verification** | Owner may require the respondent's business verification before revealing sensitive private fields or admitting them to a room (`DECISION-09`) | Requests it from the respondent | Owner's discretion | Respondent declines, the interest stands and sensitive fields stay closed |
| **E4 Informed acceptance** | Owner accepts or declines. **Before accepting, the owner is shown exactly what acceptance will disclose:** both company identities, the precise private fields being released, and the respondent's intermediary status restated prominently. | On acceptance, identity disclosure is **mutual** (`DECISION-08`) and the listed PRIV fields open | None | Declined, the respondent is told plainly |
| **E5 Accepted interest** | Both parties see the mutually disclosed information and the Create Deal Room action | Holds the accepted-interest record and the disclosed fields. **This is a state, not a messaging product.** No free private-messaging feature is introduced in v1 under this or any other label. | None | |
| **E6 Initiate the Deal Room** | **Either party may initiate.** The respondent initiates from the accepted state of E5. The owner initiates from the accepted interest in their inbox. | **Idempotent. Both routes use the same accepted-interest ID and therefore create one room.** A second room from the same accepted interest requires both parties to explicitly agree. | **Verified contact** | Both initiate near-simultaneously, one room results and both are taken into it |
| **E7 onward** | | Continues at Journey C node C4, inheriting every field from the listing. **Nothing is re-entered.** | | |

**Acceptance is a disclosure action, not a generic button.** The consequence is stated on the control itself, not in a tooltip and not after the fact.

### Journey E branches

| Branch | Behaviour |
|---|---|
| **No response from the owner** | The interest stays visibly `Pending`. The owner receives measured reminders. The respondent may withdraw at any time. If the listing expires or is closed, the respondent is told and the interest is resolved as `lapsed`. **Ponte does not promise that an owner will reply**, and no copy implies otherwise. |
| Declined | Communicated plainly to the respondent. |
| Several respondents | The owner may accept several. Each accepted interest may produce one room, and each room has its own participants, permissions, procedure, payment and lifecycle, separately activated for $79 (`DECISION-04`). The idempotency rule at E6 is per accepted interest, not per listing. |
| Listing expires mid-conversation | The conversation and any room created from it survive. Expiry removes the public listing, not the relationship. |
| Listing closed by owner | Existing rooms unaffected. New interest is not accepted. Pending interests are resolved as `lapsed` and the respondents are told. |
| Respondent is an intermediary | Public at E1, restated prominently at E4 so the owner cannot disclose identity without seeing it. |

---

## Placement clarifications, as approved

**Sign-in at A8 and C3.** Users complete the substantive work before registering. Storage model as stated in the conventions section. Sensitive uploaded documents are not retained server-side anonymously without explicit disclosure.

**Capacity at A7.** Contextual, asked after Ponte understands the opportunity. A previous answer is a suggestion, never a silently applied identity. Active confirmation is required.

**Business verification at C7** is the standard mandatory gate for payment. It is **not a universal requirement before C7**. It may be requested earlier by a listing owner before sensitive disclosure or room admission (`DECISION-09`), or triggered by a specific risk requirement (`v2.1 §11`).

---

## What these flows deliberately do not decide

- Journey B, which is Journey E from E6 onward and needs no separate specification.
- Journey D, blocked on `PARAM-01`, the investigation price, and on nothing else.
- The room interior: procedure building, evidence, branches and decisions. A separate and larger model.
- Draft retention and inactivity handling, `PARAM-02`.
