/**
 * Ponte Brand v3: the mark.
 *
 * Three anatomies of one mark:
 *
 *   1. <BridgeMark />          is the full mark (arch + node + baseline)
 *                                for ≥48 px contexts
 *   2. <BridgeMark compact />  is a filled silhouette + node only,
 *                                for ≤32 px contexts (favicons, tight UI)
 *   3. <BridgeMark animate />  adds Span Traversal motion, fires on real
 *                                data events (report ready, sync,
 *                                download complete). Respects
 *                                prefers-reduced-motion.
 *
 * Anything that draws the bridge anywhere else in the app must import
 * this. The path data is the brand IP.
 */

type BridgeMarkProps = {
  className?: string;
  stroke?: string;
  node?: string;
  showBaseline?: boolean;
  /**
   * If true, renders the v3 compact silhouette variant. Use at sizes ≤32 px
   * where the stroked outline disappears. Auto-selects when size="sm".
   */
  compact?: boolean;
  /**
   * If true, renders the canonical Span Traversal motion. Use only on real
   * data-arrival moments (report delivered, counter tick, download ready).
   * Never on hover, page load, or scroll. Automatically pauses when the
   * user has prefers-reduced-motion enabled.
   */
  animate?: boolean;
};

export function BridgeMark({
  className,
  stroke = "#FFFFFF",
  node = "#C9973A",
  showBaseline = true,
  compact = false,
  animate = false,
}: BridgeMarkProps) {
  // Compact variant: filled silhouette on a 32-unit grid.
  // Baseline is implied by the flat bottom of the solid mass.
  // No motion variant: compact never animates.
  if (compact) {
    return (
      <svg
        viewBox="0 0 32 32"
        className={className}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 4 28 L 4 16 C 4 8 28 8 28 16 L 28 28 L 23 28 L 23 18 C 23 12 9 12 9 18 L 9 28 Z"
          fill={stroke}
          fillRule="evenodd"
        />
        <circle cx="16" cy="11" r="3" fill={node} />
      </svg>
    );
  }

  // Animated variant: Span Traversal, where light travels left pillar to apex
  // and the node fires on arrival. CSS lives in globals.css under
  // .mark-anim. The dim "arch-base" path stays visible at low opacity,
  // the "arch-active" path fills via stroke-dashoffset, the traveller
  // dot rides the offset-path, and the apex ring pulses once per cycle.
  if (animate) {
    const archPath =
      "M 22 98 L 22 60 C 22 35 98 35 98 60 L 98 98";
    return (
      <svg
        viewBox="0 0 120 120"
        className={`${className ?? ""} mark-anim`.trim()}
        fill="none"
        aria-hidden="true"
      >
        <path
          d={archPath}
          className="arch-base"
          strokeWidth="9"
          strokeLinejoin="miter"
        />
        {showBaseline && (
          <line
            x1="14"
            y1="98"
            x2="106"
            y2="98"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="3"
          />
        )}
        <path
          d={archPath}
          className="arch-active"
          strokeWidth="9"
          strokeLinejoin="miter"
        />
        <circle
          cx="60"
          cy="42"
          r="6.5"
          className="apex-pulse"
          fill="none"
          stroke={node}
          strokeWidth="2"
        />
        <circle
          r="3.5"
          className="traveller"
          style={{
            offsetPath: `path('${archPath}')`,
          }}
        />
        <circle cx="60" cy="42" r="6.5" fill={node} />
      </svg>
    );
  }

  // Standard mark: full anatomy (arch + baseline + node).
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M 22 98 L 22 60 C 22 35 98 35 98 60 L 98 98"
        stroke={stroke}
        strokeWidth="9"
        strokeLinejoin="miter"
      />
      {showBaseline && (
        <line
          x1="14"
          y1="98"
          x2="106"
          y2="98"
          stroke={stroke}
          strokeWidth="3"
        />
      )}
      <circle cx="60" cy="42" r="6.5" fill={node} />
    </svg>
  );
}

export default function Logo({
  reversed = false,
  className = "",
  size = "md",
}: {
  reversed?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const text =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  const stroke = reversed ? "#FFFFFF" : "#0D1B2A";
  const wordColor = reversed ? "text-white" : "text-navy";

  // Auto-select compact variant for sm to keep the silhouette crisp.
  const useCompact = size === "sm";

  return (
    <span className={`inline-flex items-center gap-[10px] ${className}`}>
      <BridgeMark
        className={dims}
        stroke={stroke}
        node="#C9973A"
        compact={useCompact}
      />
      <span
        className={`serif font-medium tracking-[3px] ${text} ${wordColor}`}
        style={{ letterSpacing: "3px" }}
      >
        Ponte
      </span>
    </span>
  );
}
