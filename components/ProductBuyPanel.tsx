"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  BadgeCheck,
  CalendarDays,
} from "lucide-react";
import type { Product } from "@/lib/types";
import type { SlotDisplay } from "@/lib/capacity";
import {
  displayPrice,
  formatPrice,
  effectivePriceCents,
} from "@/lib/format";
import { COUNTRIES } from "@/lib/countries";
import { useCart } from "@/lib/cart-store";
import { startCheckout } from "@/lib/checkout";

export default function ProductBuyPanel({
  product,
  slot,
}: {
  product: Product;
  /**
   * Slot info computed server-side in the product page wrapper. Optional so
   * the panel still renders if the queue lookup fails (we fall back to the
   * static delivery label).
   */
  slot?: SlotDisplay;
}) {
  const addItem = useCart((s) => s.addItem);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    if (!product.isConfigurable || !product.configFields) return true;
    for (const field of product.configFields) {
      if (field.required && !values[field.name]?.trim()) {
        setError(`Please complete: ${field.label}`);
        return false;
      }
    }
    setError(null);
    return true;
  }

  function handleAddToCart() {
    if (!validate()) return;
    addItem(product.sku, values);
    setAdded(true);
  }

  async function handleBuyNow() {
    if (!validate()) return;
    setBusy(true);
    await startCheckout([{ sku: product.sku, config: values }]);
    setBusy(false);
  }

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function panelPrice(): string {
    if (product.priceTiers) {
      const selected = values[product.priceTiers.field];
      if (!selected) {
        const min = Math.min(
          ...product.priceTiers.tiers.map((t) => t.priceCents)
        );
        return `From ${formatPrice(min, product.currency)}`;
      }
      return formatPrice(
        effectivePriceCents(product, values),
        product.currency
      );
    }
    return displayPrice(product);
  }

  const showManualCaptureNote =
    !product.isSubscription && product.deliveryType !== "instant";

  return (
    <div className="glass p-7">
      <div className="flex items-baseline gap-2">
        <span
          className="serif text-white"
          style={{ fontSize: 36, fontWeight: 500 }}
        >
          {panelPrice()}
        </span>
        {product.altPrice && (
          <span className="text-sm text-gray-2">{product.altPrice}</span>
        )}
      </div>

      {/* Dynamic slot block. Replaces the old static DELIVERY_LABEL chip. */}
      {slot ? (
        <div
          className="mt-4 rounded-[12px] px-4 py-3"
          style={{
            background: slot.isSaturated
              ? "rgba(201,151,58,0.10)"
              : "rgba(74,192,154,0.12)",
            border: slot.isSaturated
              ? "1px solid rgba(201,151,58,0.35)"
              : "1px solid rgba(74,192,154,0.30)",
          }}
        >
          <div className="flex items-center gap-2">
            <CalendarDays
              className={`h-3.5 w-3.5 ${slot.isSaturated ? "text-gold" : "text-positive"}`}
            />
            <span
              className={`text-[12px] uppercase font-medium ${slot.isSaturated ? "text-gold" : "text-positive"}`}
              style={{ letterSpacing: "0.18em" }}
            >
              {slot.primary}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-gray-2 leading-snug">
            {slot.secondary}
          </p>
        </div>
      ) : (
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase text-positive"
          style={{
            background: "rgba(74,192,154,0.15)",
            border: "1px solid rgba(74,192,154,0.35)",
            letterSpacing: "0.22em",
          }}
        >
          <Clock className="h-3 w-3" />
          Delivery on confirmation
        </div>
      )}

      {product.isConfigurable && product.configFields && (
        <div className="mt-6 space-y-4">
          <p
            className="text-[10px] uppercase text-gold"
            style={{ letterSpacing: "0.22em", fontWeight: 500 }}
          >
            Configure your report
          </p>
          {product.configFields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="field-label">
                {field.label}
                {field.required && <span className="text-gold"> *</span>}
              </label>

              {field.type === "country" ? (
                <select
                  id={field.name}
                  className="field"
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                >
                  <option value="" className="bg-navy">
                    Select a country…
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-navy">
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  className="field"
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                >
                  <option value="" className="bg-navy">
                    Select…
                  </option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value} className="bg-navy">
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  rows={4}
                  className="field resize-y"
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                />
              ) : (
                <input
                  id={field.name}
                  type="text"
                  className="field"
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      {added ? (
        <div className="mt-6 space-y-3">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-3 text-[11px] uppercase text-positive"
            style={{
              background: "rgba(74,192,154,0.15)",
              border: "1px solid rgba(74,192,154,0.35)",
              letterSpacing: "0.22em",
            }}
          >
            <Check className="h-3.5 w-3.5" /> Added to cart
          </div>
          <Link href="/cart" className="btn-gold w-full">
            View cart
          </Link>
          <button
            type="button"
            onClick={() => setAdded(false)}
            className="btn-ghost-light w-full"
          >
            Keep browsing
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={busy}
            className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Starting checkout…" : "Buy now"}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className="btn-ghost-light w-full"
          >
            Add to cart
          </button>
        </div>
      )}

      {showManualCaptureNote && (
        <p className="mt-4 text-[11px] leading-relaxed text-gray-2">
          Card authorized at checkout. Charged only when we start production
          on your confirmed slot. Full release if we cannot deliver.
        </p>
      )}

      <div
        className="mt-5 flex items-start gap-2 rounded-md px-3 py-2.5 text-[12px] leading-relaxed text-positive"
        style={{
          background: "rgba(74,192,154,0.10)",
          border: "1px solid rgba(74,192,154,0.25)",
        }}
      >
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium text-cream">Quality guaranteed.</span>{" "}
          Every report is manually QA&apos;d before delivery, if it misses
          your brief, we&apos;ll revise it free.
        </span>
      </div>

      <ul className="mt-5 space-y-2 border-t border-white/10 pt-5 text-[12px] text-gray-2">
        <li className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-gold" /> Licensed PDF,
          watermarked to you
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Secure payment via
          Stripe
        </li>
        <li className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-gold" /> Powered by ADAMftd
        </li>
      </ul>
    </div>
  );
}
