import { centroidOf, project } from "@/lib/geo/centroids";

/**
 * The corridors currently live on the board, drawn as arcs on a world plate.
 *
 * Every arc is a real deal's route. Nothing here is decorative geography: a
 * country appears only because a live listing names it, so an empty board
 * draws an empty map and the caller hides the whole section.
 *
 * Deliberately not a map library and not a borders file. A detailed world
 * outline is 100kB+ of path data for a graphic that says one thing, and the
 * thing it says is "these routes are moving". A graticule with real centroids
 * carries that at about 4kB and keeps the homepage inside its Lighthouse
 * budget. It also refuses to imply a precision we do not have: we know a deal
 * runs Brazil to Netherlands, not which berth.
 *
 * Pure SVG and CSS, so it server-renders with no JavaScript. The draw
 * animation rides `.route-draw` from globals.css, which is already switched
 * off under prefers-reduced-motion.
 */

const W = 1000;
const H = 460;
/** Beyond this the arcs stop reading as routes and start reading as string. */
const MAX_ROUTES = 14;

type Route = { from: string; to: string; id: string };

/**
 * Upper bound on a quadratic bezier's length: the control polygon. Used for
 * stroke-dasharray, where guessing slightly long is safe (the line starts
 * fully hidden) and guessing short would leave a visible stub before the
 * animation begins.
 */
function controlPolygonLength(
  x1: number, y1: number, cx: number, cy: number, x2: number, y2: number,
): number {
  return (
    Math.hypot(cx - x1, cy - y1) + Math.hypot(x2 - cx, y2 - cy)
  );
}

export default function TradeRouteMap({
  routes,
  className = "",
}: {
  routes: Route[];
  className?: string;
}) {
  const drawn = routes
    .map((r) => {
      const a = centroidOf(r.from);
      const b = centroidOf(r.to);
      if (!a || !b) return null;
      const p1 = project(a, W, H);
      const p2 = project(b, W, H);
      // Bow the arc away from the straight line, more for longer hauls, so a
      // Rotterdam to Antwerp hop does not get the same drama as a Pacific run.
      const span = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2 - Math.min(span * 0.34, 150);
      return {
        id: r.id,
        d: `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
        len: Math.ceil(controlPolygonLength(p1.x, p1.y, cx, cy, p2.x, p2.y)),
        from: p1,
        to: p2,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, MAX_ROUTES);

  if (drawn.length === 0) return null;

  // One node per country, so a hub that appears in six corridors is drawn
  // once rather than six times on top of itself.
  const origins = new Map<string, { x: number; y: number }>();
  const destinations = new Map<string, { x: number; y: number }>();
  for (const r of drawn) {
    origins.set(`${r.from.x},${r.from.y}`, r.from);
    destinations.set(`${r.to.x},${r.to.y}`, r.to);
  }
  Array.from(origins.keys()).forEach((key) => destinations.delete(key));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="Live trade corridors on the board"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="route-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CBFB5E" />
          <stop offset="0.5" stopColor="#8B6BFF" />
          <stop offset="1" stopColor="#3FE0C5" />
        </linearGradient>
        {/* The map plate: dots on land-and-sea alike, at low contrast. It
            reads as a plate for the routes to sit on, and claims nothing
            about coastlines it does not know. */}
        <pattern
          id="route-grid"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.2" cy="1.2" r="1.2" fill="rgba(255,255,255,.05)" />
        </pattern>
        <radialGradient id="route-node-glow">
          <stop offset="0" stopColor="#CBFB5E" stopOpacity="0.5" />
          <stop offset="1" stopColor="#CBFB5E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#route-grid)" />

      {/* Graticule. Every 30 degrees of longitude, every 30 of latitude. */}
      <g stroke="rgba(255,255,255,.055)" strokeWidth="1">
        {[1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={(W / 6) * i} y1="0" x2={(W / 6) * i} y2={H} />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <line key={`h${i}`} x1="0" y1={(H / 5) * i} x2={W} y2={(H / 5) * i} />
        ))}
      </g>
      {/* The equator, one shade up, so the plate has an anchor. */}
      <line
        x1="0"
        y1={H / 2}
        x2={W}
        y2={H / 2}
        stroke="rgba(255,255,255,.09)"
        strokeWidth="1"
      />

      <g fill="none" strokeLinecap="round">
        {drawn.map((r, i) => (
          <path
            key={r.id}
            d={r.d}
            stroke="url(#route-arc)"
            strokeWidth="2"
            className="route-draw"
            style={{
              ["--len" as string]: r.len,
              // Staggered, so corridors arrive one after another rather than
              // all snapping in at once.
              animationDelay: `${i * 140}ms`,
            }}
          />
        ))}
      </g>

      {/* Origin piers lime, destination piers cyan: the same reading as the
          mark, where the lime side is where a thing starts. */}
      {Array.from(origins.values()).map((p) => (
        <g key={`o${p.x}-${p.y}`}>
          <circle cx={p.x} cy={p.y} r="16" fill="url(#route-node-glow)" />
          <circle cx={p.x} cy={p.y} r="3.4" fill="#CBFB5E" />
        </g>
      ))}
      {Array.from(destinations.values()).map((p) => (
        <circle key={`d${p.x}-${p.y}`} cx={p.x} cy={p.y} r="3.4" fill="#3FE0C5" />
      ))}
    </svg>
  );
}
