"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  BadgeCheck,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import type { Product } from "@/lib/types";
import {
  displayPrice,
  formatPrice,
  effectivePriceCents,
} from "@/lib/format";
import { COUNTRIES } from "@/lib/countries";
import { useCart } from "@/lib/cart-store";
import { startCheckout } from "@/lib/checkout";
import type { HSSearchResult } from "@/lib/hs/types";

// ── Inline HS code finder ────────────────────────────────────────────────────
function HSCodeFinder({ onSelect }: { onSelect: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HSSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 4 }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [query]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-gold hover:text-cream underline underline-offset-2 flex items-center gap-1 mt-1"
      >
        <Search className="h-3 w-3" />
        Don&apos;t know your HS code?
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase text-gold" style={{ letterSpacing: "0.18em" }}>
          HS Code Finder
        </span>
        <button type="button" onClick={() => { setOpen(false); setResults([]); }}>
          <X className="h-3.5 w-3.5 text-gray-2 hover:text-white" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. frozen mango chunks"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-gray-2/50 focus:outline-none focus:border-gold/40"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || query.trim().length < 2}
          className="px-3 py-2 bg-gold/20 text-gold text-[12px] rounded-lg hover:bg-gold/30 disabled:opacity-40 whitespace-nowrap"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1 pt-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onSelect(r.code); setOpen(false); setResults([]); }}
              className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <span className="font-mono text-[12px] font-semibold text-white bg-white/10 rounded px-1.5 py-0.5 shrink-0">
                {r.code}
              </span>
              <span className="text-[12px] text-gray-2 truncate group-hover:text-white">
                {r.description}
              </span>
              <ChevronDown className="h-3 w-3 text-gold/60 rotate-[-90deg] shrink-0 ml-auto" />
            </button>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <p className="text-[11px] text-gray-2/50 text-center py-1">
          Type and press Search
        </p>
      )}
    </div>
  );
}

export default function ProductBuyPanel({
  product,
}: {
  product: Product;
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

      {/* No upfront SLA promise. Delivery date is confirmed by ops within
          24h of order, before the customer's card is ever charged. */}
      <div
        className="mt-4 rounded-[12px] px-4 py-3"
        style={{
          background: "rgba(74,192,154,0.10)",
          border: "1px solid rgba(74,192,154,0.28)",
        }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-positive" />
          <span
            className="text-[12px] uppercase font-medium text-positive"
            style={{ letterSpacing: "0.18em" }}
          >
            Delivery confirmed within 24h
          </span>
        </div>
        <p className="mt-1 text-[12px] text-gray-2 leading-snug">
          Order now. We&apos;ll review feasibility and email your confirmed
          delivery date. Your card is held but not charged until we confirm.
        </p>
      </div>

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
                <>
                  <input
                    id={field.name}
                    type="text"
                    className="field"
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                  {field.name === "hs_code" && (
                    <HSCodeFinder
                      onSelect={(code) => setField(field.name, code)}
                    />
                  )}
                </>
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
          <Sparkles className="h-3.5 w-3.5 text-gold" /> Curated by senior
          analysts
        </li>
      </ul>
    </div>
  );
}
