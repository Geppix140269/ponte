/**
 * The seven lifecycle states, as one shared primitive.
 *
 * **Consuming routes import `components/ponte/state/state.css`**, the same way
 * every Desk route imports `desk.css`. The stylesheet is deliberately not
 * imported here: the repository loads route CSS at the route, which keeps the
 * cascade order something a person can read off the page file rather than infer
 * from a component graph.
 *
 * Gap G7: 25 of 28 user-facing routes have no loading, error or empty
 * treatment, and Constitution section 19 makes a happy-path-only component
 * incomplete. Rather than each journey inventing its own vocabulary, which is
 * how the product ended up with six visual systems, every state a journey can
 * be in resolves through this one component.
 *
 * This PR builds the primitive. It deliberately does not retrofit the routes:
 * each journey slice adopts it with its own evidence and its own approval.
 *
 * ## The states are not interchangeable
 *
 * The distinctions below are the point of the component, and each one is a
 * distinction the authorities insist on holding:
 *
 * - **`waiting` and `review` are not the same state.** Waiting means the
 *   *member* is the blocker. Under review means Ponte has *opened* a review and
 *   a person here must finish it. The state definitions allow the second to be
 *   inferred from an open review record only, never from an upload, and
 *   require that it is never rendered before the review has actually started.
 *
 * - **`blocked` and `error` are not the same state.** Blocked is a condition
 *   that stops an action the member could reasonably expect to work, and
 *   Constitution section 12 requires the reason to be understandable, so
 *   `detail` is mandatory for it, at the type level. An error is a failure.
 *
 * - **`completed` says a stage finished and nothing else.** Not verified, not
 *   approved, not successful. The inference matrix answers "no" to every route
 *   from completeness to verification, and this component gives no way to
 *   express one as the other.
 *
 * ## Motion reinforces; it never invents
 *
 * Only `active` and `loading` move, and only while the platform is genuinely
 * doing the work. Everything else is still. A halted point means a person must
 * act, and the state definitions are explicit that it must not animate and must
 * never pulse for attention, a record waiting for someone is a state, not a
 * process. Reduced motion removes the movement and nothing else: the label, the
 * marker geometry and the stated condition are all untouched, so no information
 * depends on the animation running.
 *
 * ## Accessibility
 *
 * The label is real text, so the state survives greyscale, colour blindness and
 * a printout. The marker is `aria-hidden`, it reinforces the words rather than
 * repeating them. `active`, `loading` and `error` announce politely, because
 * those are the states that change under the reader rather than being present
 * when they arrive; the settled states are read in document order like any other
 * text. Nothing here is focusable: this is a status, not a control, and giving
 * it a tab stop would put a stop in the sequence with nothing to do at it.
 */

export type LifecycleStateName =
  | "loading"
  | "waiting"
  | "blocked"
  | "active"
  | "review"
  | "completed"
  | "error";

/** The CSS modifier for each state. */
const MODIFIER: Record<LifecycleStateName, string> = {
  loading: "pst--loading",
  waiting: "pst--waiting",
  blocked: "pst--blocked",
  active: "pst--active",
  review: "pst--review",
  completed: "pst--completed",
  error: "pst--error",
};

/**
 * States that change while the reader is on the page, and so are announced.
 *
 * `polite`, never `assertive`: an interruption is for something the reader must
 * act on immediately, and none of these are that.
 */
const ANNOUNCED = new Set<LifecycleStateName>(["loading", "active", "error"]);

type BaseProps = {
  /** The state's own words. This is what carries the meaning. */
  label: string;
  className?: string;
};

export type LifecycleStateProps = BaseProps &
  (
    | {
        state: "blocked";
        /**
         * Required. Constitution section 12: an action the member may expect to
         * work needs an understandable reason when it does not. A bare "Blocked"
         * is the failure this type prevents.
         */
        detail: string;
      }
    | {
        state: Exclude<LifecycleStateName, "blocked">;
        /** What would change the state, where saying so helps. */
        detail?: string;
      }
  );

export default function LifecycleState({ state, label, detail, className }: LifecycleStateProps) {
  const classes = ["pst", MODIFIER[state], className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      data-state={state}
      {...(ANNOUNCED.has(state) ? { role: "status" as const } : {})}
    >
      {/* Reinforcement, not information. Everything it expresses is in the
          text beside it, which is what keeps the state readable without
          colour, without motion and without CSS. */}
      <span className="pst__mark" aria-hidden="true">
        <span className="pst__point" />
      </span>
      <span>
        <span className="pst__label">{label}</span>
        {detail ? <span className="pst__detail">{detail}</span> : null}
      </span>
    </span>
  );
}
