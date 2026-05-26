/**
 * Ponte Trade — Capacity-aware queue logic.
 *
 * See docs/CAPACITY-QUEUE-DESIGN.md for the full model.
 *
 * Daily caps reflect operational reality, not aspirations:
 *   standard — ADAMftd report generation takes ~5-10 min, plus
 *              human QA + watermarking + packaging.
 *   custom   — bespoke briefs need a discovery call + analyst time,
 *              tightly limited.
 *
 * Override at runtime via env vars (no redeploy needed):
 *   CAPACITY_STANDARD_PER_DAY=18
 *   CAPACITY_CUSTOM_PER_DAY=2
 */

import type { CapacityKind, Product } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------- Daily caps

function readCap(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function dailyCap(kind: CapacityKind): number | "unlimited" {
  switch (kind) {
    case "instant":
    case "subscription":
      return "unlimited";
    case "standard":
      return readCap("CAPACITY_STANDARD_PER_DAY", 18);
    case "custom":
      return readCap("CAPACITY_CUSTOM_PER_DAY", 2);
  }
}

// ---------------------------------------------------------------- Derivation

/**
 * Compute a product's capacity kind. Uses the explicit override if set,
 * otherwise derives from deliveryType + isSubscription. This keeps the
 * catalogue free of ~40 redundant capacityKind annotations.
 */
export function deriveCapacityKind(
  p: Pick<Product, "deliveryType" | "isSubscription" | "capacityKind">,
): CapacityKind {
  if (p.capacityKind) return p.capacityKind;
  if (p.isSubscription) return "subscription";
  if (p.deliveryType === "instant") return "instant";
  if (p.deliveryType === "custom") return "custom";
  return "standard";
}

// ---------------------------------------------------------------- Date helpers

function startOfUtcDay(d: Date): Date {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5; // Mon-Fri UTC
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Add the product's SLA hours to a production-start day.
 * Used to convert the slot day (when we start work) into the customer-facing
 * delivery date (when they receive the report).
 */
function addSla(productionDay: Date, deliveryType: Product["deliveryType"]): Date {
  const hours =
    deliveryType === "instant" ? 0 :
    deliveryType === "24h" ? 24 :
    deliveryType === "48h" ? 48 :
    deliveryType === "72h" ? 72 :
    deliveryType === "96h" ? 96 :
    96; // custom defaults to 96h customer-facing estimate
  const c = new Date(productionDay);
  c.setUTCHours(c.getUTCHours() + hours);
  return c;
}

// ---------------------------------------------------------------- Queue count

interface QueueRow {
  slot_date: string | null;
}

/**
 * How many slots are already booked on a given UTC date for the given
 * capacity kind. Counts order_items whose parent order is still active
 * (authorized / confirmed / captured), joined via products.capacity_kind.
 *
 * Subscriptions and instant products don't consume slots, so they're
 * never queried.
 */
async function bookedOnDay(
  kind: CapacityKind,
  dayIso: string,
): Promise<number> {
  if (kind === "instant" || kind === "subscription") return 0;

  const sb = createAdminClient();

  // We join order_items -> products on capacity_kind, then filter by
  // order status. Supabase PostgREST supports the inner-join shape.
  const { count, error } = await sb
    .from("order_items")
    .select("id, products!inner(capacity_kind), orders!inner(status_v2)", {
      count: "exact",
      head: true,
    })
    .eq("slot_date", dayIso)
    .eq("products.capacity_kind", kind)
    .in("orders.status_v2", ["authorized", "confirmed", "captured"]);

  if (error) {
    console.warn("[ponte] bookedOnDay query error:", error.message);
    return 0;
  }
  return count ?? 0;
}

// ---------------------------------------------------------------- nextAvailableSlot

export interface SlotResult {
  /** UTC date string (YYYY-MM-DD) of the production day we'd allocate */
  productionDay: string;
  /** Customer-facing delivery date (production day + SLA hours) */
  deliveryAt: Date;
  /** Position in the queue on the chosen day (1-based) */
  positionInDay: number;
  /** Days from today to the production day (working days, excluding weekends) */
  businessDaysAhead: number;
  /** The capacity kind that was used */
  capacityKind: CapacityKind;
}

/**
 * Find the next business day with available capacity for this product,
 * and compute the customer-facing delivery date.
 *
 * Pure-instant and subscription products return now() — they don't queue.
 *
 * Robustness:
 * - Never looks more than 60 business days ahead (~3 months); returns
 *   the 60-day-out date if everything is somehow full.
 * - On query error, falls back to today's date (fail-open).
 */
export async function nextAvailableSlot(
  product: Pick<Product, "deliveryType" | "isSubscription" | "capacityKind">,
): Promise<SlotResult> {
  const kind = deriveCapacityKind(product);
  const today = startOfUtcDay(new Date());

  // Instant + subscription bypass the queue entirely.
  if (kind === "instant" || kind === "subscription") {
    return {
      productionDay: isoDate(today),
      deliveryAt: addSla(today, product.deliveryType),
      positionInDay: 1,
      businessDaysAhead: 0,
      capacityKind: kind,
    };
  }

  const cap = dailyCap(kind);
  // cap is guaranteed numeric for standard/custom; the unlimited branch
  // was handled above.
  const capNumeric = typeof cap === "number" ? cap : Number.MAX_SAFE_INTEGER;

  let candidate = today;
  let businessDaysAhead = 0;
  let safety = 60;
  let position = 1;

  while (safety-- > 0) {
    if (!isBusinessDay(candidate)) {
      candidate = addDays(candidate, 1);
      continue;
    }
    const booked = await bookedOnDay(kind, isoDate(candidate));
    if (booked < capNumeric) {
      position = booked + 1;
      break;
    }
    candidate = addDays(candidate, 1);
    businessDaysAhead++;
  }

  return {
    productionDay: isoDate(candidate),
    deliveryAt: addSla(candidate, product.deliveryType),
    positionInDay: position,
    businessDaysAhead,
    capacityKind: kind,
  };
}

// ---------------------------------------------------------------- Stripe auth window

/**
 * Stripe holds a manual-capture authorization for ~7 days for most cards.
 * Compute the deadline we must capture or void by. Stored on each order
 * at creation and surfaced to admin so we don't lose holds silently.
 */
export function computeCaptureDeadline(orderCreatedAt: Date): Date {
  const c = new Date(orderCreatedAt);
  c.setUTCDate(c.getUTCDate() + 6); // 6 days to leave a 24h safety buffer
  c.setUTCHours(20, 0, 0, 0); // end of business day UTC on day 6
  return c;
}

// ---------------------------------------------------------------- Display

export interface SlotDisplay {
  /** "Delivery by Wed 28 May" or "Next available Tue 3 Jun" */
  primary: string;
  /** "48 hours from order" or "4 business days" or "Reserve your slot" */
  secondary: string;
  /** ISO date for machine consumption */
  deliveryIso: string;
  /** Whether the queue is empty (true) or building (false) */
  isImmediate: boolean;
  /** Whether the queue is saturated >3 business weeks out */
  isSaturated: boolean;
}

/**
 * Build a customer-facing display string from a SlotResult.
 * Stays in plain string form so it can cross the server-to-client boundary
 * (e.g., passed as a prop to a "use client" component).
 */
export function formatSlot(slot: SlotResult): SlotDisplay {
  const d = slot.deliveryAt;
  // Friendly date: "Wed 28 May"
  const formatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const dateLabel = formatter.format(d);

  const isImmediate = slot.businessDaysAhead === 0;
  const isSaturated = slot.businessDaysAhead >= 15;

  let primary: string;
  let secondary: string;

  if (slot.capacityKind === "instant" || slot.capacityKind === "subscription") {
    primary = "Delivery: instant";
    secondary = "Available immediately on payment";
  } else if (isImmediate) {
    primary = `Delivery by ${dateLabel}`;
    secondary =
      slot.deliveryAt.getTime() - Date.now() <= 24 * 3600 * 1000
        ? "Within 24 hours of order"
        : "Within 48 hours of order";
  } else if (isSaturated) {
    primary = `Next available ${dateLabel}`;
    secondary = "Reserve your slot now";
  } else {
    primary = `Delivery by ${dateLabel}`;
    secondary = `${slot.businessDaysAhead + 1} business days from order`;
  }

  return {
    primary,
    secondary,
    deliveryIso: d.toISOString(),
    isImmediate,
    isSaturated,
  };
}
