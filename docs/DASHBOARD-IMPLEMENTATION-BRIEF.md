# No-code management dashboard — implementation brief

**Goal:** let the Ponte Trade team manage **products & pricing**, **marketing
copy**, **blog & content**, and **orders & customers** without editing code.

**Audience:** this brief is written to be executed by a developer or by Claude
Code against the `Geppix140269/ponte` repository.

---

## 1. Recommendation: extend the existing Supabase-native admin

**Do not add a third-party CMS (Sanity, Payload, Contentful).** Build the
dashboard on what the repo already has.

Why Supabase-native wins here:

- **The datastore already exists.** `supabase/schema.sql` already defines
  `products`, `categories`, `orders`, `order_items`, `profiles`,
  `newsletter_subscribers`, `bundle_items` and `order_notes`, with row-level
  security and an `is_admin()` helper.
- **The admin shell already exists.** `app/admin/` has Overview, Products,
  Orders and Users pages, an admin-only layout, and an `AdminDeliverForm`. It is
  currently mostly read-only — it needs editing capability, not a rebuild.
- **One auth system, one source of truth.** A headless CMS would add a *second*
  content store that has to be kept in sync with Supabase (for products) and
  reconciled with Stripe (for orders). That is more moving parts, not fewer.
- **Orders & customers cannot live in a CMS at all** — they are transactional
  records tied to Stripe. A CMS would only ever cover part of the request.

**Trade-off, stated honestly:** a headless CMS auto-generates its admin UI;
Supabase-native means we build the edit forms ourselves. But the forms are
modest, and the existing `app/admin` pages are already the scaffold. The
simplicity of a single datastore outweighs the form-building effort.

---

## 2. The critical prerequisite (read before Phase 1)

**The storefront does not read from the database today.** Product and category
pages read from the hardcoded arrays in `lib/catalogue.ts`. The admin pages read
from the Supabase `products` table. They are two separate sources of truth.

**Consequence:** until the storefront reads from the database, a products
dashboard changes nothing on the live site. Phase 1 must move the source of
truth into the database first. Phases 2–4 are additive and lower-risk.

---

## 3. Phase 1 — Products, pricing & categories

### 3.1 Database

Reconcile the live `products` table with everything `lib/catalogue.ts` carries.
The static `Product` type has fields the table is missing. Add a migration
(`supabase/migrations/01_catalogue_fields.sql`) that adds, if absent:

- `band text` — sub-grouping within a category (e.g. "Market Overview").
- `price_from boolean default false` — "From $X" pricing.
- `price_suffix text` — e.g. "/mo".
- `alt_price text` — e.g. "or $249/yr".
- `price_tiers jsonb` — tiered pricing (see `PriceTiers` in `lib/types.ts`).
- `savings_cents int` — bundle savings.
- `preview_pages int` (already in schema) — confirm present.

Bundle composition is already modelled by the `bundle_items` table — use it
instead of a `bundle_of` array.

### 3.2 Seed

Write `scripts/seed-from-catalogue.ts` that reads `CATEGORIES` and `PRODUCTS`
from `lib/catalogue.ts` and upserts them into Supabase (categories first, then
products, then `bundle_items`). This makes the current catalogue the seed and
keeps `lib/catalogue.ts` as the authoritative starting data.

### 3.3 Data layer

Refactor the catalogue accessors so the storefront reads from Supabase:

- Keep `lib/catalogue.ts` as the typed seed + fallback data.
- Add `lib/catalogue-db.ts` with async equivalents of `getProduct`,
  `getProductBySku`, `getCategory`, `productsByCategory`, `featuredProducts`,
  `relatedProducts`.
- Each function: if `isSupabaseConfigured()` read from the DB; otherwise fall
  back to the static array. This preserves the repo's existing
  graceful-degradation pattern (`lib/auth.ts` already uses it).

### 3.4 Storefront wiring

- `app/product/[slug]/page.tsx`, `app/category/[slug]/page.tsx` and
  `components/CatalogueBrowser` move to async data fetching.
- `generateStaticParams` currently statically renders every product. Switch to
  **ISR**: export `export const revalidate = 60` (or similar) so price/content
  edits appear within the revalidation window without a deploy. Alternatively
  call `revalidatePath()` from the admin save action for instant updates.
- Map DB snake_case columns to the camelCase `Product` type in one place.

### 3.5 Admin UI

- `app/admin/products/page.tsx` — add "New product", row links, status filter.
- `app/admin/products/new/page.tsx` and `app/admin/products/[id]/page.tsx` —
  create/edit form: title, slug, SKU, category, band, descriptions, includes
  list, price, currency, delivery type, featured toggle, status
  (`draft` / `published` / `archived`), config-fields editor, price-tiers
  editor.
- `app/admin/products/actions.ts` — server actions (`createProduct`,
  `updateProduct`, `archiveProduct`) that re-check `is_admin()` and call
  `revalidatePath()`.

### 3.6 Acceptance criteria

- Editing a price in the admin changes the live product page (within the
  revalidate window, or immediately if `revalidatePath` is used).
- A product set to `draft` disappears from the public catalogue (RLS already
  enforces `status = 'published' or is_admin()`).
- Checkout still works end-to-end after the cutover — **test this explicitly.**

---

## 4. Phase 2 — Marketing copy

### 4.1 Database

New table `site_content`:

```sql
create table if not exists site_content (
  key text primary key,            -- e.g. 'home.hero.headline'
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles
);
alter table site_content enable row level security;
create policy "site_content readable" on site_content for select using (true);
create policy "admin manage site_content" on site_content
  for all using (is_admin()) with check (is_admin());
```

Seed it with the current homepage and About copy (hero headline + sub-headline,
stats strip items, section eyebrows/headings, About principles).

### 4.2 Wiring

- Add `lib/content.ts` with `getContent(key, fallback)` — reads `site_content`,
  falls back to a hardcoded default so the site never renders blank.
- Refactor `app/page.tsx` and `app/about/page.tsx` to pull editable strings via
  `getContent`. Keep layout/markup in code — only the *words* become data.

### 4.3 Admin UI

- `app/admin/content/page.tsx` — a grouped form (Homepage / About) of labelled
  text fields, with a server action that upserts `site_content` and calls
  `revalidatePath('/')` and `revalidatePath('/about')`.

### 4.4 Acceptance

Marketing can change the hero headline and have it live in under a minute, with
no deploy.

---

## 5. Phase 3 — Blog & content

### 5.1 Database

```sql
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text,                       -- markdown
  cover_image_url text,
  status text default 'draft',     -- 'draft' | 'published'
  author text,
  published_at timestamptz,
  created_at timestamptz default now()
);
alter table posts enable row level security;
create policy "posts readable" on posts
  for select using (status = 'published' or is_admin());
create policy "admin manage posts" on posts
  for all using (is_admin()) with check (is_admin());
```

(Optional: a `glossary_terms` table — HS codes, chokepoints, landed cost —
strong long-tail SEO, cheap to add later.)

### 5.2 Routes

- `app/blog/page.tsx` — published posts, newest first.
- `app/blog/[slug]/page.tsx` — single post with per-post `openGraph` / canonical
  (follow the pattern now used on product pages) and `Article` JSON-LD.
- Render markdown — a small renderer; keep it simple.
- Add published posts to `app/sitemap.ts`.

### 5.3 Images

Reuse the Supabase Storage pattern already used for report PDFs (`lib/storage.ts`,
the `ponte-reports` bucket). Add a separate **public** bucket for blog images.

### 5.4 Admin UI

- `app/admin/blog/page.tsx` — list with status.
- `app/admin/blog/[id]/page.tsx` — editor: title, slug, excerpt, body,
  cover image upload, status, publish date. Plain markdown textarea first; add a
  rich editor (e.g. Tiptap) only if the team asks for one.

### 5.5 Acceptance

Publishing a post makes it live at `/blog/[slug]` and adds it to the sitemap.

---

## 6. Phase 4 — Orders & customers

This phase **extends** the existing read-only admin — most of it is already
there.

- **Orders** — extend `app/admin/orders/page.tsx`: filter by status / delivery
  status / date, search by email or order id, pagination beyond 100. Add an
  order detail page `app/admin/orders/[id]/page.tsx` showing items, config
  values, the customer, `order_notes`, and the existing `AdminDeliverForm`.
- **Customers** — extend `app/admin/users/page.tsx` with search; add
  `app/admin/users/[id]/page.tsx` showing the customer's orders, lifetime spend,
  and a role toggle.
- **Subscriptions** — `app/admin/subscriptions/page.tsx` reading
  `newsletter_subscribers` alongside Stripe subscription status.

**Hard rule — no money movement.** The dashboard may view orders and mark
delivery/fulfilment status, but must **not** issue refunds, charge cards, or
move money. Refunds link out to the Stripe dashboard. Stripe remains the source
of truth for all payment state.

### Acceptance

Support can find any order by customer email, view its full detail, and trigger
report delivery.

---

## 7. Cross-cutting concerns

- **Auth & RLS** — already in place for products/categories. Add the equivalent
  policies for every new table (public read of published rows, admin-only
  writes), as shown above.
- **Defence in depth** — every write goes through a Next.js server action that
  re-checks `is_admin()`. Do not rely on RLS alone.
- **Audit trail** — optional `admin_audit_log` table (who changed what, when).
  Cheap insurance once multiple people have admin access.
- **Admin navigation** — add "Content" and "Blog" to `adminNav` in
  `app/admin/layout.tsx`.

---

## 8. Sequencing, risk & effort

- Work on a `dashboard` branch against a **staging Supabase project** — never
  develop this against production data.
- **Phase 1 is the highest-risk step** — it changes how the storefront sources
  its data. Run `npm run build` and a full checkout test immediately after.
- Phases 2–4 are additive and low-risk.
- Rough effort for an experienced Next.js + Supabase developer (or Claude Code
  with review): Phase 1 ~3–5 days · Phase 2 ~1–2 days · Phase 3 ~3–4 days ·
  Phase 4 ~2–3 days.

### Running this with Claude Code

Execute one phase at a time, for example:

> "Implement Phase 1 of `docs/DASHBOARD-IMPLEMENTATION-BRIEF.md`. Work on a new
> branch `dashboard`. Use the staging Supabase credentials in `.env.local`.
> When done, run `npm run build` and walk through a test checkout, then stop
> for review before Phase 2."

Review and deploy each phase before starting the next.
