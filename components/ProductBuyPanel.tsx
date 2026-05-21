"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ShieldCheck, FileText, Clock } from "lucide-react";
import type { Product } from "@/lib/types";
import { displayPrice, DELIVERY_LABEL } from "@/lib/format";
import { COUNTRIES } from "@/lib/countries";
import { useCart } from "@/lib/cart-store";

export default function ProductBuyPanel({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

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

  function handleAdd(thenCheckout: boolean) {
    if (!validate()) return;
    addItem(product.sku, values);
    if (thenCheckout) {
      router.push("/checkout");
    } else {
      setAdded(true);
    }
  }

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  return (
    <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-navy">
          {displayPrice(product)}
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
            onClick={() => handleAdd(true)}
            className="btn-gold w-full"
          >
            Buy now
          </button>
          <button
            type="button"
            onClick={() => handleAdd(false)}
            className="btn-outline w-full"
          >
            Add to cart
          </button>
        </div>
      )}

      <ul className="mt-6 space-y-2 border-t border-line pt-5 text-xs text-navy/60">
        <li className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-gold-600" /> Watermarked PDF,
          licensed to you
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-600" /> Secure payment via
          Stripe
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-gold-600" /> Instant or SLA-backed
          delivery
        </li>
      </ul>
    </div>
  );
}
