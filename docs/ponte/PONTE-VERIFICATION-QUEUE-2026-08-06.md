# The member verification queue, 6 August 2026

**Source:** counts and status metadata run by the owner in the Supabase SQL editor. No names, no personal data, no row contents beyond status, dates and whether each external check left a record.
**Why this exists:** four member business verifications have been open for between 5 and 13 days. Nobody knew until 6 August.
**Scale:** production holds an estimated 10 profiles. **These four are a large share of the member base.**

---

## What is actually in the queue

| Requested | Days waiting | Status | Registry | VIES | GLEIF | Sanctions |
|---|---|---|---|---|---|---|
| 24 Jul | **13** | `review` | no record | no record | no record | ran |
| 24 Jul | **13** | `review` | no record | no record | no record | ran |
| 31 Jul | 6 | `review` | ran | ran | ran | ran |
| 1 Aug | 5 | `needs_selection` | ran | no record | no record | no record |

All four requested level 2.

---

## Three different problems, and they need three different actions

### 1 · The two from 24 July were never actually checked

`registry`, `vies` and `gleif` hold **no record at all** for either. Only the sanctions screen ran.

These did not reach `review` because something was flagged. **They reached `review` because there was nothing to decide on.** A human was asked to adjudicate a company lookup that never happened.

**Something changed between 24 and 31 July.** The 31 July request has all four checks recorded. The two from 24 July have one. Whatever was fixed in that week was never applied backwards to the requests that failed before it.

**That is the ordinary shape of this failure:** a fix lands, and the backlog sitting behind it is never replayed. Nobody is at fault and nobody noticed.

**Action: re-run these two, do not review them.** There is no evidence to review. Establish first what changed in that week, so that re-running is known to work rather than hoped to.

### 2 · The 31 July request is a genuine escalation, and it is six days old

All four checks ran and it still went to `review`. **That is the system working exactly as designed.** The automated perimeter completed, something needs a person, and it escalated.

`DECISION-19` says human escalation happens only for flagged cases. This is a flagged case. `verifications.reviewed_by` exists in the schema, so the design always assumed a human would arrive.

**Action: this one needs Giuseppe, and it is the only one that does.**

### 3 · The 1 August request is waiting on the member, not on Ponte

`registry` ran. `vies`, `gleif` and `sanctions` did not, which is correct: none of them can run until the entity is pinned, and `needs_selection` means the registry returned more than one candidate company and **the member must choose which one is theirs**.

The system is behaving properly. The open question is whether anybody told them.

**Action: confirm the member was prompted. If not, prompt them.** Five days of a member waiting for a message that was never sent is worse than five days of a queue.

---

## Two repository questions, no production access, quick

**`VQ-1`. Is there any admin surface that lists verifications in `review`?**

If there is not, the escalation path terminates nowhere, and the verification process has never been capable of completing. Three of the four records are sitting at exactly that point.

**`VQ-2`. When a verification enters `needs_selection`, is the member notified?**

`20260721i_verification_needs_selection.sql` created the state. If no email or in-product prompt accompanies it, a member can enter it and never learn they are the one being waited on.

**`VQ-3`. What changed between 24 and 31 July that made the registry, VIES and GLEIF checks run?**

It decides whether re-running the two stale requests will succeed. If it was a credential or a provider configuration rather than code, re-running is the whole fix.

---

## The wider point, which is not about verification

`ADR-0018` makes member business verification free, and several things downstream depend on it. **Nothing in the product or the operating model watches this queue.** It was discovered by a row count run for an unrelated reason.

Whatever else changes, **something has to watch it**, because the next four members will arrive the same way and nobody will see them either.
