import type { ReactNode } from "react";
import { motionClassName, motionComponent, type MotionId } from "@/lib/ponte/motion";

/**
 * The wrapper for an approved Ponte Flow motion component.
 *
 * It does three small things, and each is a rule the authorities state that a
 * hand-written `<div className="fs is-run">` would let a route quietly break.
 *
 * **1. The class comes from the approved specification.** `motionClassName`
 * reads `motion-spec.json`, so a route names a component by id such as `H04`, and
 * cannot invent a class, reuse another component's class, or animate something
 * the specification does not describe. Passing an engine-driven id (H01) throws
 * rather than rendering a still frame that looks like a working progress bar.
 *
 * **2. `running` is an explicit decision.** The keyframes in the approved
 * stylesheet are all scoped under `.is-run`, so the default is the settled end
 * state: mounted, correct, and not moving. A caller has to say that work is
 * happening. This matters because of the honesty rule in the delivered
 * documentation: a moving point means the platform is doing the work **now**,
 * and rendering one to imply progress that is not underway is a defect. Waiting
 * for a person is a halted state, which is a state and not an animation, and it
 * never pulses for attention.
 *
 * **3. It is hidden from assistive technology by default.** Constitution
 * section 10 prohibits motion as the only state carrier and section 18 requires
 * duplicated animation elements to be hidden from assistive technology. The
 * meaning belongs to the text beside the drawing. `label` exists for the rare
 * component that is genuinely the only carrier of its meaning; reaching for it is a prompt to ask whether the text is missing instead.
 *
 * ## Reduced motion needs nothing here
 *
 * Every component is authored in its end state, so the approved reduced-motion
 * stylesheet removes the animation and leaves the correct frame. There is no
 * branch in this component for it, and there should not be one: a component
 * that rendered a different tree under reduced motion would be a redraw, which
 * is precisely what the contract forbids.
 *
 * ## What this does not do yet
 *
 * It does not source the drawing. The eleven H-series SVGs are delivered on
 * disk and are passed in as `children`; there is no generated markup module for
 * them the way `FLOW_ICON_MARKUP` serves the icons. Building one belongs with
 * the Bridge primitives, which are the first real consumer. It is recorded as gap
 * DS-3 rather than guessed at here with nothing to verify against.
 */

export interface FlowMotionProps {
  /** The approved component id, e.g. `H04`. Never a class name. */
  id: Exclude<MotionId, "H01">;
  /**
   * Whether the state this component describes is happening now.
   *
   * Defaults to `false`: mounted and settled. Set it true only while the
   * platform is actually doing the work the component means.
   */
  running?: boolean;
  /** The delivered SVG for this component. */
  children: ReactNode;
  className?: string;
  /**
   * An accessible name, for the rare case where the drawing carries meaning no
   * neighbouring text does. Omit it and the drawing is hidden, which is right
   * almost every time.
   */
  label?: string;
}

export default function FlowMotion({ id, running = false, children, className, label }: FlowMotionProps) {
  // Resolving the component also validates the id against the approved
  // specification, so an unknown or engine-driven id fails here rather than
  // rendering an element with no animation and no explanation.
  motionComponent(id);

  const host = label ? ({ role: "img", "aria-label": label } as const) : ({ "aria-hidden": true } as const);

  return (
    <span className={motionClassName(id, { running, className })} {...host}>
      {children}
    </span>
  );
}
