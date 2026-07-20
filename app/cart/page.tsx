"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { getProductBySku } from "@/lib/catalogue";
import { formatPrice, effectivePriceCents } from "@/lib/format";
import { countryName } from "@/lib/countries";
import { startCheckout } from "@/lib/checkout";
import type { CartItemConfig } from "@/lib/types";

function describeConfig(sku: string, config: CartItemConfig): string[] {
  const product = getProductBySku(sku);
  if (!product?.configFields) return [];
  return product.configFields
    .filter((field) => config[field.name])
    .map((field) => {
      const raw = config[field.name];
      const value =
        field.type === "country" ? countryName(raw) : raw;
      const label =
        field.type === "select"
          ? field.options?.find((o) => o.value === raw)?.label ?? raw
          : value;
      return `${field.label}: ${label}`;
    });
}

export default function CartPage() {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const subtotalCents = useCart((s) => s.subtotalCents());
  const [busy, setBusy] = useState(false);

  async function handleCheckout() {
    setBusy(true);
    await startCheckout(items);
    setBusy(false);
  }

  if (items.length === 0) {
    return (
      <section className="container-px py-24">
        <div className="glass p-12 flex flex-col items-center text-center max-w-xl mx-auto">
          <ShoppingCart className="h-10 w-10 text-gray-2" />
          <h1
            className="serif text-white mt-6"
            style={{ fontSize: 32, fontWeight: 500 }}
          >
            Your cart is empty
          </h1>
          <p className="mt-3 text-gray-2">
            Nothing here yet. See what the desk offers.
          </p>
          <Link href="/pricing" className="btn-gold mt-7">
            Browse the Catalogue
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-px py-14 lg:py-20">
      <header className="mb-10">
        <span className="pill">Cart</span>
        <h1
          className="serif text-white mt-6"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 400,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
          }}
        >
          Your cart
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_360px]">
        <div className="glass p-7 md:p-9">
          <ul className="divide-y divide-white/10">
            {items.map((item, index) => {
              const product = getProductBySku(item.sku);
              if (!product) return null;
              const config = describeConfig(item.sku, item.config);
              return (
                <li
                  key={index}
                  className="flex items-start justify-between gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p
                      className="serif text-white text-lg"
                      style={{ fontWeight: 500 }}
                    >
                      {product.title}
                    </p>
                    <p className="mono text-[11px] text-gray-2 mt-1">
                      {product.sku}
                    </p>
                    {config.length > 0 && (
                      <ul className="mt-3 space-y-1 text-[12px] text-gray-2">
                        {config.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className="serif text-white text-xl"
                      style={{ fontWeight: 500 }}
                    >
                      {formatPrice(
                        effectivePriceCents(product, item.config),
                        product.currency
                      )}
                      {product.priceSuffix}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex items-center gap-1 text-[11px] uppercase text-gray-2 hover:text-negative"
                      style={{ letterSpacing: "0.18em" }}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="glass h-fit p-7">
          <h2
            className="serif text-white text-xl mb-5"
            style={{ fontWeight: 500 }}
          >
            Order summary
          </h2>
          <div className="flex justify-between items-baseline text-sm pb-4 border-b border-white/10">
            <span className="text-gray-2">Subtotal</span>
            <span
              className="serif text-white text-xl"
              style={{ fontWeight: 500 }}
            >
              {formatPrice(subtotalCents)}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-gray-2">
            VAT calculated at checkout based on billing country.
          </p>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={busy}
            className="btn-gold mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Starting checkout…" : "Proceed to checkout"}
          </button>
          <Link href="/pricing" className="btn-ghost-light mt-3 w-full">
            Continue browsing
          </Link>
        </div>
      </div>
    </section>
  );
}
