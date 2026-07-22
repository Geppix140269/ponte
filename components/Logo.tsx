/**
 * Ponte: the mark.
 *
 * A suspension bridge. The lime pier is one party, the cyan pier the other,
 * and the span runs lime through violet to cyan: the two sides bridged. The
 * lime pier always leads, which on an LTR page means it sits left.
 *
 * Construction and geometry are transcribed from
 * design_handoff_ponte/Ponte Logo.dc.html and Brand Book.dc.html, on the
 * bundle's 76x50 grid.
 *
 * Usage rules, from the brand book, enforced by the shape of this API:
 *   - Never recolour the piers. That is why there is no pier colour prop:
 *     pick a `variant` instead.
 *   - Never rotate or stretch the mark.
 *   - Never put the gradient mark on a busy photo. Use variant="mono".
 *   - Clear space equals one pier diameter.
 */

type Variant = "gradient" | "mono" | "on-light";

/**
 * One shared gradient id, and every instance carries its own identical
 * `<defs>`. Two instances therefore declare the same id, which is what lets
 * any one of them be unmounted without breaking the others' `url(#...)`
 * reference. A per-instance id would need `useId`, and that would make the
 * mark a client component for no gain.
 */
const ARC_GRADIENT_ID = "ponte-bridge-arc";

const SPAN = "M10 40 C 28 6, 48 6, 66 40";

type BridgeMarkProps = {
  className?: string;
  variant?: Variant;
  /** The deck line under the span. Dropped at favicon sizes. */
  showDeck?: boolean;
  /** The three suspenders. Dropped below roughly 32px, where they blur out. */
  showSuspenders?: boolean;
  /**
   * Draws the span on mount, 1500ms. Reserve it for real arrival moments
   * (a report lands, a verification completes), never hover or scroll.
   * Switched off under prefers-reduced-motion by the rule in globals.css.
   */
  animate?: boolean;
  title?: string;
};

export function BridgeMark({
  className,
  variant = "gradient",
  showDeck = true,
  showSuspenders = true,
  animate = false,
  title,
}: BridgeMarkProps) {
  const mono = variant !== "gradient";
  const onLight = variant === "on-light";

  const spanStroke = onLight
    ? "#0A0C11"
    : mono
      ? "#FFFFFF"
      : `url(#${ARC_GRADIENT_ID})`;
  const pierLeft = onLight ? "#0A0C11" : mono ? "#FFFFFF" : "#CBFB5E";
  const pierRight = onLight ? "#0A0C11" : mono ? "#FFFFFF" : "#3FE0C5";
  const deck = onLight ? "rgba(10,12,17,.25)" : "rgba(255,255,255,.28)";
  const suspender = onLight ? "rgba(10,12,17,.2)" : "rgba(255,255,255,.18)";

  return (
    <svg
      viewBox="0 0 76 50"
      className={className}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {!mono && (
        <defs>
          <linearGradient id={ARC_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#CBFB5E" />
            <stop offset="0.5" stopColor="#8B6BFF" />
            <stop offset="1" stopColor="#3FE0C5" />
          </linearGradient>
        </defs>
      )}

      {showDeck && (
        <path d="M8 42 H68" stroke={deck} strokeWidth="2" strokeLinecap="round" />
      )}
      {showSuspenders && (
        <path
          d="M22 21 V42 M38 15 V42 M54 21 V42"
          stroke={suspender}
          strokeWidth="1.4"
        />
      )}
      <path
        d={SPAN}
        stroke={spanStroke}
        strokeWidth="3.6"
        strokeLinecap="round"
        className={animate ? "route-draw" : undefined}
        style={animate ? { ["--len" as string]: 72 } : undefined}
      />
      <circle cx="10" cy="40" r="5" fill={pierLeft} />
      <circle cx="66" cy="40" r="5" fill={pierRight} />
    </svg>
  );
}

/**
 * The app icon: the mark on a rounded-squircle tile with a violet bloom in
 * the corner. One centre suspender only, because three do not survive at
 * 60px.
 */
export function AppIcon({ size = 88, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: "linear-gradient(150deg,#20242F,#0A0C11)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.09)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -size * 0.23,
          right: -size * 0.18,
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(139,107,255,.6),transparent 70%)",
        }}
      />
      <svg
        viewBox="0 0 76 50"
        width={size * 0.66}
        fill="none"
        aria-hidden="true"
        style={{ position: "relative" }}
      >
        <defs>
          <linearGradient id={ARC_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#CBFB5E" />
            <stop offset="0.5" stopColor="#8B6BFF" />
            <stop offset="1" stopColor="#3FE0C5" />
          </linearGradient>
        </defs>
        <path d="M38 15 V41" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
        <path
          d={SPAN}
          stroke={`url(#${ARC_GRADIENT_ID})`}
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <circle cx="10" cy="40" r="5.6" fill="#CBFB5E" />
        <circle cx="66" cy="40" r="5.6" fill="#3FE0C5" />
      </svg>
    </span>
  );
}

/**
 * The wordmark. Lowercase, Space Grotesk 700, tight tracking, and a lime
 * full stop. The stop is the only coloured glyph and it is not optional:
 * it is what makes the word a mark.
 */
export function Wordmark({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`display ${className}`} style={{ fontWeight: 700, ...style }}>
      ponte<span style={{ color: "#CBFB5E" }}>.</span>
    </span>
  );
}

/**
 * The horizontal lockup: mark plus wordmark, with one pier diameter of clear
 * space between them.
 *
 * `reversed` is kept from the v2 API because the header and footer pass it.
 * On an obsidian canvas everything is reversed, so it now only decides
 * whether the wordmark is ink or obsidian.
 */
export default function Logo({
  reversed = false,
  className = "",
  size = "md",
}: {
  reversed?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const markH = size === "sm" ? "h-5" : size === "lg" ? "h-8" : "h-6";
  const text = size === "sm" ? "text-lg" : size === "lg" ? "text-[28px]" : "text-[22px]";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BridgeMark
        className={`${markH} w-auto`}
        variant={reversed ? "gradient" : "on-light"}
        // Suspenders disappear into the deck line at header scale.
        showSuspenders={size === "lg"}
        title="Ponte"
      />
      <Wordmark
        className={text}
        style={{
          color: reversed ? "#EEF1F5" : "#0A0C11",
          letterSpacing: "-0.045em",
          lineHeight: 1,
        }}
      />
    </span>
  );
}
