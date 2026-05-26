# Capacity-Aware Queue — Design Brief

**Status:** Ready for implementation
**Author:** Giuseppe + Cowork (2026-05-26)
**Implemented tonight:** manual Stripe capture for non-instant SKUs (one piece of a bigger system, below).

---

## Why this exists

Ponte sells human-produced research reports. Every non-instant SKU requires
a human (currently Giuseppe) to interact with ADAMftd, generate the report
(~5-10 min per report on ADAMftd's side), QA it, watermark it, and deliver.

**Real capacity ceiling: ~20 reports per day. ~100 per 5-day week.**

The catalogue currently advertises hard SLAs ("48h delivery") that cannot
be honoured at any volume. If 100 orders land in one day, only the first
~20 ship within 48h; the rest are days or weeks behind. Customers see this
as a broken promise, the business sees this as either burnt reputation or
mass refunds.

This design solves it by making the queue **visible before payment** and
the **payment timing aligned with the queue**.

---

## The three layers

### Layer 1 — Capacity cap (admin sets it)

Each product (or product class) declares how much weekly slot capacity
it consumes from a shared pool.

Recommended pool config (env vars or a `capacity_config` table):

```
CAPACITY_PER_DAY_STANDARD = 18        # reports/day from ADAMftd + human QA
CAPACITY_PER_DAY_CUSTOM   = 2         # white-glove research, more time
CAPACITY_PER_DAY_INSTANT  = unlimited # auto-delivered, no human
```

Capacity is consumed when an order is placed (not when it is paid).
Capacity is released when an order is voided/refunded.

### Layer 2 — Queue visibility (customer sees it before paying)

On every product page and product card, server-side compute:

```
nextAvailableSlot(product) -> Date
```

Algorithm:
1. Look up `capacity_kind` for this product (instant / standard / custom).
2. Count "live" orders against that kind, in the queue (status:
   authorized | confirmed | in_production).
3. Working forward from today (skipping weekends per business calendar),
   find the first day where remaining capacity > 0 for this kind.
4. Add the product's standard production-time SLA (24h / 48h / 72h).
5. Return that date.

Product card copy changes from "48h delivery" to one of:

- Empty queue: *"Delivery by [Wed 28 May]. 48 hours from order."*
- Queue building: *"Delivery by [Fri 30 May]. 4 business days."*
- Queue full this week: *"Next available: [Tue 3 Jun]. Reserve your slot."*
- Saturated >3 weeks: *"Join the waitlist"* (no Buy button)

### Layer 3 — Manual capture (payment aligned with delivery)

**Implemented tonight** for any payment-mode order containing a non-instant
SKU. See `app/api/checkout/route.ts` (look for `useManualCapture`).

Flow:
1. Customer checks out. Stripe authorizes the card but does NOT charge.
2. Order lands in DB with status `authorized` and a confirmed delivery slot.
3. Admin confirms (within 4 hours): production starts, capture the
   authorization → customer is charged.
4. Admin voids (if Ponte can't deliver): authorization is released →
   customer is never charged.

Stripe's hold window is 7 days for most cards. We must capture or void
within that window. The admin UI must enforce this with a visible
"capture or void by" deadline on each authorized order.

---

## Schema changes required

```sql
-- products
alter table products
  add column capacity_kind text default 'standard' check (
    capacity_kind in ('instant','standard','custom','subscription')
  );

-- orders
alter table orders
  add column status_v2 text default 'authorized' check (
    status_v2 in (
      'authorized',  -- card on hold, awaiting our confirmation
      'confirmed',   -- delivery date set, capture imminent
      'captured',    -- charged, in production
      'delivered',   -- shipped to customer
      'voided',      -- could not deliver, auth released
      'refunded'     -- post-delivery refund (rare)
    )
  ),
  add column confirmed_delivery_at timestamptz,
  add column capture_deadline_at timestamptz,
  add column capture_method text default 'manual' check (
    capture_method in ('manual','automatic')
  );

-- order_items
alter table order_items
  add column slot_date date;  -- the day this item consumes capacity

create index orders_status_v2_idx on orders(status_v2);
create index order_items_slot_date_idx on order_items(slot_date);
```

The existing `status` column stays for backwards compatibility but
new code reads/writes `status_v2`.

---

## Slot computation

```typescript
// lib/capacity.ts (new file)

export type CapacityKind = "instant" | "standard" | "custom" | "subscription";

const DAILY_CAP: Record<CapacityKind, number | "unlimited"> = {
  instant: "unlimited",
  standard: 18,
  custom: 2,
  subscription: "unlimited",
};

// Business days: Mon-Fri. Adjust if you want to ship on Saturdays.
function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

export async function nextAvailableSlot(
  kind: CapacityKind,
  sla: "instant" | "24h" | "48h" | "72h" | "custom",
): Promise<Date> {
  if (kind === "instant" || kind === "subscription") return new Date();

  const cap = DAILY_CAP[kind];
  if (cap === "unlimited") return addSla(new Date(), sla);

  // Step forward day by day until we find a day with capacity left.
  const sb = createAdminClient();
  let candidate = new Date();
  let safety = 60; // never look further than 60 business days ahead
  while (safety-- > 0) {
    if (!isBusinessDay(candidate)) {
      candidate = addDays(candidate, 1);
      continue;
    }
    const count = await sb
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("slot_date", candidate.toISOString().slice(0, 10))
      // ... join to products on capacity_kind = kind, filter
      // orders.status_v2 in ('authorized','confirmed','captured')
      .then((r) => r.count ?? 0);
    if (count < cap) break;
    candidate = addDays(candidate, 1);
  }
  return addSla(candidate, sla);
}
```

The `addSla` helper adds 0/24/48/72 hours to the production start day,
returning the customer-facing delivery date.

---

## Admin order page additions

`app/admin/orders/page.tsx` needs three new buttons per authorized order:

1. **Confirm delivery date** — sets `confirmed_delivery_at`, sends the
   confirmation email to the customer with the date.
2. **Capture payment** — calls Stripe API `paymentIntent.capture()`, sets
   `status_v2 = 'captured'`, sends production-started email.
3. **Void authorization** — calls Stripe API `paymentIntent.cancel()`,
   sets `status_v2 = 'voided'`, sends "we couldn't fulfil" email.

Each order shows a visible **capture-or-void deadline** (7 days from
order) with red/amber styling when ≤24h remaining.

---

## Email flow

| Event                        | Email                                    | Notes |
|------------------------------|------------------------------------------|-------|
| Order placed                 | `sendOrderConfirmation` w/ manualCapture | DONE  |
| Slot confirmed by admin      | `sendSlotConfirmed` (new)                | "Delivery by [date]" |
| Production started (capture) | `sendProductionStarted` (new)            | "Charged €X, report being prepared" |
| Report delivered             | `sendReportReady`                        | DONE (existing) |
| Order voided                 | `sendOrderVoided` (new)                  | "We couldn't fulfil, no charge made" |

---

## Copy changes (when this ships)

- Product page: drop "48h delivery" labels, replace with computed slot
- Hero / homepage: same — show "Next available: [date]" instead of "48h"
- Terms of sale: add section on authorization vs capture
- FAQ: "When am I charged?" / "What if you can't deliver?"

---

## Edge cases worth thinking about

1. **Customer cancels** between order and our capture → void the auth,
   no charge.
2. **7-day deadline hits** before we capture → Stripe auto-releases the
   auth. We should void proactively at day 6 to maintain customer trust.
3. **Customer disputes the hold** with their bank → standard Stripe
   dispute flow, but easier because there's no actual charge to refund.
4. **Subscriptions** can't use manual capture (Stripe rule). Newsletter
   and Weekly Tender Digest stay on automatic capture.
5. **Mixed carts** (one-time + subscription) are already blocked by the
   existing `mixed_cart` check.
6. **Capacity changes** mid-week (Giuseppe hires an analyst, or takes
   PTO) — admin needs a way to bump `DAILY_CAP` and have it reflect
   on new slot computations without affecting orders already in queue.

---

## What's implemented tonight (smallest viable cut)

`app/api/checkout/route.ts`:
- Detects when a payment-mode order contains any non-instant SKU
- Passes `payment_intent_data.capture_method = "manual"` to Stripe
- Subscriptions and pure-instant orders remain on automatic capture

`lib/email.ts`:
- `sendOrderConfirmation` accepts optional `manualCapture` boolean
- When true, the email shows a "Card authorized, not yet charged" note

`lib/orders.ts`:
- Passes `manualCapture: hasProcessing` to the email helper

**What this gets you immediately:** when a customer orders a non-instant
report, their card is held (not charged) up to 7 days. You can manually
capture via the Stripe Dashboard when production starts, or void if you
can't deliver. No customer is ever charged for an undelivered report.

**What it does NOT do yet:** the queue, the slot display, the per-product
capacity, the admin capture/void buttons, the schema migrations. Those
are the next dev cycle.

---

## Next session checklist

In rough order:

- [ ] Add the schema migrations (capacity_kind, status_v2, confirmed_delivery_at, slot_date)
- [ ] Backfill capacity_kind on existing products
- [ ] Add `lib/capacity.ts` with `nextAvailableSlot`
- [ ] Update `app/api/checkout/route.ts` to allocate a slot_date when creating order
- [ ] Update Stripe webhook to set `status_v2 = "authorized"` (not "paid") for manual-capture orders
- [ ] Build admin order detail view with Confirm / Capture / Void buttons
- [ ] New email templates: sendSlotConfirmed, sendProductionStarted, sendOrderVoided
- [ ] Update product page to display computed delivery slot instead of hard SLA
- [ ] Update homepage hero copy (no more "48h delivery")
- [ ] Update lib/catalogue.ts deliveryType labels to be guidance, not promises
- [ ] Update terms of sale page
- [ ] Add a FAQ section
- [ ] Test end-to-end on a real $0.50 test transaction with manual capture

Realistic time budget: 1 focused 4-6 hour session.
