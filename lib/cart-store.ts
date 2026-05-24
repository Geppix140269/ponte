"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemConfig } from "./types";
import { getProductBySku } from "./catalogue";
import { effectivePriceCents } from "./format";

interface CartState {
  items: CartItem[];
  addItem: (sku: string, config?: CartItemConfig) => void;
  removeItem: (index: number) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (sku, config = {}) =>
        set((state) => ({ items: [...state.items, { sku, config }] })),
      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
      subtotalCents: () =>
        get().items.reduce((sum, item) => {
          const product = getProductBySku(item.sku);
          return sum + (product ? effectivePriceCents(product, item.config) : 0);
        }, 0),
    }),
    { name: "ponte-trade-cart" },
  ),
);
