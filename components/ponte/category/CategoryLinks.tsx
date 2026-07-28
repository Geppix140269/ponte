import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { Link } from "@/i18n/navigation";
import type { TaxonomyIcon } from "@/lib/taxonomy/market";

/**
 * The same category grid, as navigation rather than selection.
 *
 * Find and Explore are not building a record; they are moving through the
 * market. The right control there is a link: it works without JavaScript, it
 * can be opened in a new tab, it is shareable, and it is what makes a category
 * URL like `/find?family=services&serviceCategory=freight` a real place. The
 * composer's `CategoryPicker` is the selection control for the same taxonomy.
 *
 * Both draw from `lib/taxonomy/`, and both use `category.css`, so a category
 * looks and reads identically whether a member is choosing one or walking
 * through one. Two controls, one vocabulary, one appearance.
 */

export interface CategoryLink {
  key: string;
  label: string;
  description?: string;
  icon?: TaxonomyIcon | null;
  href: string;
  isOther?: boolean;
  /** Marks the option the current URL is on. */
  current?: boolean;
}

export default function CategoryLinks({
  items,
  legend,
  hint,
  dense = false,
  currentLabel = "Selected",
}: {
  items: readonly CategoryLink[];
  legend: string;
  hint?: string;
  dense?: boolean;
  currentLabel?: string;
}) {
  return (
    <nav className="pcat" aria-label={legend}>
      <div className="pcat__head">
        <p className="pcat__legend">{legend}</p>
        {hint && <p className="pcat__hint">{hint}</p>}
      </div>
      <div className={`pcat__grid${dense ? " pcat__grid--dense" : ""}`}>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            data-option={item.key}
            className={`pcat__opt${item.isOther ? " pcat__opt--other" : ""}`}
            // `aria-current` rather than `aria-checked`: this is a set of
            // destinations, one of which is where the member already is, not a
            // set of answers one of which is chosen.
            aria-current={item.current ? "page" : undefined}
            data-current={item.current ? "true" : undefined}
          >
            <span className="pcat__mark" aria-hidden="true" />
            <span className="pcat__ico" aria-hidden="true">
              {item.icon ? <PonteIcon name={item.icon} size={20} /> : null}
            </span>
            <span className="pcat__body">
              <span className="pcat__t">{item.label}</span>
              {item.description && <span className="pcat__d">{item.description}</span>}
            </span>
            {item.current && (
              <span className="pcat__on" aria-hidden="true">
                {currentLabel}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
