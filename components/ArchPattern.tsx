export default function ArchPattern({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="ponte-arches"
          x="0"
          y="0"
          width="240"
          height="240"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 200 L 40 130 C 40 80 200 80 200 130 L 200 200"
            fill="none"
            stroke="#F5F0E8"
            strokeWidth={2}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ponte-arches)" />
    </svg>
  );
}
