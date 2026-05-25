/**
 * Ponte Brand v2 — the mark.
 *
 *   The arch — Italian heritage, classical structure, distilled.
 *   A single gold node at the apex: the trade record, the data point,
 *   the moment of intelligence. The bridge has a payload.
 *
 * This is the single source of truth for the Ponte mark across the
 * platform. Do not draw an arch SVG anywhere else — import this.
 */

type BridgeMarkProps = {
  className?: string;
  stroke?: string;
  node?: string;
  showBaseline?: boolean;
};

export function BridgeMark({
  className,
  stroke = "#FFFFFF",
  node = "#C9973A",
  showBaseline = true,
}: BridgeMarkProps) {
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
        <line x1="14" y1="98" x2="106" y2="98" stroke={stroke} strokeWidth="3" />
      )}
      <circle cx="60" cy="42" r="7" fill={node} />
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

  return (
    <span className={`inline-flex items-center gap-[10px] ${className}`}>
      <BridgeMark className={dims} stroke={stroke} node="#C9973A" />
      <span
        className={`serif font-medium tracking-[3px] ${text} ${wordColor}`}
        style={{ letterSpacing: "3px" }}
      >
        Ponte
      </span>
    </span>
  );
}
