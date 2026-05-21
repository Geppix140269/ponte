function ArchMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M 22 98 L 22 60 C 22 35 98 35 98 60 L 98 98"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinejoin="miter"
      />
      <line
        x1="14"
        y1="98"
        x2="106"
        y2="98"
        stroke="currentColor"
        strokeWidth={3}
      />
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
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ArchMark
        className={`h-6 w-6 ${reversed ? "text-gold" : "text-navy"}`}
      />
      <span
        className={`font-serif text-2xl tracking-[0.12em] ${
          reversed ? "text-white" : "text-navy"
        }`}
      >
        Ponte
      </span>
    </span>
  );
}
