/**
 * TradeFlow — animated SVG banner that suggests cross-border movement of
 * goods between major trade hubs. Server component, no JS. Uses SVG
 * <animateMotion> so it runs without a client bundle. Respects
 * prefers-reduced-motion via the CSS class wrappers.
 */
export default function TradeFlow() {
  // Each route: { id, origin, destination, path, duration, delay }
  // Paths are Bézier curves drawn on a 1200×260 viewbox.
  const routes = [
    {
      id: "r1",
      origin: { x: 80, y: 170, label: "SHANGHAI" },
      dest:   { x: 540, y: 70, label: "ROTTERDAM" },
      path: "M 80 170 Q 280 -10 540 70",
      dur: "5.6s",
      begin: "0s",
    },
    {
      id: "r2",
      origin: { x: 180, y: 200, label: "MUMBAI" },
      dest:   { x: 720, y: 130, label: "FELIXSTOWE" },
      path: "M 180 200 Q 440 30 720 130",
      dur: "6.4s",
      begin: "1.1s",
    },
    {
      id: "r3",
      origin: { x: 360, y: 220, label: "JEBEL ALI" },
      dest:   { x: 1100, y: 100, label: "NEW YORK" },
      path: "M 360 220 Q 720 -20 1100 100",
      dur: "7.2s",
      begin: "0.5s",
    },
    {
      id: "r4",
      origin: { x: 920, y: 200, label: "SANTOS" },
      dest:   { x: 470, y: 120, label: "HAMBURG" },
      path: "M 920 200 Q 680 30 470 120",
      dur: "6.0s",
      begin: "2.3s",
    },
    {
      id: "r5",
      origin: { x: 1040, y: 220, label: "LOS ANGELES" },
      dest:   { x: 760, y: 90,  label: "ANTWERP" },
      path: "M 1040 220 Q 880 40 760 90",
      dur: "5.2s",
      begin: "1.8s",
    },
  ];

  // Unique endpoints for the labels + city dots
  const hubs = Array.from(
    new Map(
      routes.flatMap((r) => [
        [r.origin.label, r.origin],
        [r.dest.label, r.dest],
      ])
    ).values()
  );

  return (
    <section className="container-px py-8 md:py-12 select-none">
      <div className="glass-tight p-6 md:p-8 relative overflow-hidden">
        <svg
          viewBox="0 0 1200 260"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-[180px] md:h-[220px]"
          role="img"
          aria-label="Animated visualisation of cross-border trade flows between major shipping hubs"
        >
          <defs>
            {/* Soft glow filter for the moving dots */}
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dashed-line style for the route paths */}
            <style>{`
              .route-line {
                fill: none;
                stroke: rgba(201, 151, 58, 0.28);
                stroke-width: 1;
                stroke-dasharray: 3 5;
              }
              .hub-dot {
                fill: var(--gold);
                opacity: 0.85;
              }
              .hub-label {
                fill: rgba(232, 222, 200, 0.7);
                font-family: var(--font-jetbrains, monospace);
                font-size: 10px;
                letter-spacing: 0.18em;
                text-transform: uppercase;
              }
              .ship-dot {
                fill: var(--gold);
              }
              @media (prefers-reduced-motion: reduce) {
                .ship-dot { opacity: 0.6; }
              }
            `}</style>
          </defs>

          {/* Route paths */}
          {routes.map((r) => (
            <path key={`p-${r.id}`} className="route-line" d={r.path} />
          ))}

          {/* Hub dots and labels */}
          {hubs.map((h) => (
            <g key={`h-${h.label}`}>
              <circle cx={h.x} cy={h.y} r="3.5" className="hub-dot" />
              <circle
                cx={h.x}
                cy={h.y}
                r="7"
                fill="none"
                stroke="var(--gold)"
                strokeOpacity="0.4"
                strokeWidth="0.8"
              />
              <text
                x={h.x}
                y={h.y + 22}
                textAnchor={h.x > 800 ? "end" : h.x < 250 ? "start" : "middle"}
                className="hub-label"
              >
                {h.label}
              </text>
            </g>
          ))}

          {/* Animated shipment dots — one per route */}
          {routes.map((r) => (
            <g key={`s-${r.id}`}>
              <circle r="4" className="ship-dot" filter="url(#goldGlow)">
                <animateMotion
                  dur={r.dur}
                  begin={r.begin}
                  repeatCount="indefinite"
                  rotate="auto"
                  path={r.path}
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.1;0.9;1"
                  dur={r.dur}
                  begin={r.begin}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Trail dot, slightly behind */}
              <circle r="2" className="ship-dot" opacity="0.35">
                <animateMotion
                  dur={r.dur}
                  begin={`${parseFloat(r.begin) + 0.18}s`}
                  repeatCount="indefinite"
                  path={r.path}
                />
                <animate
                  attributeName="opacity"
                  values="0;0.4;0.4;0"
                  keyTimes="0;0.1;0.9;1"
                  dur={r.dur}
                  begin={`${parseFloat(r.begin) + 0.18}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>

        <div className="mt-4 text-[11px] text-gray-2">
          Every Ponte report is anchored in flows like these — actual
          shipments, real ports, traceable companies.
        </div>
      </div>
    </section>
  );
}
