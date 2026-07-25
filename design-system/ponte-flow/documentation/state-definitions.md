# Profile and participation — state definitions

The purpose of this file is to prevent false verification or trust claims in implementation.
Each state has a definition, an asset, and an explicit statement of what may **not** be inferred
from it. Where a rule says a state may not be inferred, the implementation must hold the two
values separately.

---

## Information states

### 1. Information supplied
The member has entered a value. Nothing has been checked.
**Asset** `profile.company`, `profile.products`, `profile.services`, `profile.markets`, `profile.contact`, `profile.organisation-role`
**Status** declared (warm neutral, **dashed** border)
**May not be inferred from** anything. Supplying is an event, not a quality.
**Does not imply** accuracy, completeness, evidence, or review.

### 2. Information complete
Every field requested **at this stage** is present.
**Asset** `evidence.information-complete` · **Component** H01 at 100
**Status** neutral. The words are *Profile information complete* or *Draft complete*.
**May be inferred from** a field-count check only.
**Does not imply** verification, review, eligibility or trust. 100% completeness and verification
are different axes. Never render "verified" at 100%.

---

## Evidence states

### 3. Evidence supplied
A named document or reference has been attached by the member.
**Asset** `evidence.provided`, `profile.document`, `profile.reference`
**Status** declared (dashed)
**Does not imply** that anyone has opened it.

### 4. Evidence under review
A review has been **opened** and a person must complete it.
**Asset** `evidence.under-review` · **Route condition** halted point + reserved route
**Status** under review (slate, solid)
**May be inferred from** an open review record only — never from an upload.
**Must not animate.** No decision exists. Never render before the review has actually started.

### 5. Evidence reviewed
Ponte has checked named evidence against a stated source on a stated date.
**Asset** `evidence.provided` in a checked row · **Status** checked (evidence green, solid)
**Must always carry** the source name and the date checked.
**Does not imply** that other evidence, other fields, or the member as a whole are reviewed.
Review is per item, per source, per date.

---

## Registration and participation

### 6. Registration required
The action needs an account. The member can pass this gate now.
**Asset** `participation.registration` (gate with a passable opening)
**Does not imply** that anything else is missing once registration completes.

### 7. Registration complete
An account exists.
**Asset** `profile.account`
**Does not imply** profile completion, eligibility, evidence or verification. It is one gate.

### 8. Participation eligible
Every condition for a specific action is met **for that action**.
**Asset** the action's own icon, enabled
**May be inferred from** an explicit condition set only.
**Does not imply** eligibility for any other action. Eligibility is per action.

### 9. Participation unavailable
A later stage exists but is not open to this member yet.
**Asset** `participation.boundary` · **Route condition** reserved route, **no point**
**Must always state** the condition in text.
**Is not** an error, a refusal or a judgement about the member.

### 10. Business verification complete
**This state does not exist in the product.**
No asset is drawn for it. If a verification process is later built, it gets its own definition,
its own asset and its own status — it must never reuse `evidence.information-complete`,
`profile.completion` or any checked evidence row.
**May not be inferred from** any other state in this document, in any combination.

---

## Communication

### 11. Communication unavailable
No channel exists between the parties yet.
**Asset** `participation.communication-unavailable` (1/3 dash between two anchors)
**Must always state** what would open it.
**Is not** a block, a warning or a negative finding about either party.

### 12. Communication enabled
A channel is open.
**Asset** `participation.communication-enabled` (solid link, both anchors filled)
**Does not imply** verification, review or endorsement of either party.

---

## Route conditions — the grammar behind the states

These four are the only conditions a route may express. They are not interchangeable.

| Condition | Meaning | Point | Route ahead | Animates |
|---|---|---|---|---|
| **Halted point** | The member must act | Slate, **no tail** | Slate 3/5 reserved | No |
| **Reserved route** | The next stage exists but is not available | **None** | Slate 3/5 reserved | No |
| **Active moving point** | A real process is underway **now** | Gold, with tail | Track at 16% | Yes |
| **Completed route** | The stated stage is genuinely complete | Both anchors filled | Solid throughout | No |

Rules:

- A **halted point** means a person — the member — is the blocker. Never used for platform work.
- A **reserved route** carries no point because nothing is waiting on anyone yet.
- An **active moving point** is permitted only while the platform is actually doing the work.
  Rendering it to suggest progress that is not happening is a defect, not a design choice.
- A **completed route** states only what that stage was. "Information complete" is not "verified".

## Inference matrix

| From ↓ / May infer → | Info complete | Evidence reviewed | Eligible | Verified |
|---|---|---|---|---|
| Information supplied | No | No | No | No |
| Information complete | — | No | No | No |
| Evidence supplied | No | No | No | No |
| Evidence under review | No | No | No | No |
| Evidence reviewed | No | — | No | No |
| Registration complete | No | No | No | No |
| Participation eligible | No | No | — | No |

Every cell is **No** by design. Each state is established by its own event and stored as its own
value. If the implementation ever needs a combined state, it must be defined and named here first.
