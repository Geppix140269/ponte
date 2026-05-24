"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, FileText, Clock, Sparkles, BadgeCheck } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice, formatPrice, effectivePriceCents, DELIVERY_LABEL } from "@/lib/format";
import { COUNTRIES } from "@/lib/countries";
import { useCart } from "@/lib/cart-store";
import { startCheckout } from "@/lib/checkout";

export default function ProductBuyPanel({ product }: { product: Product }) {
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
          ...product.priceTiers.tiers.map((t) => t.priceCents),
        );
        return `From ${formatPrice(min, product.currency)}`;
      }
      return formatPrice(effectivePriceCents(product, values), product.currency);
    }
    return displayPrice(product);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-navy">
          {panelPrice()}
        </span>
        {product.altPrice && (
          <span className="text-sm text-navy/50">{product.altPrice}</span>
        )}
      </div>

      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <Clock className="h-3.5 w-3.5" />
        {DELIVERY_LABEL[product.deliveryType]}
      </div>

      {product.isConfigurable && product.configFields && (
        <div className="mt-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy/60">
            Configure your report
          </p>
          {product.configFields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="field-label">
                {field.label}
                {field.required && <span className="text-gold-600"> *</span>}
              </label>

              {field.type === "country" ? (
                <select
                  id={field.name}
                  className="field"
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                >
                  <option value="">Select a country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
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
                  <option value="">Select…</option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
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
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {added ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" /> Added to cart
          </div>
          <Link href="/cart" className="btn-navy w-full">
            View cart
          </Link>
          <button
            type="button"
            onClick={() => setAdded(false)}
            className="btn-outline w-full"
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
            className="btn-outline w-full"
          >
            Add to cart
          </button>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          <span className="font-semibold">Quality guaranteed.</span> Every
          report is manually QA&apos;d before delivery — if it misses your
          brief, we&apos;ll revise it free.
        </span>
      </div>

      <ul className="mt-5 space-y-2 border-t border-line pt-5 text-xs text-navy/60">
        <li className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-gold-600" /> Licensed PDF,
          watermarked to you
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-600" /> Secure payment via
          Stripe
        </li>
        <li className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-gold-600" /> Powered by ADAMftd
        </li>
      </ul>
    </div>
  );
}
