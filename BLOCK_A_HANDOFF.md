# Ponte Block A - Claude Code Handoff (self-contained)
Date: 2026-07-23 | Repo: C:\dev\ponte (github.com/Geppix140369/ponte)

This file contains TWO parts:
- PART 1: the operating instruction (Block A only).
- PART 2: the full governing brief it refers to.

Give Claude Code this whole file (drop it in C:\dev\ponte and say "read this file", or paste it in full). Nothing else needs to be attached.

===============================================================================
PART 1 - OPERATING INSTRUCTION. BLOCK A ONLY.
===============================================================================

Read the full brief in PART 2 below. It supersedes all earlier Ponte development instructions. Then read docs/platform/SOURCE-OF-TRUTH.md, APPLY-PENDING.md, VERSIONS.md, RUNBOOK.md and EVOLUTION-INVENTORY.md. Treat this as a launch adaptation of the live product, not a rebuild and not a redesign.

Baseline: the brief was reviewed against commit 941c6eb, but main has since moved to 6273ec1 (PRs #2, #3, #4 merged 23 Jul). Use current main as the real starting point. Run git fetch, then git log and git diff 941c6eb..origin/main, and confirm which brief assumptions those merged PRs already changed before planning any edit.

Begin with Block A only: Separate Qualified Opportunities from Market Signals. Do not touch Blocks B to F.

Before editing anything, STOP and report:
1. Observed current behaviour: how getLiveDeals() works today and exactly how desk_radar rows currently reach the public board.
2. Exact files you will change, mapped to the Block A list in the brief (lib/board/live-deals.ts, scripts/import-desk-radar.mjs, the board/homepage loader, the new separate Market Signal query and public component, the admin signal-approval action, any additive desk_radar migration, and the production env values for signal visibility).
3. Live-schema assumptions: probe PRODUCTION for the real desk_radar columns and confirm whether the fields Block A needs already exist. The repo migration chain is not evidence of the live schema. State what you actually found in the DB.
4. Rollback plan for each change, including any migration.

Then wait for my go. Do not implement until I approve.

After I approve: implement the smallest complete Block A change, run the Block A tests listed in the brief plus verify, tsc and the production build, update the platform docs, commit, and give me the commit hash and the seven-point report from section 12. Then STOP for review before Block B.

Constraints: preserve the existing visual identity, suspension-bridge animation, dark theme and type system. This is not a visual redesign. Do not expand scope. The seamless aria-hidden second render in LiveDealsStrip.tsx stays unchanged. Market Signals may be public only through the separate, human-approved, explicitly-unverified workflow, and must never be merged into Qualified Opportunities. Do not apply any migration without probing production first. Do not run the deferred legacy-table drop.

===============================================================================
PART 2 - GOVERNING BRIEF (full text)
===============================================================================

# Ponte Trade
## Definitive 1 August Founding Network — Claude Code Development Brief

**Repository:** `Geppix140269/ponte`  
**Branch:** `main`  
**Repository state reviewed:** `941c6eb`  
**Launch date:** 1 August 2026  
**Purpose:** Adapt the product already live into a credible founding release of an invitation-led, verified trade opportunity network. This is a launch-readiness programme, not a rebuild and not a six-month roadmap.
**Authority:** This document supersedes the earlier Ponte repositioning brief and all earlier launch-brief drafts. Where an earlier instruction conflicts with this document, this document governs.

---

# 1. The Day-One Product

Ponte Trade launches as:

> **A modern international trade opportunity network combining verified participants, qualified opportunities, transparent external market signals and controlled human investigation.**

The platform has two service layers and two clearly separated classes of public content.

## 1.1 Ponte Network

A free professional network in which:

- public visitors may view Qualified Opportunities and clearly labelled Market Signals;
- members may build and submit offers or requirements;
- the member's business must be verified before an opportunity can be approved;
- Ponte records the member's role in the opportunity;
- Ponte reviews the opportunity before it becomes public;
- interested parties request an introduction;
- identities and contact details are disclosed only after the required acceptance.

The public opportunity board contains:

1. **Qualified Opportunities** — submitted to or directly reconfirmed by Ponte, reviewed by Ponte and connected to an identified participant.
2. **Market Signals** — recent external indications of buyer demand or seller availability that Ponte has not yet independently confirmed.

These classes must never share the same trust labels, status, CTA or visual treatment.

## 1.2 Market Signals

Market Signals give the founding platform useful market activity without pretending that third-party information is a Ponte mandate.

A Market Signal may contain only the commercial facts available from the source and conservatively extracted by Ponte, such as:

- product and specification;
- buyer or seller side;
- stated quantity and unit;
- destination or origin;
- Incoterm;
- payment indication;
- acceptable supplier origin;
- original signal date.

It must not publicly expose:

- the buyer's or seller's name;
- contact details;
- a claimed company identity that Ponte has not checked;
- the source platform URL;
- copied source prose;
- a `verified`, `qualified`, `reviewed opportunity` or `mandate` badge.

Every Market Signal must show:

> **External market signal — not yet verified by Ponte**

And:

> This information was identified through external market research. Ponte has not yet verified the participant, the continuing availability of the requirement or offer, or their authority to transact.

Primary CTA:

> **Ask Ponte to investigate**

Optional secondary CTA:

> **I may be able to supply this**

Both CTAs create a structured investigation request. They do not reveal a third-party identity or create a direct introduction.

## 1.3 Ponte Desk

An optional paid service for clients who want Ponte to:

- qualify or investigate an opportunity;
- check authority or mandate evidence;
- identify and approach suitable counterparties;
- coordinate introductions and discussions;
- support negotiation or transaction progress;
- manage a defined commercial mandate.

The network is the distribution and trust infrastructure. The Desk is the initial high-value revenue layer.

Market Signals feed the Desk: when a member requests investigation, Ponte can identify and approach the underlying party through an authorised channel, reconfirm the commercial requirement and seek permission to represent or publish it. Only then may the record be promoted into a Qualified Opportunity.

## 1.4 The launch promise

The product may say:

> Verified businesses. Qualified opportunities. Fresh market signals. Controlled introductions.

It must not say:

- verified deal;
- guaranteed counterparty;
- guaranteed mandate;
- every document verified;
- every deal papered;
- anonymous until NCNDA, unless an actual NCNDA acceptance workflow exists;
- open a deal room, because a deal room does not currently exist.

Ponte records evidence and limitations. It does not guarantee performance, solvency, product quality, title to goods, authority to transact, or successful closing.

---

# 2. Non-Negotiable Scope

## 2.1 Preserve

Preserve the current:

- visual identity and suspension-bridge landing design;
- Next.js, Supabase, Stripe, Resend, Anthropic and `next-intl` architecture;
- action-triggered `AccountGate`;
- six-digit OTP flow;
- listing form and media/document upload patterns;
- verification adapters and sanctions screening;
- AI assessment and fact-only write-up code;
- admin queues;
- controlled expression-of-interest flow;
- free marketplace / optional paid Desk distinction;
- ten-language infrastructure.

This is not a visual redesign.

## 2.2 Do not build before launch

Do not build:

- a full deal room;
- white-label partner networks;
- an affiliate dashboard;
- subscriptions;
- complex commission accounting;
- social feeds or messaging;
- advanced matching;
- a new authentication system;
- a second listing lifecycle;
- new intelligence products;
- automatic public publication of imported data.

Do not revive any retired shop, catalogue or report-era functionality.

## 2.3 Controlled use of external Market Signals

The existing `desk_radar` inventory may support a separate public Market Signals surface, subject to all controls in this brief. It must never appear as Ponte-submitted inventory and must never be merged with approved member listings.

Before launch:

1. Stop `getLiveDeals()` from merging `desk_radar` rows with approved member listings.
2. Give Market Signals a separate query, route or explicit discriminator, component and CTA.
3. Make every import private by default.
4. Require an explicit human `approved_for_signal_publication` action before public display.
5. Keep source name, source URL, original wording and any identity fields private and available to admin.
6. Publish a materially structured factual summary, not copied source prose.
7. Expire signals automatically according to the dates below.
8. Preserve the underlying data for review; do not delete it as part of this change.

For the 1 August launch:

- use buyer requirements as the main initial signal inventory;
- select approximately 150–250 strong signals, not all 5,005 imported records;
- prioritise signals no older than 30 days at publication;
- cap categories and repeated requesters so the board remains commercially diverse;
- exclude obvious duplicates, stale records, vague requests and low-confidence extraction;
- do not publish legacy seller offers merely to increase volume;
- automatically remove a Market Signal from public display 90 days after its original signal date, or earlier if disproved;
- allow admin to mark it `under_investigation`, `confirmed`, `unavailable`, `expired` or `withdrawn`;
- promote it to a Qualified Opportunity only after direct reconfirmation, participant identification and permission to publish or represent.

This is a product instruction, not a legal conclusion about third-party source rights. Preserve source provenance internally and do not build any mechanism that bypasses source access controls, exposes paid contact data or automates contact extraction.

---

# 3. Launch Blocker: Fix What a Member Badge Means

This must be completed before Ponte claims that participants are verified.

## 3.1 Current defect

The current `/verification` flow is presented as **Verify a trade counterparty**. A signed-in member can enter any company.

However, `lib/verification/pipeline.ts` grants `profiles.verification_level = 2` to the requesting user after a successful check. The admin verification action does the same. Therefore, a member can check an unrelated company and receive a Business Verified badge on their own profile.

That makes the current member badge unreliable.

## 3.2 Required separation

Create two explicit verification purposes:

1. `member_business` — the member is verifying the business they represent.
2. `counterparty_check` — the member is checking another company.

Add an additive field such as `verifications.purpose`, with a constrained value set. Do not infer the purpose from page copy.

Only `member_business` may:

- increase the member's `verification_level`;
- add member trust-score components;
- set the member's `verified_at`;
- create a public member badge.

A `counterparty_check` produces a case result for the requester, but must never change the requester's public verification level or trust score.

## 3.3 Bind the badge to the checked legal entity

For a member-business verification, retain an auditable relationship between:

- member profile;
- verification record;
- verified legal name;
- registration country;
- registration number, VAT or LEI where available;
- decision date;
- sanctions-screening state.

Prefer a profile reference such as `business_verification_id` to duplicating an untraceable boolean. If selected verified facts are denormalised onto the profile for display, the verification record remains the authority.

Add a clear **Verify my business** path from the account/onboarding experience. Keep **Check a counterparty** as a separate service.

## 3.4 Existing badges

Audit every profile currently above Level 0.

Do not retain a Business Verified badge unless the verification record clearly relates to the member's own business. This is a small founding database and should be reviewed manually rather than blindly backfilled.

## 3.5 Publication gate

An admin must not be able to approve a listing unless:

- the submitter has a current verified-member-business record;
- the business has no unresolved high-risk sanctions candidate;
- the submitter's role is recorded;
- required opportunity facts are present;
- the public qualification and limitations text is present;
- the opportunity is current.

Enforce this in the server action, not only in admin copy.

---

# 4. Progressive Onboarding

Strict verification applies when a member performs a trust-sensitive action, not before they can understand the product.

| Action | Day-one requirement |
|---|---|
| View Qualified Opportunity summaries | No account |
| View public Market Signals | No account |
| Start an `Ask Ponte to investigate` request | No account |
| Start and preview an opportunity | No account |
| Save or submit a draft | Confirmed email and basic profile |
| Submit a Market Signal investigation request | Confirmed email, name, business and country |
| Submit for Ponte review | Confirmed email, name, business and country |
| Publish an approved opportunity | Verified member business, role recorded, Ponte review |
| Express interest | Confirmed account, business information and structured interest |
| Receive a controlled introduction | Verified business, required acceptance and recorded disclosure |
| Use Ponte-managed service | Separately agreed written scope |

Keep `AccountGate`. A visitor should be able to start the action they intended, authenticate at the moment required, and continue without starting over.

New accounts currently receive three credits and a Level 2 check costs two. Use that to let founding members verify their own business without an immediate payment wall. Copy must state the mechanism accurately; do not simply claim all verification is free forever.

---

# 5. Qualified Opportunity Standard

Do not use one ambiguous `verified` label for the member, the opportunity and Ponte's involvement.

## 5.1 Separate public facts

Public opportunity pages may show:

- **Business checked**
- **Role declared**
- **Authority sighted** — only when evidence was actually reviewed
- **Opportunity reviewed**
- **Last confirmed [date]**
- **Ponte-managed** — only under a current written Desk engagement

Every label must correspond to stored data.

## 5.2 Minimum approval data

Before approval, the listing must contain:

- buy, sell or service side;
- product and specification;
- HS code where confidently classifiable;
- quantity and unit;
- frequency;
- origin and destination where known;
- delivery timing;
- Incoterm where applicable;
- payment terms or an explicit `to be agreed`;
- price basis or a recorded reason for withholding price;
- submitter role;
- chain depth where the submitter is not principal;
- authority/mandate status;
- relevant supporting evidence;
- validity end date or standing-validity state;
- reconfirmation date;
- public qualification summary;
- public limitations statement.

Use the columns already introduced by `supabase/migrations/20260722c_listings_v4.sql` where they exist. Do not add parallel fields.

First probe production to determine whether the v4 migration is present. The repository migration chain is not reliable evidence of the live schema.

## 5.3 AI behaviour

Connect the existing fact-only write-up engine to the composer and admin review.

AI may:

- structure supplied facts;
- identify missing or inconsistent information;
- ask follow-up questions;
- create a conservative draft description;
- translate approved copy;
- produce an internal risk note.

AI must not:

- invent commercial facts;
- imply authority;
- mark evidence as sighted;
- approve a listing;
- strengthen wording beyond supplied evidence;
- create a public opportunity from imported third-party content.

The user sees and confirms the structured draft. The public version is desk-approved text, not raw model output.

For Market Signals, AI may additionally:

- extract factual commercial fields from the imported text;
- normalise quantity, unit, destination, origin, Incoterm and payment indicators;
- propose a concise neutral title and summary;
- flag duplicates, stale dates, contradictions and missing data;
- assign an internal extraction-confidence score.

AI must never make a Market Signal sound stronger than the source material, infer that the requirement remains open, invent a company, imply that Ponte has spoken to the participant or automatically approve publication.

## 5.4 Market Signal lifecycle and data requirements

Reuse `desk_radar` as the source table unless production inspection shows a safer existing model. Do not create a parallel bulk-import system.

The implementation must support, either through existing fields or an additive migration:

- `signal_side` — buy or sell;
- original signal date;
- source name and source URL, admin-only;
- original text, admin-only;
- structured public facts;
- neutral AI title and summary;
- extraction-confidence and warning flags, admin-only;
- public publication approval and approving admin;
- public publication date;
- automatic public expiry date;
- investigation-request count;
- status: `private`, `approved_signal`, `under_investigation`, `confirmed`, `unavailable`, `expired`, `withdrawn`;
- a reference to the resulting member listing when promoted.

Do not expose the internal source, personal identity or contact fields through public API payloads, page source, metadata, analytics events or client-side component props.

A promotion from Market Signal to Qualified Opportunity must create or attach to the normal member-listing lifecycle. Do not simply change the Market Signal badge to `qualified`.

---

# 6. Smallest Repository Changes for Launch

## Block A — Separate Qualified Opportunities from Market Signals

Change:

- `lib/board/live-deals.ts`
- `scripts/import-desk-radar.mjs`
- the current board/homepage data loader;
- a dedicated Market Signal query and public presentation component;
- a Market Signal detail surface if the current routing can support it safely;
- an admin selection/review action for signal publication;
- any required additive `desk_radar` migration after live-schema inspection;
- production environment values governing Market Signal visibility.

Required result:

- `getLiveDeals()` returns only approved, current member listings;
- Market Signals are fetched separately and retain a distinct record type throughout the server and client;
- radar imports default to `private`;
- only individually admin-approved Market Signals appear publicly;
- public signal payloads contain no source URL, source name, person, contact detail or original prose;
- every signal has the mandatory disclaimer and `Ask Ponte to investigate` CTA;
- signals automatically disappear after their public expiry date;
- a signal can be promoted only by creating or linking a normal Qualified Opportunity;
- the seamless second render in `LiveDealsStrip.tsx` remains unchanged because it is intentional and `aria-hidden`.

Tests:

- radar rows never enter the Qualified Opportunities feed;
- imported radar rows remain non-public until explicit approval;
- no private provenance or identity field appears in a public response;
- stale, withdrawn and unavailable signals are excluded;
- approved signals show the exact unverified disclaimer;
- expired member listings are excluded.

## Block B — Honest member-business verification

Change:

- additive Supabase migration;
- `lib/verification/pipeline.ts`;
- `app/[locale]/admin/verifications/actions.ts`;
- `app/api/verification/route.ts`;
- `components/VerifyForm.tsx` or a purpose-aware variant;
- `app/[locale]/verification/page.tsx`;
- `app/[locale]/account/page.tsx`;
- verification message fragments.

Required result:

- self-business verification and counterparty checks are distinct;
- counterparty checks never award member status;
- the member badge is traceable to one successful self-business verification;
- existing badges are reviewable;
- the account page clearly prompts an unverified founding member to verify their business.

Tests:

- `counterparty_check` never changes profile level or trust score;
- `member_business` can change them only after an accepted result;
- admin approval follows the same rule;
- sanctions re-screening can suspend or remove the public badge as currently intended.

## Block C — Launch composer and publication gate

Change:

- `components/ListingForm.tsx`;
- `app/api/marketplace/submit/route.ts`;
- `app/api/writeup/route.ts` and `lib/writeup/*` only as needed;
- `app/[locale]/admin/listings/page.tsx`;
- `app/[locale]/admin/listings/actions.ts`;
- listing detail and board display;
- v4 reconciliation migration only if production probing proves it necessary.

Required result:

- existing quantity, unit, frequency, origin, destination, Incoterm, price, role and chain inputs are persisted into their structured v4 fields as well as any legacy compatibility fields still required;
- payment terms and validity are captured;
- broker/intermediary submissions clearly request authority evidence;
- the write-up engine generates a reviewable draft from supplied facts;
- admin sees the member-business verification and evidence state;
- server-side approval refuses an unverified member or incomplete opportunity;
- expired opportunities are not public;
- material changes after approval return the opportunity to review.

Do not turn the four-step composer into a long compliance questionnaire. Use progressive disclosure and ask only the fields relevant to the selected side and role.

## Block D — Investigation requests and controlled introduction truth

Change:

- `components/InterestButton.tsx`;
- `app/api/marketplace/interest/route.ts`;
- marketplace actions and connection display;
- Market Signal CTA and its server route/action;
- admin investigation-request queue or the smallest extension of the existing admin workflow;
- related copy fragments.

Before sending an expression of interest, capture at minimum:

- interested business;
- buyer, seller, distributor or intermediary role;
- target quantity/timing or supply capability;
- geography;
- short reason for fit.

Before submitting `Ask Ponte to investigate`, capture:

- requesting business;
- whether the requester is a potential supplier, buyer, intermediary or adviser;
- what they want Ponte to establish;
- indicative quantity, timing or supply capability;
- geography;
- certifications or evidence they can provide;
- whether they want an introduction if the external requirement is confirmed.

Required result:

- the listing owner receives a meaningful, structured request;
- acceptance/rejection is recorded;
- contact disclosure occurs only at the correct state;
- a Market Signal request enters an admin investigation queue and never contacts or reveals a third party automatically;
- admin can update the signal to `under_investigation`, `confirmed`, `unavailable`, `expired` or `withdrawn`;
- confirmation creates or links a normal Qualified Opportunity;
- no interface claims an NCNDA was signed unless that event is actually stored;
- no interface says a deal room exists.

Keep the existing connection architecture; extend it, do not replace it.

## Block E — Positioning and launch copy

Change source fragments under `messages/_fragments/`, then rebuild all locales with `scripts/build-messages.mjs`. Do not hand-edit compiled locale files.

Recommended English direction:

**Eyebrow**

> Founding Network

**Hero**

> Trade opportunities, without the usual noise.

**Subheading**

> An invitation-led international trade network where businesses are checked, opportunities are reviewed, and introductions are controlled.

**Primary CTA**

> Explore opportunities

**Secondary CTA**

> Submit an opportunity

**Three trust points**

1. **Business checked**  
   The legal entity is read against named public sources and sanctions lists.

2. **Opportunity reviewed**  
   Ponte records the submitter's role, the facts provided, the evidence sighted and what remains unverified.

3. **Introduction controlled**  
   Contact details are not distributed as a public lead list. An introduction follows the required acceptance.

**Market Signals section**

> Recent demand worth investigating.

> Ponte identifies recent indications of buyer demand through external market research. These signals are not verified opportunities. Ask Ponte to establish who is behind the requirement, whether it remains current and whether a qualified introduction can be arranged.

> **CTA:** Explore Market Signals

**Desk section**

> Need more than the platform?

> Ponte Desk can investigate an opportunity, identify and approach counterparties, coordinate an introduction or manage a defined commercial mandate. Scope and fees are agreed before work starts.

Retain the bridge animation, coloured punctuation, dark visual identity, mobile layout and type system.

Replace the following current copy:

- `Verified counterparties. Real deals.`  
  with evidence-specific language.
- `Open a deal room`  
  with `View opportunity` or `Request an introduction`.
- `Anonymous until NCNDA`  
  with `Identity disclosed only at the controlled introduction stage`.
- `Every listing vetted. Every deal papered.`  
  with `Every published opportunity reviewed by Ponte`.
- `documents are verified before anything is circulated. No exceptions.`  
  with `The public record states which evidence Ponte reviewed and what remains unverified`.

Update metadata and Open Graph copy to the same proposition.

Do not describe the total number of Market Signals as verified demand, active buyers or live deals. If a count is shown, label it literally, for example `Recent external market signals`.

## Block F — Founding invitations

Do not build an affiliate product.

For launch, support:

- one general Founding Network invitation URL;
- optional simple referral-code capture if it can be added without delaying Blocks A–E;
- attribution stored on the member profile;
- no commission calculation or dashboard.

If referral attribution is implemented:

- use a short allowlisted code;
- store it once at first entry/signup;
- never trust the code for authorisation or payment;
- expose counts only to admin;
- add privacy copy if required.

This block is lower priority than verification integrity, publication integrity and end-to-end testing.

---

# 7. Launch Pages and Navigation

Day-one navigation should lead to:

- Opportunities
- Submit an Opportunity
- Verify My Business / Verification
- Ponte Desk
- How It Works
- Account

The public Opportunities area must offer two unmistakable views:

- **Qualified Opportunities**
- **Market Signals**

Do not use a preselected filter that visually merges the two. A shared search or category control is acceptable only if the result type remains obvious on every card.

The public board remains accessible without an account. Full confidential information, investigation requests and introductions remain gated at the appropriate action.

The About page should name the founder:

> Ponte Trade was founded by Giuseppe Funaro, an international commercial operator with more than 30 years of experience building businesses, entering markets and working on cross-border procurement and trade opportunities. Ponte combines structured technology with direct human judgment: checking the business, clarifying the requirement and controlling the introduction before time is committed on both sides.

Do not imply 30 uninterrupted years as a commodity trader.

---

# 8. Stripe and Credits

Do not expand paid in-app functionality before fixing fulfilment replay safety.

The current Stripe webhook grants credits and then marks the purchase fulfilled. Make the operation idempotent through a database transaction/RPC or a database-enforced unique event/purchase key.

Required tests:

- duplicate webhook delivery grants credits once;
- a failure after the grant does not cause a second grant on retry;
- out-of-order events do not add credits incorrectly.

This does not block the founding-member use of existing signup credits if no credit purchase is required for launch. It does block actively promoting or expanding credit-pack sales.

---

# 9. Migration Safety

Before applying any migration:

1. Read `docs/platform/SOURCE-OF-TRUTH.md`.
2. Read `docs/platform/APPLY-PENDING.md`.
3. Read `docs/platform/VERSIONS.md`.
4. Probe the live Supabase schema.
5. Confirm the exact tables, columns, constraints, functions, triggers, RLS policies and buckets involved.
6. Use additive, idempotent migrations.
7. Probe the resulting behaviour after application.

The migration chain currently stops at `02_ponte_previews_bucket.sql`. Do not repair that file casually and do not assume later files were applied.

Do not run the deferred legacy-table drop as part of this launch work.

---

# 10. End-to-End Acceptance Test

Before launch, test the following with fresh accounts and real email delivery:

1. A signed-out visitor opens Opportunities and can clearly distinguish Qualified Opportunities from Market Signals.
2. Qualified Opportunities contains only member-submitted, approved and current opportunities.
3. Market Signals contains only individually approved, unexpired signals and shows the mandatory disclaimer.
4. Public Market Signal responses contain no source URL, person, contact detail, original prose or private provenance.
5. A new import remains private until an admin explicitly approves it.
6. A visitor opens a Market Signal and starts `Ask Ponte to investigate`.
7. At submission, `AccountGate` confirms the email, preserves the request and creates an admin investigation item.
8. The request reveals no third-party identity and sends no automated third-party contact.
9. Admin can mark the signal under investigation and later unavailable or confirmed.
10. A confirmed signal creates or links a normal Qualified Opportunity rather than inheriting a badge.
11. The visitor begins a new member opportunity without an account.
12. At submission, `AccountGate` confirms the email and preserves the work.
13. The new member receives the correct signup-credit balance.
14. The member selects **Verify my business** and completes the correct legal-entity check.
15. A separate **Check a counterparty** test does not change the requester's member badge.
16. The member submits a commercially structured opportunity.
17. The admin sees the verified business, role, evidence, AI draft and limitations.
18. The admin cannot approve an unverified or incomplete submission.
19. After approval, the public card and detail page show only truthful stored labels.
20. A second verified member submits a structured expression of interest.
21. The owner accepts or declines it.
22. Contact disclosure and both emails occur only at the correct state.
23. Expired Qualified Opportunities and Market Signals disappear from public surfaces.
24. English and all generated locales pass message and encoding checks.
25. Mobile layouts are checked at 390, 768 and 1265 pixels with no horizontal overflow.

Run:

- repository verification script;
- unit tests;
- TypeScript check;
- production build;
- browser smoke test of the live or preview deployment.

Record pre-existing failures separately. Do not call an environment failure a repository failure.

---

# 11. Delivery Sequence to 1 August

## 23–24 July — Truth and trust

- Separate Market Signals from member listings at query, API and presentation level.
- Make imports private by default.
- Add individual admin approval and mandatory signal disclaimers.
- Prepare a curated 150–250-signal launch selection.
- Remove unsupported public claims.
- Implement the verification-purpose separation.
- Audit existing member badges.

## 25–26 July — Qualified opportunity flow

- Probe and reconcile the required v4 listing fields.
- Persist the current form's structured facts.
- Add payment terms, validity and evidence state.
- Connect the fact-only write-up.
- Enforce the approval gate.

## 27–28 July — Introduction and presentation

- Add structured expressions of interest.
- Add structured Market Signal investigation requests and admin state changes.
- Correct disclosure and NCNDA/deal-room copy.
- Complete homepage, Qualified Opportunities, Market Signals, verification, About and Desk copy.
- Rebuild all locales.

## 29 July — Invitations and real inventory

- Prepare the general Founding Network link.
- Add lightweight referral capture only if core work is stable.
- Personally reconfirm the first real opportunities.
- Review the selected Market Signals individually and publish only those meeting this brief.

## 30–31 July — Launch proof

- Run the complete end-to-end acceptance test.
- Check email, mobile, translations, metadata, expiry and admin blocking.
- Publish a small number of genuine opportunities.
- Prepare rollback notes and the launch communications.

## 1 August — Founding Network launch

Launch to selected affiliates and personal contacts. The target is not listing volume. The target is:

- credible founding members;
- completed business verifications;
- current qualified opportunities;
- credible investigation requests generated by Market Signals;
- controlled introductions;
- the first paid Ponte Desk engagement.

---

# 12. Instructions to Claude Code

Use this exact operating instruction:

> Read this document in full, then inspect the current `main` branch and the live-schema guidance in `docs/platform/SOURCE-OF-TRUTH.md`, `APPLY-PENDING.md`, `VERSIONS.md`, `RUNBOOK.md` and `EVOLUTION-INVENTORY.md`. Treat this as a launch adaptation of the existing product, not permission to redesign or rebuild it.
>
> Begin with Block A only. Before editing, report the exact files, live-schema assumptions and rollback. Implement the smallest complete change, run the relevant tests and build, update the platform documentation, and report the resulting commit. Then stop for review before beginning Block B.
>
> Work through Blocks A–E in order. Block F is optional and must not delay the launch-critical work. Preserve the existing design and reuse existing modules. Market Signals may be public only through the separate, human-approved, explicitly unverified workflow defined here; never merge them into Qualified Opportunities. Do not invent evidence, expose private source or contact data, claim functions that do not exist, or apply migrations without probing production first.
>
> For every block, report:
>
> 1. observed current behaviour;
> 2. changed files;
> 3. database changes and proof they applied;
> 4. tests and build results;
> 5. manual production checks;
> 6. rollback;
> 7. remaining launch risks.

---

# 13. Definition of Launch-Ready

Ponte is ready to announce when:

- Qualified Opportunities and Market Signals are separate in queries, APIs, cards, detail views, status and CTA;
- imported records are private by default and require individual approval for signal publication;
- every public signal is a materially structured, anonymised factual summary with the mandatory unverified disclaimer;
- no private source, identity, contact or original-text field is exposed publicly;
- Market Signals expire automatically and can enter a controlled investigation workflow;
- only direct reconfirmation and permission can promote a signal into the normal Qualified Opportunity lifecycle;
- a public member badge is tied to that member's own verified business;
- checking another company cannot improve the member's badge;
- an opportunity cannot be approved without the required member and opportunity evidence;
- public labels say exactly what Ponte checked and what remains unknown;
- AI structures facts but never approves or invents them;
- controlled introductions work end to end;
- unsupported NCNDA and deal-room promises are removed;
- the optional Desk service is visible and understandable;
- the existing design remains intact;
- a small inventory of real, reconfirmed Qualified Opportunities and a curated Market Signal board are live;
- the complete acceptance path has been tested on mobile and desktop.

That is the 1 August product. Everything else waits for evidence from the founding launch.
