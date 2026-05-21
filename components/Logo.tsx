function BridgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* deck */}
      <line x1="3" y1="22" x2="29" y2="22" stroke="currentColor" strokeWidth="2" />
      {/* towers */}
      <line x1="9" y1="22" x2="9" y2="9" stroke="currentColor" strokeWidth="2" />
      <line x1="23" y1="22" x2="23" y2="9" stroke="currentColor" strokeWidth="2" />
      {/* suspension cable */}
      <path
        d="M3 14 C 9 9, 23 9, 29 14"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* hangers */}
      <line x1="16" y1="12.4" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function Logo({
  reversed = false,
  className = "",
}: {
  reversed?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BridgeMark className={`h-7 w-7 ${reversed ? "text-gold" : "text-gold"}`} />
      <span
        className={`text-lg font-extrabold tracking-tight ${
          reversed ? "text-white" : "text-navy"
        }`}
      >
        Ponte&nbsp;Trade
      </span>
    </span>
  );
}
