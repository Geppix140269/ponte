"use client";

import type { ReactNode } from "react";
import CategoryPicker from "./CategoryPicker";
import BridgeRoute from "@/components/ponte/bridge/BridgeRoute";
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

/*
 * `DistributionCoveragePicker` used to sit here, binding the shared list
 * control to the seven coverage scopes. It is gone rather than kept beside its
 * replacement: leaving a boxed selector for the same question in the same
 * module is how a Bridge ends up followed by an unrelated list again.
 */

/**
 * Coverage, as a crossing rather than a list.
 *
 * Issue #130 Stage 2. Territory scope is a single categorical choice over seven
 * canonical options, which is inside the geometry the Bridge engine is built
 * for, so this question is asked with the Bridge: horizontal and staged on a
 * desktop, the approved vertical elevation below 460px, the full node and label
 * one click target, and the travelled segment showing where the member has got
 * to. Every other coverage-adjacent list in the journey is longer than the deck
 * can carry and stays an unboxed row list.
 *
 * The props are deliberately the picker's props: `value` and `onChange`, one
 * key in and one key out. The caller cannot tell which control it got, so the
 * composer's data flow, its discard confirmation and its territory field are
 * untouched. The station carries no marker: a coverage scope has no icon in the
 * canonical taxonomy, and ADR-0019 says a station with no sensible registry key
 * renders without one rather than borrowing a substitute.
 *
 * Descriptions are not passed. The seven labels are complete sentences of their
 * own ("Several countries", "Online only"), and a mono description column at
 * the width seven stations leave would wrap to eight lines.
 */
export function DistributionCoverageBridge({
  value,
  onChange,
  legend,
  hint,
  selectedLabel,
  children,
}: Shared & { value: string | null; onChange: (key: string) => void }) {
  return (
    <div className="pcat">
      <div className="pcat__head">
        <p className="pcat__legend">{legend}</p>
        {hint && <p className="pcat__hint">{hint}</p>}
      </div>
      {/* The elevation at every width. Seven scopes across the composer column
          leave under 100px a station, and the captured evidence showed
          "Worldwide" running into "Online only" and the last two labels
          overlapping. The elevation stacks them, so every scope stays legible
          and the crossing still reads as one bridge. */}
      <BridgeRoute
        mode="select"
        ariaLabel={legend}
        selected={value}
        onSelect={onChange}
        alwaysVertical
        stations={DISTRIBUTION_COVERAGE_SCOPES.map((scope) => ({
          key: scope.key,
          title: scope.label,
          mark: selectedLabel,
        }))}
      />
      {children}
    </div>
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
