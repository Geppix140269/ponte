"use client";

import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { getProductBySku } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { countryName } from "@/lib/countries";
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

  if (items.length === 0) {
    return (
      <section className="bg-white py-24">
        <div className="container-px flex flex-col items-center text-center">
          <ShoppingCart className="h-10 w-10 text-navy/30" />
          <h1 className="mt-5 text-2xl font-extrabold">Your cart is empty</h1>
          <p className="mt-2 text-navy/60">
            Browse the catalogue and add the intelligence you need.
          </p>
          <Link href="/catalogue" className="btn-gold mt-7">
            Browse the Catalogue
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container-px">
        <h1 className="text-3xl font-extrabold">Your cart</h1>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item, index) => {
              const product = getProductBySku(item.sku);
              if (!product) return null;
              const config = describeConfig(item.sku, item.config);
              return (
                <li key={index} className="flex items-start justify-between gap-4 py-5">
                  <div>
                    <p className="font-bold text-navy">{product.title}</p>
                    <p className="text-xs text-navy/50">{product.sku}</p>
                    {config.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-navy/60">
                        {config.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-navy">
                      {formatPrice(product.priceCents, product.currency)}
                      {product.priceSuffix}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex items-center gap-1 text-xs text-navy/50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="h-fit rounded-xl border border-line bg-mist p-6">
            <h2 className="text-lg font-bold">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-navy/60">Subtotal</span>
              <span className="font-semibold text-navy">{formatPrice(subtotalCents)}</span>
            </div>
            <p className="mt-1 text-xs text-navy/50">
              VAT calculated at checkout based on billing country.
            </p>
            <Link href="/checkout" className="btn-gold mt-6 w-full">
              Proceed to checkout
            </Link>
            <Link href="/catalogue" className="btn-outline mt-3 w-full">
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
