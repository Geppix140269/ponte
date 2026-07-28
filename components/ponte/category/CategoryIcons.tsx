import type { ReactNode } from "react";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { TRADE_SERVICE_CATEGORIES } from "@/lib/taxonomy/services";
import {
  DISTRIBUTION_PARTNER_TYPES,
  DISTRIBUTION_RELATIONSHIP_TERMS,
} from "@/lib/taxonomy/distribution";
import { PRODUCT_SECTORS } from "@/lib/taxonomy/market";

/**
 * Every category icon, rendered once on the server, keyed by taxonomy key.
 *
 * The category pickers are client components: they hold the member's selection
 * and respond to a tap. `PonteIcon` is deliberately a server component, so that
 * the generated markup for all 89 registry assets is rendered to HTML and never
 * shipped to the browser. Importing it into a client picker would quietly undo
 * that, and duplicating a handful of drawings into a second client-safe module
 * would give Ponte two icon renderers, which Constitution section 20 forbids.
 *
 * So the icons are rendered here, on the server, and passed down as nodes. One
 * renderer, one registry, and nothing about the icon law bends to accommodate a
 * stateful picker.
 *
 * A key with no registry asset simply has no entry. The picker reserves the
 * space either way, so a grid where only some options are drawn still aligns.
 */
export type CategoryIconMap = Readonly<Record<string, ReactNode>>;

const ICON_SIZE = 20;

export function categoryIcons(): CategoryIconMap {
  const out: Record<string, ReactNode> = {};

  for (const category of TRADE_SERVICE_CATEGORIES) {
    if (category.icon) out[category.key] = <PonteIcon name={category.icon} size={ICON_SIZE} />;
  }
  for (const type of DISTRIBUTION_PARTNER_TYPES) {
    if (type.icon) out[type.key] = <PonteIcon name={type.icon} size={ICON_SIZE} />;
  }
  for (const term of DISTRIBUTION_RELATIONSHIP_TERMS) {
    // Relationship terms and partner types are separate dimensions with their
    // own key spaces, and both contain `other`. Namespacing the relationship
    // keys here keeps one map usable for both without a collision deciding
    // which drawing wins.
    if (term.icon) out[`relationship:${term.key}`] = <PonteIcon name={term.icon} size={ICON_SIZE} />;
  }
  for (const sector of PRODUCT_SECTORS) {
    out[`sector:${sector.key}`] = <PonteIcon name={sector.icon} size={ICON_SIZE} />;
  }

  return out;
}
