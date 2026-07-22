# Claude Code — work instructions for Ponte Trade

A playbook for Claude Code, run locally inside the repository at
`C:\dev\ponte`. Do the tasks in order. Stop for review between
Task 1 and Task 2, and between every dashboard phase.

This file used to name `C:\Users\gfuna\GitHub\ponte`. That is a retired clone
which held its own `.env.local` with eighteen live keys, and it is one of the
three copies that put three eras of the product on the live site at once. Do
not work there. See `docs/platform/SOURCE-OF-TRUTH.md`.

Stack: Next.js 14 App Router · TypeScript · Tailwind · Supabase · Stripe ·
Resend. Hosted on Vercel since 22 July 2026, on Netlify before that.

---

## Task 1 — Commit the website improvements (do this first)

The working tree already contains finished website improvements that have **not
been committed**. They were applied in a previous session and verified by
reading each file back complete; they have **not yet been compiled** — Task 1
includes that check.

**Files changed:** `app/layout.tsx`, `app/page.tsx`,
`app/product/[slug]/page.tsx`, `app/category/[slug]/page.tsx`,
`app/catalogue/page.tsx`, `app/about/page.tsx`,
`components/ProductBuyPanel.tsx`, `components/SiteFooter.tsx`,
`components/SiteHeader.tsx` — plus a new `docs/` folder (this file and two
others).

**What the changes do** (full detail in
`docs/CHANGELOG-website-improvements.md`):

- SEO — per-page OpenGraph / Twitter / canonical metadata on product, category,
  catalogue and about pages; `Organization` + `WebSite` JSON-LD site-wide;
  `Product` JSON-LD on product pages.
- Messaging — homepage hero audience line + ADAMftd explainer; trust-strip
  cleanup; standardised category names; newsletter/subscription wording fix.
- Conversion — a "Quality guaranteed" block on the buy panel; "watermarked PDF"
  re-worded as a benefit.
- Trust / UX — a guided "Start from what you're trying to do" recommender and a
  "Why buyers trust Ponte Trade" section on the homepage; nav labels aligned to
  category names.

**Steps:**

1. If any git command reports a stale lock, delete `.git/index.lock`,
   `.git/HEAD.lock` and `.git/refs/heads/main.lock` (empty leftover files from
   an earlier environment — safe to remove).
2. Run `npm run build`. If it fails, **STOP and report the errors** — do not
   commit a broken build. If it fails, the most likely spots to check are the
   new `lucide-react` icon imports in `app/page.tsx` (`Compass`, `Users`,
   `ShieldAlert`, `Rocket`, `FileSearch`, `ShieldCheck`, `BadgeCheck`) and the
   JSON-LD `<script>` tags in `app/layout.tsx` and `app/product/[slug]/page.tsx`.
3. When the build passes, create branch `website-improvements`.
4. `git add -A`, then commit with the message:
   `Website improvements: SEO/OpenGraph, JSON-LD, messaging, conversion, UX`.
5. `git push -u origin website-improvements`.
6. Report a summary of the commit and the build result, then **stop for
   review** before Task 2.

---

## Task 2 — Build the no-code management dashboard

**Full specification:** `docs/DASHBOARD-IMPLEMENTATION-BRIEF.md` — read it
before writing any code. Summary: extend the existing Supabase-native admin (do
**not** add a third-party CMS); four phases — (1) products & pricing,
(2) marketing copy, (3) blog & content, (4) orders & customers.

**Prerequisites — confirm before any code:**

- A Supabase project is reachable and its keys are in `.env.local`
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`). If they are missing, **STOP and ask** which
  Supabase project to use.
- Strongly prefer a **staging** Supabase project, not production — Phase 1
  changes how the live storefront sources its catalogue.

**Execution rules:**

- Work on a branch named `dashboard`.
- Do **one phase at a time, in order** (1 → 2 → 3 → 4).
- After each phase: run `npm run build`; for Phase 1 also complete a full test
  checkout; then **stop and report for review** before the next phase.
- Every database write goes through a Next.js server action that re-checks
  `is_admin()`. Add row-level-security policies for every new table.
- Do **not** build refund or money-movement actions — Stripe remains the source
  of truth for payments.

**Phase 1 is the highest-risk step.** The storefront currently reads products
from the hardcoded `lib/catalogue.ts`, not from the database. Follow section 3
of the brief exactly: add the column migration, seed from `lib/catalogue.ts`,
add a DB data layer with a static fallback, then switch the storefront to ISR.
Confirm checkout still works before moving on.

---

## Reference

- `docs/CHANGELOG-website-improvements.md` — what changed in Task 1 and why.
- `docs/DASHBOARD-IMPLEMENTATION-BRIEF.md` — dashboard rationale, architecture,
  and the full four-phase plan with migrations and acceptance criteria.
