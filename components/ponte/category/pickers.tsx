"use client";

import type { ReactNode } from "react";
import CategoryPicker from "./CategoryPicker";
import type { CategoryIconMap } from "./CategoryIcons";
import { TRADE_SERVICE_CATEGORIES, subcategoriesFor, serviceCategory } from "@/lib/taxonomy/services";
import {
  DISTRIBUTION_PARTNER_TYPES,
  DISTRIBUTION_RELATIONSHIP_TERMS,
  DISTRIBUTION_COVERAGE_SCOPES,
} from "@/lib/taxonomy/distribution";
import { PRODUCT_SECTORS } from "@/lib/taxonomy/market";

/**
 * The named family pickers.
 *
 * Each is a thin binding of the shared control to one canonical list, and that
 * thinness is the point. A surface that wants to ask "which trade service?"
 * imports `TradeServiceCategoryPicker` and gets the eleven canonical options in
 * canonical order with Other last. It cannot pass its own array, so Find,
 * Explore, the composer, account editing and anything built later cannot each
 * keep a private copy of the taxonomy and drift apart.
 *
 * The subcategory picker takes a category and derives its own options from it.
 * A caller cannot hand it a list that does not belong to that category, which
 * is the same rule the storage layer enforces, stated once more where the
 * member can still see it.
 */

interface Shared {
  icons?: CategoryIconMap;
  legend: string;
  hint?: string;
  selectedLabel?: string;
  emptyLabel?: string;
  children?: ReactNode;
}

export function TradeServiceCategoryPicker({
  value,
  onChange,
  ...rest
}: Shared & { value: string | null; onChange: (key: string) => void }) {
  return (
    <CategoryPicker mode="single" options={TRADE_SERVICE_CATEGORIES} value={value} onChange={onChange} {...rest} />
  );
}

export function TradeServiceSubcategoryPicker({
  category,
  value,
  onChange,
  searchLabel,
  searchPlaceholder,
  ...rest
}: Shared & {
  category: string | null;
  value: readonly string[];
  onChange: (keys: string[]) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  const options = category ? subcategoriesFor(category) : [];
  return (
    <CategoryPicker
      mode="multiple"
      options={options}
      value={value}
      onChange={onChange}
      dense
      // These lists run to fourteen entries. The requirement asks for a small
      // find-within-the-options control once a list becomes long, so it is on
      // wherever the list is long enough to need scrolling to read.
      searchable={options.length > 8}
      searchLabel={searchLabel}
      searchPlaceholder={searchPlaceholder}
      {...rest}
    />
  );
}

export function DistributionPartnerTypePicker({
  value,
  onChange,
  ...rest
}: Shared & { value: string | null; onChange: (key: string) => void }) {
  return (
    <CategoryPicker mode="single" options={DISTRIBUTION_PARTNER_TYPES} value={value} onChange={onChange} {...rest} />
  );
}

export function DistributionRelationshipPicker({
  value,
  onChange,
  ...rest
}: Shared & { value: readonly string[]; onChange: (keys: string[]) => void }) {
  // Namespaced so the relationship `other` and the partner-type `other` cannot
  // collide in the shared icon map.
  const options = DISTRIBUTION_RELATIONSHIP_TERMS.map((term) => ({
    ...term,
    iconKey: `relationship:${term.key}`,
  }));
  return <CategoryPicker mode="multiple" options={options} value={value} onChange={onChange} dense {...rest} />;
}

export function DistributionCoveragePicker({
  value,
  onChange,
  ...rest
}: Shared & { value: string | null; onChange: (key: string) => void }) {
  return (
    <CategoryPicker mode="single" options={DISTRIBUTION_COVERAGE_SCOPES} value={value} onChange={onChange} dense {...rest} />
  );
}

/**
 * Product sectors, shared by the product journey and by the two distribution
 * intents that attach to what is being distributed.
 *
 * The HS range is deliberately not printed on the tile. A member choosing what
 * they want to represent is choosing a market, not a classification, and the
 * range would put a taxonomy vocabulary in front of somebody who has not asked
 * for one. The range is still on the sector, and the product journey still
 * uses it where a classification is genuinely being made.
 */
export function ProductSectorPicker({
  value,
  onChange,
  ...rest
}: Shared & { value: string | null; onChange: (key: string) => void }) {
  const options = PRODUCT_SECTORS.map((sector) => ({
    key: sector.key,
    label: sector.label,
    iconKey: `sector:${sector.key}`,
  }));
  return <CategoryPicker mode="single" options={options} value={value} onChange={onChange} {...rest} />;
}

/** The label of a chosen service category, for the trail and the headings. */
export function serviceCategoryLabel(key: string | null): string | null {
  return serviceCategory(key)?.label ?? null;
}
