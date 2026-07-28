# ExecPlan: AI product intake and document-to-deal flow

**Status:** Active
**Opened:** 28 July 2026
**Owner decision:** Giuseppe Funaro, 28 July 2026
**Decision record:** `docs/decisions/ADR-0012-ai-product-intake-and-document-to-deal-flow.md`
on branch `product/ai-document-product-intake` (draft PR #68). **Not merged to
`main`**, so it is an accepted-but-unmerged decision under section 4 of the
source-of-truth SOP. Renumbered from ADR-0002 to ADR-0012 by owner decision on
28 July 2026; see D1.
**Implementation issue:** #67
**Branch:** `claude/ai-product-intake-flow-4bcd56`

---

## 1. Purpose and user outcome

Today a member who wants to offer or source a product must find their product in
the WCO HS 2022 catalogue before Ponte will let them continue. The composer's
Continue button stays disabled until `draft.product` and `draft.hsCode` are both
set, and the only ways to set them are a chapter/heading/six-digit drill-down or
a catalogue text search that matches HS descriptions.

A petroleum trader who types `gas oil` into that search gets whatever the HS
description index happens to return for those two tokens. Nothing in the product
knows that `gas oil`, `gasoil`, `EN 590`, `EN590`, `ULSD`, `10 ppm diesel` and
`automotive gasoil` are the same commercial product, so the member is left to
guess Ponte's vocabulary before Ponte will accept theirs.

After this change:

- the member describes the product in their own words, in any language, typed or
  spoken; or uploads the offer document they already have; or browses categories
  if they prefer to;
- Ponte identifies, structures and classifies it, and returns ranked candidates
  with a reason;
- HS classification becomes a suggested downstream field the member can confirm,
  not the gate on the front of the journey;
- a multi-product document produces multiple identified products, not one
  generic listing;
- every extracted claim is labelled as extracted, never as verified, and the
  member confirms before any draft is created.

The user outcome, in one line: **users describe or upload what they trade; Ponte
identifies, structures and classifies it.**

## 2. Authority consulted

Read in full, in the order `AGENTS.md` requires:

1. `AGENTS.md`
2. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
3. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
4. `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`
5. `docs/codex/00-START-HERE.md`
6. `docs/codex/SOURCE-OF-TRUTH-SOP.md`
7. `ADR-0012-ai-product-intake-and-document-to-deal-flow.md` (branch
   `product/ai-document-product-intake`, fetched and read at commit `c1cda70`)
8. GitHub issue #67

Also consulted for the parts they govern:

- `design/authority/bridge/v1/README.md` and
  `design/authority/bridge/v1/implementation/01_IMPLEMENTATION_NOTES.md`
- `docs/decisions/ADR-0001-unified-trade-market.md`
- `docs/decisions/ADR-0002-ponte-design-constitution.md` and
  `docs/decisions/ADR-0010-constitution-led-interface-rebuild.md`
- `docs/codex/CURRENT-STATE.md`, `FEATURE-FLAGS.md`, `KNOWN-ISSUES.md`
- `.agent/PLANS.md`

The clauses that constrain this work most directly:

| Authority | Clause | Effect here |
|---|---|---|
| North Star 5.3 | Voice is not a primary feature; voice *inside a journey* is unaffected | Voice is an assist on the Describe step, never the entry control |
| North Star 3.4 | User language overrides database language | The member's own wording is preserved and shown back, never replaced by the HS description |
| North Star 5.2 | Nothing on the entrance may be manufactured | No confidence number is printed that the resolver did not compute; no HS code is asserted as confirmed |
| Constitution 8 | Bridge System law | The three intake methods are a Bridge, not cards, tabs or a stepper |
| Constitution 7 | Icon law | Approved registry keys only; no new SVG. A missing icon is escalated |
| Constitution 14 | Records, evidence and status | Extracted / confirmed / verified / missing are four distinct states, never collapsed |
| Constitution 19 | State completeness | Every state in issue #67 is implemented and evidenced |
| AGENTS.md | AI may structure, compare, explain, recommend and draft; it must not silently publish, verify or commit | The resolver never auto-selects through material ambiguity |

## 3. Current implementation discovered

Inspected before any change was made.

### The journey as it exists

```text
/[locale]/structure?family=products&intent=offer_product
  -> app/[locale]/structure/page.tsx        server shell, validates the entrance
  -> lib/desk/entrances.ts                  entranceFromParams, requiresHsClassification
  -> components/structure/StructureComposer.tsx
       S01 IntentStep      -> HsDrill (products) | SubjectStep (services, distribution)
       Structuring         -> a 1.9s reassurance animation, no work behind it
       S02 FactsStep       -> bucketize(draft)
       S03 CompleteStep    -> one question per open gap
       S04 PreviewStep     -> public / private / reviewer
       S05 SubmitStep      -> blockers, AccountGate, POST /api/marketplace/submit
       S06 ReceivedStep
```

`HsDrill` is the whole of product identification today: a category grid, a
chapter list, a heading list, a six-digit list, and a `?q=` search that hits
`/api/hs/search`. `pick()` writes `product` (the HS row's name) and `hsCode`, and
`IntentStep`'s `ready` is `!!draft.intent && !!draft.product`.

`entrances.ts` already isolates the rule that only the Products family is
classified: `requiresHsClassification(family)` returns true only for `products`,
and `lib/structure/draft.ts` `needsHsCode()` mirrors it. **This is the seam the
change uses**, and it is why Trade services and Distribution are untouched: they
never reach the product intake at all.

### What is reusable, unchanged

| Asset | Use here |
|---|---|
| `components/ponte/bridge/BridgeRoute.tsx` | The approved Family/Action Bridge primitive: arch geometry, station placement from measured path length, elevation mode below 460px, radiogroup with roving tabindex, gold runner on `offset-path`, `.br--still` for capture |
| `design-system/ponte-flow/components/PonteIcon.tsx` | The only icon renderer. Unknown key throws |
| `components/ponte/state/LifecycleState.tsx` | loading / waiting / blocked / active / under review / completed / error, distinct in words and marker geometry before colour |
| `lib/ponte/progress.ts` | Deterministic weighted progress, floor 20, never 0, 100 only on completion |
| `lib/ai.ts` | The single metered model boundary. Every call is costed and recorded in `ai_calls` |
| `lib/landing/interpret.ts` | The existing pattern for "AI reads any language, returns an English trade name, degrades to null" |
| `lib/hs/index.ts`, `/api/hs/search` | The HS catalogue, which stays: it becomes the downstream confirmation, not the gate |
| `components/hs/hsCategories.tsx` | The approved sector grid, reused verbatim for Browse |
| `components/AccountGate.tsx` | Modal, never redirects, completes the pending action itself |
| `components/find/HsProductPicker.tsx` | The existing Web Speech voice pattern, including silent absence where unsupported |
| `lib/taxonomy/market.ts` | `PRODUCT_SECTORS` is the canonical category hierarchy the catalogue maps onto |

### What does not exist and must be built

- **No semantic product resolution anywhere.** `lib/landing/intent.ts` is a
  route classifier with a small English keyword list; `lib/landing/interpret.ts`
  translates an objective into an English trade name but knows nothing about
  products, synonyms, standards or grades.
- **No product catalogue.** The HS catalogue is a customs nomenclature, not a
  commercial product vocabulary. Nothing in the repository knows that EN 590 and
  ULSD are the same thing.
- **No document upload or extraction of any kind.** `supabase.storage` is used
  in exactly two places, both for verification and listing evidence
  (`components/ListingForm.tsx`, the admin pages). There is no document parsing,
  no multipart intake, no extraction service.
- **No draft resume across authentication.** `AccountGate` preserves the draft
  *in React state* because it is a modal that never redirects. That is enough
  for a submit, and not enough for an intake session a member may leave.

### Constraints discovered that shape the design

1. **`scripts/check-governance.mjs` runs a ratchet on hand-authored `<svg>`**
   over `app/` and `components/`. The list may shrink and may never grow, and
   `components/structure/StructureComposer.tsx` is on it. Every new component
   must therefore contain no `<svg>` literal at all. This is a hard build gate,
   not a style preference.
2. **The Flow registry has no microphone, upload, search, arrow or check icon.**
   Constitution section 7 makes a missing icon a gap to escalate rather than
   permission to draw one. Two consequences: the intake methods are rendered as
   Bridge stations, which by approved design carry *no* icon; and the voice
   control is a text-labelled button. `profile.document`, `deal.category`,
   `field.notes`, `deal.spec`, `deal.product`, `deal.preview` and
   `evidence.evreview` do exist and cover the rest.
3. **`npm run verify` ends in `next build`**, which needs the Supabase and
   Anthropic environment. Failures there are recorded as environmental.
4. **`scripts/check-encoding.mjs` bans em dashes in `app/` and `components/`**
   and rejects BOM and mojibake repository-wide.
5. **`messages/en.json` is generated** from `messages/_fragments/*.json` by
   `npm run messages:build`; the fragment is the file to edit.

## 4. Scope

### Included

- The Products family only, and within it the two product intents:
  `offer_product` (supply) and `source_product` (sourcing).
- Routes: `/[locale]/structure` when `family=products`.
- New services under `lib/products/` and `lib/documents/`.
- New API routes `POST /api/products/resolve` and `POST /api/products/extract`.
- New UI under `components/products/intake/`.
- One targeted change inside `components/structure/StructureComposer.tsx`:
  `HsDrill` stops being the product entry and becomes the Browse method reached
  through the intake.

### Explicitly excluded

- Trade services and Distribution and representation. `needsHsCode()` and
  `requiresHsClassification()` already exclude them, and neither function's
  behaviour changes.
- Any production database migration. The extraction and the resolved product
  ride on the existing submit payload; no column is added.
- Any production feature-flag change, deployment or merge.
- Changing `/api/marketplace/submit`, the AccountGate, the verification gate or
  the publication eligibility rules.
- Retrofitting the rest of the composer (S02 to S06) to the Bridge. That is
  `docs/plans/active/constitution-led-interface-rebuild.md`'s programme, and
  widening into it here would be the uncontrolled repaint AGENTS.md forbids.
- The Deal Room, monetisation, credits and entitlement.

## 5. Product rules

1. **Three intake methods, in this order:** Describe, Upload, Browse. Browse
   remains available and is not the default.
2. **No HS code is required before Ponte understands the product.** The HS code
   is a candidate classification, printed as a suggestion the member confirms.
3. **One resolver, one taxonomy, both intents.** The supply and sourcing
   journeys differ in the language around the product and in which end of the
   route is asked for. They do not differ in how the product is identified.
4. **Ambiguity produces a clarification state, never an empty result and never a
   silent pick.** When the top candidate does not clear the confirmation margin
   over the runner-up, the state is `ambiguous` and the member chooses.
5. **Nothing is invented.** A commercial term absent from the document is
   `missing`, not guessed. The resolver's rationale states what it matched on.
6. **Four provenance states, never collapsed:** extracted from document,
   confirmed by member, verified by Ponte, missing or unresolved. "Verified by
   Ponte" is rendered as *not yet available* on this journey, because Ponte does
   not verify a product claim today and saying otherwise would be the
   manufactured trust the North Star forbids.
7. **A multi-product document is never collapsed.** Each product is identified
   independently; the member chooses separate drafts or one intentional
   multi-product programme.
8. **The original document stays attached to the intake session** and is offered
   to the draft as supporting evidence, under the existing access controls.
9. **Confirmation precedes draft creation.** No draft is created and nothing is
   published until the member confirms the review state.
10. **Failure is explained, never silent.** Upload failure, extraction failure,
    an unconfigured model and a blocked file type each have their own state and
    their own recovery route.

## 6. Technical design

### Layers

```text
components/products/intake/          the journey (client)
        |
app/api/products/resolve             text  -> ranked candidates
app/api/products/extract             file  -> structured extraction
        |
lib/products/resolve.ts              deterministic lexical + synonym ranking
lib/products/ai-resolve.ts           semantic widening, metered, degrades to null
lib/products/extract-document.ts     multi-product extraction + provenance
lib/products/scan.ts                 deterministic multi-product text scan
lib/products/catalogue.ts            the canonical Ponte product vocabulary
lib/products/model.ts                ResolvedProduct, the seven preserved layers
lib/products/intake.ts               the pure state machine
        |
lib/documents/read.ts                bytes -> text or a model content block
lib/documents/ooxml.ts               docx / xlsx text without a new runtime dep
        |
lib/ai.ts                            the single metered model boundary
lib/taxonomy/market.ts               PRODUCT_SECTORS, the category hierarchy
lib/hs/index.ts                      the candidate HS classification, downstream
```

### The resolver: a cascade, not a lookup

**Rewritten after the first owner review.** The original design had two stages
and one fatal property: the model could return only keys that already existed in
the curated catalogue. The intent was "AI must not invent a product". The effect
was that the catalogue became the boundary of everything Ponte could understand,
and the owner found it by typing `avocado` and being told Ponte found nothing
close. A resolver whose ceiling is its own seed data does not satisfy "users
describe what they trade; Ponte identifies it".

Six stages, in `lib/products/cascade.ts`, each falling through to the next:

| # | Stage | Cost | Answers |
|---|---|---|---|
| 1 | Exact, over the curated catalogue | free | `EN 590`, `ULSD`, `gas oil` |
| 2 | Fuzzy, Damerau-Levenshtein over catalogue terms | free | `gasoill`, `icumsa 54` |
| 3 | Model identification, unrestricted | metered | `avocado`, `avogado`, `mandorle` |
| 4 | The HS 2022 catalogue, lexically | free | `avocado` when the model is down |
| 5 | Sector mapping, from the surviving HS chapter | free | every identified product |
| 6 | Clarification, only where genuinely ambiguous | free | `palm`, `sugar` |

Stages 1, 2 and 4 are deterministic, so the common cases are reproducible in a
unit test and cost nothing. Stage 3 is reached only when the free stages cannot
answer.

**Why two catalogues.** They fail in opposite directions, and the deploy preview
proves it: `avocado` against the HS index returns 0804.40 *avocados* (breadth,
no commercial vocabulary), while `gas oil` against the same index returns
seamless steel drill pipe (a customs nomenclature has no idea what a trader
means). The curated catalogue is depth where Ponte knows a market; HS 2022 is
breadth across everything traded; the model spans both and handles spelling,
language and form.

### The safety property, restated

The old rule was a ceiling on the output. The new rule is a constraint on what
the output may *become*, and it is strictly stronger:

1. an identified product carries provenance `ai_identified`, rendered as
   "Identified by Ponte, not yet confirmed";
2. it cannot reach a draft without the member confirming it. The reducer's
   `confirm` case is the only thing that upgrades it, and `draftCreated` from an
   unconfirmed review is a no-op;
3. every HS code the model proposes is **checked against the real catalogue**
   and dropped if it does not exist. The model may not mint classifications;
4. the Ponte sector is **derived** from the surviving HS chapter through
   `sectorForChapter`, not taken from the model;
5. a spelling correction is surfaced as "Did you mean...?", never silently
   applied;
6. it is scored below an exact curated match, because Ponte knowing a product is
   stronger evidence than Ponte working it out.

This is the decision record's own rule: AI may extract, structure, compare,
explain and recommend, and must not silently publish, verify or commit.
Identifying a product the member just named is recommending. Asserting a
commercial term they never gave is inventing, and that rule is unchanged and
still enforced in `extract-document.ts`.

### Confidence

`confidence` is a computed score in [0,1] derived from the match weights, not a
number the model asserts. It is rendered as one of three named bands (`Close
match`, `Likely match`, `Possible match`) with the matched terms printed beside
it, so the member sees what it matched on rather than a bare percentage. This
keeps North Star 5.2 (nothing manufactured) and Constitution 9 (a percentage is
a position along a defined procedure, not a credibility claim).

### Document extraction

`lib/documents/read.ts` turns an upload into something the model can read:

| Type | Path | Notes |
|---|---|---|
| `application/pdf` | Anthropic document content block, base64 | Native, no parser dependency |
| `image/png`, `image/jpeg`, `image/webp`, `image/gif` | Anthropic image block | Native |
| `text/plain`, `text/csv`, `message/rfc822`, `text/markdown` | UTF-8 text | Includes `.eml` email exports |
| `.docx`, `.xlsx` | `lib/documents/ooxml.ts` | OOXML is a zip; the text is in `word/document.xml` and `xl/sharedStrings.xml`. Uses `adm-zip`, already in the repository as a devDependency and promoted to a dependency |
| `.doc`, `.xls` (legacy binary) | Blocked with a named reason | Binary formats need a parser this repository does not have. The `blocked` state names the format and offers Describe or Browse |

`lib/ai.ts` gains content-block support so a PDF or an image can be sent without
a second, unmetered model path. This is an additive change to `AiCallOptions`;
the existing string `user` form is untouched.

`extract-document.ts` asks for one JSON object: commercial intent, an array of
products, and the commercial terms, each term carrying `value`, `source`
(`document` or `absent`) and `quote` (the verbatim words it came from, when
present). A term the document does not state comes back `absent` with a null
value, and the review screen renders it as missing. **The prompt forbids
inference**, and the parser drops any term that carries no quote, which is the
enforcement rather than the request.

`lib/products/scan.ts` is a deterministic pass over the extracted text using the
catalogue's own synonym index. It is what makes the three-product acceptance
test real without a network call: the fixture text contains `Gasoil 10ppm`,
`ULSD`, `EN590`, `D6`, `Fuel Oil` and `Jet A-1`, and the scan groups those six
mentions into three distinct catalogue products. The model stage enriches the
result; it is not what proves it.

### The intake state machine

`lib/products/intake.ts` is a pure reducer over a discriminated union, so every
state in issue #67 exists as a value that can be constructed in a test and
rendered in a story:

```text
initial -> typing -> analysing -> resolved | candidates | ambiguous | incomplete
initial -> voice  -> typing
initial -> upload -> analysing -> extracted | multiProduct
                              -> extractionFailed | uploadFailed | blocked
initial -> browse -> resolved
any     -> authInterrupted -> resumed -> (the state it left)
resolved | extracted | multiProduct -> review -> edited -> confirmed
confirmed -> draftCreated -> completed
```

`reduced-motion` is not a machine state: it is a rendering mode, honoured by the
approved Bridge and Flow motion CSS and asserted in the evidence suite.

### Resume across authentication

The intake session is serialised to `sessionStorage` under one key on every
transition, and rehydrated on mount. The uploaded file is **not** serialised;
the extracted text and the extraction are, and the session records that a
document was attached with its filename, so a resumed member sees what they
uploaded and is asked to re-attach only if they want the file on the draft. The
`authInterrupted` and `resumed` states exist so this is visible rather than
implicit.

### What is preserved on the product

The seven layers ADR requires, on `ResolvedProduct`:

```text
originalWording      the member's own words, verbatim, in their own language
normalised           the canonical Ponte product name
synonyms             trade terms and standards that reach this product
categoryPath         Ponte sector -> group -> product, from PRODUCT_SECTORS
attributes           the distinguishing technical attributes
candidateHs          suggested HS code and its confirmation state
searchText           the lexical representation
searchTerms          the token set for semantic retrieval
```

These travel on the draft and are written into the submitted record's own text
by the existing `synthesiseDetails`, exactly as the canonical family and intent
already are, because `listings` has no column for them and adding one is a
migration this plan does not authorise.

### Design implementation

| Element | Approved asset |
|---|---|
| Describe / Upload / Browse | `BridgeRoute mode="select"`, three stations, abutments `Your product` to `A structured draft` |
| Multi-product choice | `BridgeRoute mode="select"`, two stations |
| Analysing, blocked, failed, under review | `LifecycleState` |
| Progress across the intake | `lib/ponte/progress.ts`, weighted, never 0 |
| Icons | `profile.document`, `deal.category`, `field.notes`, `deal.product`, `deal.spec`, `deal.preview`, `evidence.evreview`, `evidence.infocomplete`, `market.family.products` |
| Editorial emphasis | The approved serif italic gold on the intake's principal sentence |
| Mobile | The Bridge's own elevation mode below 460px. No page-specific breakpoint |
| Reduced motion | The approved Flow contract; removal, never substitution |

No new colour, radius, shadow, font or animation is introduced. The intake
stylesheet sets layout only, from existing `--pf-*` tokens.

## 7. Migration plan

None. This change adds no column, no table, no RLS policy and no bucket.

The document is held in the intake session for the length of the session and is
offered to the draft as an attachment only through the existing evidence path.
Persisting an uploaded trade document server-side would need a bucket, a
retention rule and an RLS policy, and it is recorded here as the next decision
rather than taken quietly: **the file is not written to storage in this change**,
and the review screen says so.

Forward path when the owner authorises it: an additive `product_resolution`
JSONB column on `listings` and a `deal_documents` table, both documented in
`docs/codex/DATABASE-STATE.md` before anything is applied.

## 8. Experience states

Every state below is implemented, reachable and captured in the evidence suite
at 390 x 844 and at desktop.

| State | Behaviour |
|---|---|
| initial | Three Bridge stations, no method chosen, no percentage shown |
| typing | The member's words, echoed as given; Resolve is enabled from two characters |
| voice input | Web Speech assist beside the field; absent silently where unsupported; the transcript lands in the field as editable text |
| upload | File chosen, name and size shown, type validated before any call |
| analysing | `LifecycleState` active, with what Ponte is doing in words |
| resolved | One clear candidate, its matched terms, its category path, its candidate HS, and Confirm / Refine / Choose another |
| multiple candidates | Ranked list, each with its own rationale |
| ambiguous | The clarification question, named. No pre-selection |
| incomplete | The product resolved, decisive commercial terms still open, listed as gaps |
| extraction failure | The model could not read it. The text it did read, if any, and both other methods offered |
| upload failure | Network or size failure, with retry |
| blocked | An unsupported format, named, with the two working alternatives |
| authentication interruption | The gate over a preserved session |
| resumed | The session restored, with what was restored stated |
| edited | A member-changed field, marked confirmed by member |
| confirmed | The review accepted; nothing published |
| draft created | The draft exists; its reference shown |
| completed | The journey's end, routed to Workspace |
| reduced-motion | No travelling runner, no staged reveal; every component in its authored end state |

## 9. Validation

- Unit tests, all registered in `npm test`:
  - `lib/products/__tests__/cascade.test.ts`, the nine cases required at owner
    review: a known catalogue product, an ordinary product outside the
    catalogue, a misspelling, an ambiguous generic term, materially different
    processed forms, the model unavailable, a low-confidence identification,
    user confirmation, and a downstream HS suggestion. Every stage is injected,
    so all nine run with no network and no database
  - `lib/products/__tests__/resolve.test.ts` including the `gas oil` case
  - `lib/products/__tests__/catalogue.test.ts` (every entry maps to a real sector, no duplicate synonym across products)
  - `lib/products/__tests__/scan.test.ts` (the sanitised fixture yields exactly three products)
  - `lib/products/__tests__/extract-document.test.ts` (parser drops unquoted terms; multi-product shape)
  - `lib/products/__tests__/intake.test.ts` (every state reachable; resume round-trips)
  - `lib/documents/__tests__/read.test.ts` (type routing, blocked formats)
  - `components/products/intake/__tests__/intake-ui.test.tsx` (Bridge used, no raw SVG, provenance labels distinct)
- `npm run verify`, with any environment failure recorded separately.
- Playwright evidence at 390 x 844, desktop, and reduced motion.

No production check, deployment or migration is claimed.

## 10. Rollout and safe-disable

No feature flag is added. The change is reachable only from
`/structure?family=products&intent=offer_product|source_product`, and the Browse
method is the pre-existing `HsDrill` unchanged, so the safe-disable is a one-line
revert of the composer's product branch back to `HsDrill`. That is recorded here
so the rollback does not have to be designed under pressure.

The resolver degrades in three steps: model configured and reachable, model
absent (lexical only, and the surface says so), catalogue absent (impossible, it
is a module). No path returns an empty unexplained result.

## 11. Progress log

- **28 July 2026** - Authorities read; ADR fetched from
  `product/ai-document-product-intake`; current journey, taxonomy, AI services,
  upload surface, Bridge assets and icon registry inspected; two repository
  defects found and recorded below; this plan opened.
- **28 July 2026** - Implementation complete on
  `claude/ai-product-intake-flow-4bcd56`. Built in the order the plan sets:
  catalogue and resolver, document pipeline, intake state machine, API routes,
  UI on the approved Bridge, wiring into the real composer, tests, evidence.
  Four defects were found by the work itself and fixed, each recorded in
  section 12 as D6 to D9. All 66 evidence and verification checks pass; the
  repository test suite passes; `npm run verify` result is in section 13.

**Remaining, and deliberately not done here:**

- durable storage of the uploaded document (D5, owner decision);
- an additive `product_resolution` column and a `deal_documents` table (owner
  decision; the payload already carries the value);
- the microphone icon commission (D3);
- retrofitting S02 to S06 of the composer to the Bridge, which belongs to
  `constitution-led-interface-rebuild.md`;
- widening the product catalogue beyond its current working coverage.

## 12. Decisions and discoveries

### D1. The ADR number collided, and has been renumbered to ADR-0012

Draft PR #68 added `docs/decisions/ADR-0002-AI-PRODUCT-INTAKE-AND-DOCUMENT-TO-DEAL-FLOW.md`
beside the existing `ADR-0002-ponte-design-constitution.md`, which is on `main`,
is a required governance file in `scripts/check-governance.mjs`, and is cited by
`docs/codex/00-START-HERE.md`, `docs/codex/CURRENT-STATE.md` and section 25 of
the Design Constitution itself. Two different accepted decisions sat under one
number in one directory.

**Owner decision, 28 July 2026: renumber, and do not retain the collision.**

Done at source, on `product/ai-document-product-intake` (commit `a4ba831`), so
the number is actually changed rather than merely referred to differently here:

- the file is now `docs/decisions/ADR-0012-ai-product-intake-and-document-to-deal-flow.md`,
  adopting the lower-case convention every other ADR uses;
- the heading is `# ADR-0012`;
- the index in `docs/decisions/README.md`, which did not list this ADR at all,
  now has a row for it;
- **not one word of the decision changed.**

ADR-0012 is the next free number: ADR-0011 was taken by the market
discoverability decision merged the same day. Every reference in this plan, in
`DECISION-LOG.md` and in `CURRENT-STATE.md` resolves to ADR-0012.

### D2. Unresolved merge-conflict markers on `main`

`docs/codex/00-START-HERE.md` lines 48 to 67 and `docs/codex/CURRENT-STATE.md`
lines 4 to 12 contain literal `<<<<<<< HEAD`, `=======` and `>>>>>>> origin/main`
markers on `origin/main`. Both are binding governance records, and the authority
order a new contributor reads is currently printed twice with a conflict marker
between the two versions.

`CURRENT-STATE.md` must be updated by this pull request, so its conflict is
resolved here, keeping the ADR-0010 text (the later accepted decision) and
folding in the Desk amendment line the other side carried. `00-START-HERE.md` is
not otherwise in this change's path; its conflict is reported rather than
resolved silently.

### D3. Voice has no approved icon, and none is to be introduced here

The Ponte Flow registry has no microphone key. Constitution section 7 makes a
missing icon a gap to escalate rather than permission to draw one, so the voice
control is a text-labelled button and is absent entirely where the browser has
no Web Speech support.

**Owner decision, 28 July 2026: do not commission or introduce an unapproved
microphone icon in this pull request. Retain the Constitution-compliant
text-labelled control until an approved Ponte Flow icon exists.**

So this is a closed question for this change and an open commission for the
design system. It is recorded here so a later contributor reads it as a decision
rather than as an oversight to "fix" with a drawn icon.

### D4. "Verified by Ponte" is rendered as unavailable, not as false

The ADR requires the review state to distinguish verified by Ponte from the
other three. Ponte does not verify product claims today. Rendering the row as
"Not available on this journey" is truthful; rendering it as an empty checkbox
would imply a verification that could be obtained here, and rendering it at all
is still required so the four states stay visibly separate.

### D5. The uploaded file is not persisted server-side

See section 7. The decision record says the document "must remain attached to
the draft, subject to access and privacy controls". Attaching it durably needs a
storage bucket, a retention rule, a deletion rule and an RLS policy, none of
which exist.

**Owner decision, 28 July 2026: do not implement durable document storage in
this pull request. Session-based document processing is accepted for this
release. Durable upload retention, bucket architecture, access control,
deletion and RLS are recorded as a separate future decision and work package.**

Raised as issue #72 through the Product Decision proposal route, which is where
the source-of-truth SOP says a proposal enters. The intake keeps the document
for the session and the review screen states the limit in words, so nothing on
screen implies a durable attachment the product does not provide.

### D6. Two server-only modules were reaching the browser

The production build failed with `Can't resolve 'fs'`, because
`lib/documents/read.ts` unzips OOXML through `adm-zip` and a client component
imported it for three constants. The same shape existed a second time:
`ReviewPanel` and `lib/products/intake.ts` imported the term contract from
`lib/products/extract-document.ts`, which reaches the model through `lib/ai.ts`,
which reaches Supabase's admin client.

Both are now split: `lib/documents/accept.ts` and `lib/products/terms.ts` hold
the client-safe halves, and the server-side modules re-export them so a
server-side caller still has one import. The comment in each says which side is
which, because the next person will otherwise reintroduce it.

### D7. A standard designation was standing in for a product name

The acceptance fixture's longest term matching Jet A-1 is `DEF STAN 91-091`, so
the scan's first term put a defence standard where the product name belongs. The
scan now records the **document's own words** for the match, taken from the
text and preferring a synonym over a standard, which is both more readable and
more faithful to North Star 3.4. `ProductMention.label` is that value.

### D8. The review screen made a false provenance claim

Catalogue attributes (sulphur content, application, density) were rendered with
"Extracted from document" beside them, because the resolved product's attributes
and the document's attributes were one list. On the one screen whose entire job
is provenance, that is the failure Constitution section 14 exists to prevent.

They are now two lists. The document's attributes carry the extracted marker;
Ponte's product record renders **without a marker at all** and says so in a line
beneath it, because it is neither a claim the document made nor a confirmation
the member has given yet. A regression test pins it.

### D9. Two capture faults produced misleading evidence

Recorded because both looked like design defects and neither was:

- the first mobile run captured the horizontal deck squeezed into 390px. The
  Bridge picks its elevation drawing from `matchMedia` at hydration, and
  resizing a page after it exists but before navigating still hydrated against
  the wide state. The viewport is now set on the context, and every mobile
  capture asserts `br--v`;
- the first desktop run captured the intake at full page width because the
  gallery did not wrap it in `.sstep`, the composer's own step container.

Both are written up in the evidence README so the next evidence run does not
rediscover them.

### D10. ADR-0011 landed on `main` during implementation, and does not conflict

`ADR-0011-complete-market-discoverability-and-category-first-journeys.md` was
merged while this branch was open. Its section 5 requires **Trade services and
Distribution** to begin with clickable canonical categories rather than a
generic one-line subject field, and its Context records that "Products already
begin with a structured classification journey".

So the two decisions agree and do not overlap. This change governs Products only
and leaves the non-product subject step exactly as it found it, for ADR-0011's
own implementation to replace.

Two consequences, both acted on:

- the renumber for the intake ADR is **ADR-0012**, since ADR-0011 is taken. The
  owner accepted this on 28 July 2026 and it is done at source (D1);
- the scope-boundary check in `e2e/product-intake.spec.ts` no longer asserts
  that the non-product subject field is present. Pinning it would pin behaviour
  an accepted decision has already superseded. It asserts the boundary this
  change actually claims: neither family reaches the product intake, and neither
  is asked for a customs code.

### D11. The semantic stage was overwriting stronger lexical evidence

Found on the Netlify deploy preview, which has a model configured where the
local run does not. A member typing `gas oil`, which **is** a recorded synonym
of the EN 590 grade, saw the top candidate's band fall from "Close match" to
"Likely match", because the model also named that product and the merge replaced
the 0.95 exact-synonym score with the 0.62 semantic one.

Two rules were wrong and both are fixed:

- when both stages find the same product, the stronger evidence is kept and the
  model's reason is **added** to it. Agreement between two stages is not weaker
  evidence than one stage alone;
- the merged set is ranked by score as one list. Ranking the semantic half above
  the lexical half meant a 0.62 model guess outranked a 0.95 exact-synonym match
  the model had simply not mentioned.

The merge is now `mergeSemantic`, a pure exported function, so both rules and the
"a model cannot invent a product" rule are unit-tested without a network call.

### D12. The curated catalogue was the ceiling of what Ponte could understand

**The blocking defect, found by the owner in review on 28 July 2026.** Typing
`avocado` into Offer a product returned:

> Ponte did not recognise that yet. Ponte looked for avocado in its product
> vocabulary and found nothing close.

Avocado is traded by the million tonne. Ponte had never heard of it because the
model stage was restricted to returning keys that already existed in the curated
catalogue, and the catalogue held twenty-five products.

The restriction was written as a safety rule and it was the wrong safety rule.
"AI must not invent a product" had been implemented as "AI may not name a
product Ponte has not already been told about", which is a different and far
stronger claim, and it made the seed data the limit of the product.

**Fixed by replacing the ceiling with a cascade and a provenance state.** See
the resolver section above for the six stages and the six constraints that
replace it. The short version: Ponte may now identify anything a member names,
and what it identifies is marked `ai_identified`, is scored below anything
curated, has every customs code it proposes checked against the real HS
catalogue, gets its Ponte sector derived from that code rather than from the
model, and cannot reach a draft until the member confirms it.

**Also corrected, at the owner's instruction:** the unmatched state used to end
with "Ponte will not guess a product you did not name." It was shown to a member
who had named their product perfectly well, and it blamed them for Ponte's
limit. It now reads "We could not classify that confidently yet", says what
Ponte tried, and offers four ways on. A test asserts the old sentence cannot
come back.

**And a third capture fault.** The evidence run screenshotted the Bridge before
its layout effect had measured the deck, so one frame showed the stations piled
at the left edge. It looked exactly like a broken bridge and was a race. The
evidence now waits for the measured geometry before capturing; see the note on
`settled()` in `e2e/product-intake.spec.ts`.

## 13. Final evidence

**Branch:** `claude/ai-product-intake-flow-4bcd56`

**Repository checks**

| Check | Result |
|---|---|
| `node scripts/check-messages.mjs` | pass |
| `node scripts/check-encoding.mjs` | pass, 549+ files: no BOM, no mojibake, no em dashes in `app/` or `components/` |
| `node scripts/check-governance.mjs` | pass; icon-law ratchet unchanged at 11 lucide and 17 authored SVG, so this change introduced neither |
| `npm test` | pass, including 25 resolver, 24 document, 26 intake-session and 24 intake-UI tests added here |
| `tsc --noEmit` | pass |
| `next build` | pass |

**Visual evidence:** `docs/codex/audits/ai-product-intake/evidence/`, 26 states
at desktop, the same 26 at 390 x 844, and five under reduced motion, plus a
README recording how they are produced and the two capture faults that had to be
fixed first.

**Behavioural verification:** `npx playwright test e2e/product-intake.spec.ts`,
all passing against a production build. Includes the `gas oil` case end to end
on a server with **no `ANTHROPIC_API_KEY` set**, and both halves of the family
boundary: Trade services and Distribution reach the ADR-0011 category grid and
never the product intake, and Products reach the intake and never either
category picker.

**Production actions claimed:** none. No migration, no feature flag, no
deployment, no merge.

## 14. Reconciliation with ADR-0011, 28 July 2026

While this branch was building, `main` merged PR #70, which implements ADR-0011:
category-first classification for Trade services and Distribution &
Representation, on a canonical service and distribution taxonomy. Both changes
rewrote the composer's first screen and `lib/structure/draft.ts`, so they
conflicted.

**Owner decision.** Reconcile against `main`, routing explicitly by market
family. The two decisions are complementary journeys, not competing
implementations, and neither ADR's meaning changes.

| Family | Governing decision | What opens the composer |
|---|---|---|
| Products | ADR-0012 | The AI intake: describe naturally, upload a trade document, or browse categories |
| Trade services | ADR-0011 | `ClassifyStep`, on the canonical service taxonomy |
| Distribution & Representation | ADR-0011 | `ClassifyStep`, on the canonical distribution taxonomy |

**How the two flows were separated.** One branch, in `IntentStep`, on
`needsHsCode(draft)` — which is `familyOf(draft) === "products"` and already the
single answer to "is this a product record". The composer is not duplicated: S02
to S06, the account gate, the resume, the preview and the submit are one stack
for all three families, and the family decides only which question opens it.

**How the two data models coexist.** Both are kept whole and neither field
carries the other's meaning:

- `Classification` (ADR-0011) keeps every service, distribution, coverage and
  territory key. `StructureDraft` is still `Classification & { ... }`.
- `DraftResolution` (ADR-0012) keeps every layer of what Ponte understood about
  a product, plus the siblings, programme flag and source document name.
- `crossFamilyClassification()` already dropped a key belonging to another
  family at the submit boundary. Products gained nothing there and needed
  nothing: a product record has never been able to carry a service category.

The one place they now meet is `productSector`. ADR-0011 asks every record for a
sector key so a market can be filtered and counted; the ADR-0012 cascade already
derives that key, from the customs chapter an identification survived. So
`ResolvedProduct` carries the sector KEY as well as the label it already had in
`categoryPath`, and `applyResolution` writes it onto the draft. ADR-0011's
question is answered from ADR-0012's work rather than by asking the member
twice. An underivable sector stays empty, which is a gap and not a guess.

**Removed as superseded, not as disagreement.** The local `SUBJECT_HEADING` map
and the blank "State it in one line" `SubjectStep`. `lib/taxonomy/journey.ts` now
holds every heading beside the ordered questions it introduces, which is
strictly better and is ADR-0011's own reasoning.

**Corrected because it had become false.** `e2e/category-journeys.spec.ts`
asserted "products still open on the HS category journey" and captured
`desktop-13-products-hs-unchanged.png`. That was true of products when PR #70
was written and is not true of them now: ADR-0012 removed the customs
drill-down as the way in. The assertion was rewritten to the thing that is still
true and still worth pinning — a product record reaches neither the service nor
the distribution category picker — and the stale frame was replaced with
`desktop-13-products-open-on-intake.png`.

**New test.** `lib/structure/__tests__/family-routing.test.tsx` mounts the real
composer at all seven canonical entrances and reads what a member would see: both
product intents reach the intake and never the category grid, all five service
and distribution intents reach the category grid and never the intake, neither of
those families is asked for a customs code, every entrance reaches exactly one
classification journey, and a draft saved before either decision still opens.

**Old drafts.** No migration, and none needed. `emptyDraft()` supplies every
field either decision added, a resumed draft with none of them reads as the
legacy product-shaped path exactly as it did before, and `subjectFor()` and
`needsHsCode()` are both total over a partial draft. Two tests pin this.

**Visual evidence of the boundary:** six frames, one per family entrance, at
desktop and at 390 x 844, under
`docs/codex/audits/ai-product-intake/evidence/{desktop,mobile-390x844}/family-*.png`.

**Known environmental failure.** Two checks in `e2e/category-journeys.spec.ts`
(`a filter that cannot be answered never claims the board is empty` and `the
unfiltered board still reports its records and its reach`) read the live public
board and require a Supabase connection this local worktree does not have. They
arrived with `main` in PR #70, this branch changes no board, signal or filter
file, and they are recorded here as environmental rather than silently omitted.
