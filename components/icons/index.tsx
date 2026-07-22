import type { SVGProps } from "react";
import {
  PROFILE_ICON_LABELS,
  PROFILE_ICON_PATHS,
  SYSTEM_ICON_LABELS,
  SYSTEM_ICON_PATHS,
} from "./paths";
import {
  PROFILE_CATEGORY,
  PROFILE_CATEGORY_OF,
  type ProfileCategory,
} from "@/lib/design-tokens";

export {
  SYSTEM_ICON_LABELS,
  PROFILE_ICON_LABELS,
  SYSTEM_ICON_PATHS,
  PROFILE_ICON_PATHS,
} from "./paths";

export type SystemIconName = keyof typeof SYSTEM_ICON_PATHS;
export type ProfileIconName = keyof typeof PROFILE_ICON_PATHS;
export type IconName = SystemIconName | ProfileIconName;

export const SYSTEM_ICON_NAMES = Object.keys(SYSTEM_ICON_PATHS) as SystemIconName[];
export const PROFILE_ICON_NAMES = Object.keys(PROFILE_ICON_PATHS) as ProfileIconName[];

const ALL_PATHS = { ...SYSTEM_ICON_PATHS, ...PROFILE_ICON_PATHS };

export function isProfileIcon(name: IconName): name is ProfileIconName {
  return name in PROFILE_ICON_PATHS;
}

type IconProps = Omit<SVGProps<SVGSVGElement>, "color" | "name"> & {
  name: IconName;
  /** Rendered edge length in px. The grid is 24; anything else scales it. */
  size?: number;
  /** Any CSS colour. Defaults to `currentColor`, which is usually what you want. */
  color?: string;
  strokeWidth?: number;
  /**
   * Accessible name. Omit for decorative icons: without it the glyph is
   * hidden from assistive tech, which is correct when the adjacent text
   * already says what it means.
   */
  title?: string;
};

/**
 * One glyph from the proprietary set.
 *
 * The stroke is 1.8px on a 24px grid and does not scale with `size`, matching
 * the brand book: the set is drawn to read at 20 to 24px, and a hairline that
 * thinned as the icon grew would break the family's weight.
 */
export function Icon({
  name,
  size = 24,
  color = "currentColor",
  strokeWidth = 1.8,
  title,
  ...rest
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {ALL_PATHS[name]}
    </svg>
  );
}

type IconTileProps = {
  name: IconName;
  /**
   * Category tint. For a trade profile it is inferred from the profile, so
   * you only pass this to tint a system icon.
   */
  category?: ProfileCategory;
  /** Tile edge in px. The glyph sits at roughly 55% of it. */
  size?: number;
  className?: string;
  title?: string;
};

/**
 * The glyph on its tint tile: the category colour at about 14% alpha behind
 * the same colour at full strength. This is how the board says what someone
 * is before you have read a word of the card.
 */
export function IconTile({
  name,
  category,
  size = 38,
  className,
  title,
}: IconTileProps) {
  const resolved: ProfileCategory =
    category ??
    (isProfileIcon(name) ? PROFILE_CATEGORY_OF[name] : "principals");
  const { fg, tint } = PROFILE_CATEGORY[resolved];

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.29),
        background: tint,
        color: fg,
      }}
    >
      <Icon name={name} size={Math.round(size * 0.55)} title={title} />
    </span>
  );
}
