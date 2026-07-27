import spec from "@/design-system/ponte-flow/motion/motion-spec.json";

/**
 * The Ponte Flow motion layer, as the product consumes it.
 *
 * ## The one design decision in this file
 *
 * Every meaning below is **read from `motion-spec.json`**, not restated here.
 * That is deliberate and it is the whole point of the module.
 *
 * The instinct when wiring an approved motion system is to write a nice typed
 * register: twelve entries, each with a friendly summary of what it means. That
 * register is a second source of truth the moment it exists. It drifts silently,
 * it is never diffed against the authority, and a year later the product is
 * animating H08 for something the specification never said it meant. The
 * specification is already machine-readable and already complete — twelve
 * components, each with trigger, start, end, duration, easing, interruption,
 * reduced-motion fallback and an explicit `mustNotBeUsed`. So it is imported.
 *
 * The consequence to keep in mind: **there is nothing to edit here to change a
 * motion meaning.** Changing one means amending the approved specification,
 * which is exactly the control Constitution section 10 and section 20 are for.
 *
 * ## What is NOT here
 *
 * No animation runtime. Constitution section 23 prohibits introducing a new
 * motion language, and the Phase 1 audit confirmed `package.json` carries
 * neither Framer Motion nor Lottie. Libraries C, E and F add no animated
 * components; only Library H animates, and it is pure CSS apart from H01.
 *
 * The audit also recorded that Lottie "was never authored" — the brief
 * suggested it for H04 and H12, but the CSS and SVG implementations are
 * complete. A Lottie export would be re-authoring, not conversion.
 *
 * ## The reduced-motion contract
 *
 * Every component is authored in its END state on disk. Reduced motion is a
 * **removal**, never a redraw: stopping the animation leaves the correct
 * information on screen. That is why print, a paused tab and a JavaScript
 * failure all show the truth, and why nothing in this module needs to render a
 * different tree when motion is reduced.
 */

/** The twelve approved motion components, verbatim from the approved spec. */
export const MOTION_COMPONENTS = spec.components;

export type MotionComponent = (typeof MOTION_COMPONENTS)[number];
export type MotionId = MotionComponent["id"];

const BY_ID = new Map(MOTION_COMPONENTS.map((c) => [c.id, c]));

/** The approved specification for one component. Throws on an unknown id. */
export function motionComponent(id: MotionId): MotionComponent {
  const found = BY_ID.get(id);
  if (!found) {
    // Same reasoning as the icon registry: a name that is not in the authority
    // is a gap to escalate, never a reason to animate something approximate.
    throw new Error(`Unknown Ponte Flow motion component: ${id}`);
  }
  return found;
}

/**
 * The CSS class the delivered SVG carries as its root, or null for H01.
 *
 * H01 is the only component that is not pure CSS: its active length, numeral
 * and guidance sentence all follow one value, so it is engine-driven. It has no
 * class in the motion stylesheet, and `null` here is that fact rather than an
 * omission — see `lib/ponte/progress.ts` for the value it follows.
 */
export function motionClass(id: MotionId): string | null {
  return motionComponent(id).cssClass;
}

/**
 * The class list for a motion component's root element.
 *
 * `.is-run` is the play signal in the approved stylesheet: the keyframes are all
 * scoped under `.is-run`, so an element carrying only its component class
 * renders the settled end state and nothing moves. That is the correct default,
 * and it means "not yet running" and "reduced motion" produce the same DOM.
 *
 * Pass `running: false` for a component that is mounted but whose state change
 * has not happened. A moving point means work is happening **now** — rendering
 * one to suggest progress that is not underway is a defect, not a design choice.
 */
export function motionClassName(id: MotionId, options?: { running?: boolean; className?: string }): string {
  const base = motionClass(id);
  if (!base) throw new Error(`${id} is engine-driven and has no CSS class; use the progress engine instead.`);
  return [base, options?.running ? "is-run" : null, options?.className ?? null].filter(Boolean).join(" ");
}

/**
 * The attribute the approved reduced-motion stylesheet reads for the in-product
 * toggle, alongside the `prefers-reduced-motion` media query.
 *
 * Both must ship and both must produce identical output — the delivered
 * stylesheet defines the two rule sets in parallel. Setting this on a root
 * element is how a product-level preference reaches the CSS without any
 * component knowing about it.
 */
export const REDUCED_MOTION_ATTRIBUTE = "data-reduced-motion";

/** The value the stylesheet matches. It is a string attribute, not a boolean. */
export const REDUCED_MOTION_ON = "1";

/**
 * The media query the approved reduced-motion stylesheet uses.
 *
 * Exported so a component that must branch in JavaScript reads the same
 * condition the CSS does, rather than a hand-typed copy that can drift.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether motion should be removed, read from the same two sources as the CSS.
 *
 * Most components need no JavaScript at all: the stylesheet already removes
 * their animation under either condition. This exists for the cases CSS cannot
 * reach — principally the H01 engine, which has to set the active length
 * directly and hide the travelling point rather than tween to it.
 *
 * Returns `false` during server rendering, which is the safe direction: the
 * markup is the settled end state either way, so a client correction changes
 * nothing a reader can see.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const toggled = document.documentElement.getAttribute(REDUCED_MOTION_ATTRIBUTE) === REDUCED_MOTION_ON;
  if (toggled) return true;
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
