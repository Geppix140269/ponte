import { assetFor, byKey, strokeFor } from "../registry/ponte-flow-registry";
import { FLOW_ICON_MARKUP } from "../generated/flow-icon-markup";
import type { FlowIconKey, FlowLabelledKey } from "../generated/flow-icon-keys";

/**
 * The one way to render a Ponte Flow icon.
 *
 * Route components pass a semantic key and nothing else. They cannot pass an
 * SVG filename, cannot paste markup, and cannot invent a state: the key union
 * is generated from the delivered registry, so a name that is not a registered
 * key is a compile error rather than a silent blank.
 *
 * Three rules from the handoff are enforced here rather than left to review:
 *
 *   1. **Colour is inherited.** The root sets `stroke="currentColor"` and no
 *      asset carries a colour of its own. An icon is therefore ink by default
 *      and takes colour only from the interface state around it.
 *   2. **Stroke is optical, not proportional.** `strokeFor(size)` sets the root
 *      stroke width per rendered size (1.5 at 16, 1.75 at 24, 2.5 at 48), so
 *      scaling never thins the line.
 *   3. **The reduced drawing is used below its threshold.** `assetFor(key,
 *      size)` picks the authored reduced asset under 21px where one exists,
 *      rather than shrinking a drawing that was not made for that size.
 *
 * Accessibility is typed, not documented. Nine of the 89 keys carry their
 * meaning alone; for those `label` is required, and for every other key it is
 * forbidden, because an icon beside a visible word must not repeat it to a
 * screen reader. That is the accessibility document expressed as a type.
 *
 * This is a server component. The generated markup module is therefore rendered
 * to HTML on the server and never enters the client bundle.
 */

interface BaseProps {
  /** Rendered size in px. Defaults to the registry's own default for the key. */
  size?: number;
  /** Extra class on the host, e.g. `pf-icon--muted`. Never on the SVG. */
  className?: string;
}

export type PonteIconProps = BaseProps &
  (
    | {
        name: Exclude<FlowIconKey, FlowLabelledKey>;
        /**
         * Forbidden here: this icon always sits beside a visible label, so a
         * second name would be read twice. It renders aria-hidden.
         */
        label?: never;
      }
    | {
        name: FlowLabelledKey;
        /** Required: this icon is the only carrier of its meaning. */
        label: string;
      }
  );

export default function PonteIcon({ name, size, className, label }: PonteIconProps) {
  const icon = byKey[name];
  if (!icon) {
    // Unreachable through the type, but a generated union and a hand-edited
    // registry can drift. Fail loudly in development rather than render a hole.
    throw new Error(`Unknown Ponte Flow icon: ${name}`);
  }

  const rendered = size ?? icon.defaultSize;
  const path = assetFor(name, rendered);
  const markup = FLOW_ICON_MARKUP[path];
  if (!markup) throw new Error(`No markup generated for ${path}. Run scripts/build-flow-icons.mjs.`);

  const host = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      className={className ? `pf-icon ${className}` : "pf-icon"}
      style={{ width: rendered, height: rendered }}
      {...host}
    >
      <svg
        viewBox="0 0 24 24"
        width={rendered}
        height={rendered}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeFor(rendered)}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        // The markup is generated at build time from the vendored assets by
        // scripts/build-flow-icons.mjs, which rejects any asset carrying a
        // title, a hardcoded colour, a clip-path, a mask or a raster image.
        // Nothing user-supplied can reach this.
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </span>
  );
}

/**
 * The prohibited-use rule for a key, as written in the registry.
 *
 * The registry records rules a type cannot express, such as "navigation only,
 * must not appear inside an HS sector grid". They are surfaced here so a
 * reviewer can read the constraint next to the usage, and so a test can assert
 * that a screen has not broken one.
 */
export function prohibitedUseFor(name: FlowIconKey): string | null {
  return byKey[name]?.prohibitedUse ?? null;
}
