import type { ReactNode } from "react";
import { EVIDENCE_STATE_LABEL, EVIDENCE_STATE_LIMITATION, type EvidenceState } from "@/lib/deal-room/states";
import { STEP_STATE_LABEL, type StepState } from "@/lib/deal-room/states";
import type { ProfessionalMomentum } from "@/lib/deal-room/momentum";
import { progressDeltaSentence } from "@/lib/deal-room/momentum";
import type { ProcedureProgress } from "@/lib/deal-room/progress";
import { progressExplanation } from "@/lib/deal-room/progress";

/**
 * The shared Deal Room presentational pieces.
 *
 * Implemented centrally and reused, per Constitution section 20: a page may
 * compose these, it may not copy or locally restyle them.
 *
 * Two rules run through all of them.
 *
 * **Colour is never the only carrier of meaning.** Every state chip prints its
 * word. Read in greyscale, with a screen reader, or by someone who does not
 * distinguish red from green, each says the same thing.
 *
 * **A disabled action explains itself.** `Action` takes a `reason` and shows it
 * beside the control, which is DR-11's requirement: "The screen explains why an
 * action is unavailable rather than merely disabling it."
 */

export function Band({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dr__band">
      <h2 className="dr__band-title">{title}</h2>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  // Never "Nothing here". The empty state says what is expected and who owns it.
  return <p className="dr__empty">{children}</p>;
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: "danger" | "review" | "quiet";
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`dr__banner dr__banner--${tone}`} role={tone === "danger" ? "alert" : undefined}>
      <p className="dr__banner-title">{title}</p>
      <p className="dr__banner-body">{children}</p>
    </div>
  );
}

/**
 * The procedural completion display.
 *
 * When `progress.value` is null it renders the named state and no numeral at
 * all. Not a zero, not a bar at zero width, not a dash that could be mistaken
 * for one: the absence of a number is the honest answer before the parties have
 * agreed how the Deal will move.
 */
export function ProgressLine({
  stage,
  progress,
  openCriticalBlockers,
}: {
  stage: string;
  progress: ProcedureProgress;
  openCriticalBlockers: number;
}) {
  return (
    <div>
      <div className="dr__progress">
        <span className="dr__stage">{stage}</span>
        {progress.value === null ? (
          <span className="dr__no-value">No completion value until the procedure is agreed</span>
        ) : (
          <span className="dr__value">{progress.value}%</span>
        )}
      </div>
      {progress.value === null ? (
        <p className="dr__progress-note">
          A percentage appears once every required approver has approved the procedure. Until then the room shows the
          stage it has reached.
        </p>
      ) : (
        <p className="dr__progress-note">{progressExplanation(progress, openCriticalBlockers)}</p>
      )}
    </div>
  );
}

export function StepStateChip({ state }: { state: StepState }) {
  const tone =
    state === "completed" || state === "waived"
      ? "done"
      : state === "blocked"
        ? "danger"
        : state === "review_required" || state === "clarification_required"
          ? "review"
          : state === "not_ready"
            ? "declared"
            : null;
  return <span className={tone ? `dr__chip dr__chip--${tone}` : "dr__chip"}>{STEP_STATE_LABEL[state]}</span>;
}

/**
 * The evidence state, with its limitation attached.
 *
 * The limitation travels with the label rather than living in a help page,
 * which is how "uploaded" is prevented from reading as "checked". Acceptance
 * criterion 9 is mostly this component.
 */
export function EvidenceStateChip({ state, withLimitation = false }: { state: EvidenceState; withLimitation?: boolean }) {
  const tone =
    state === "accepted_for_procedure" || state === "independently_verified"
      ? "done"
      : state === "rejected"
        ? "danger"
        : state === "under_review" || state === "clarification_required"
          ? "review"
          : state === "uploaded" || state === "draft" || state === "disclosed"
            ? "declared"
            : null;

  return (
    <>
      <span className={tone ? `dr__chip dr__chip--${tone}` : "dr__chip"}>{EVIDENCE_STATE_LABEL[state]}</span>
      {withLimitation ? <p className="dr__item-limit">{EVIDENCE_STATE_LIMITATION[state]}</p> : null}
    </>
  );
}

export function NextAction({ label, owner, href }: { label: string; owner: string; href?: string }) {
  return (
    <div className="dr__next">
      <p className="dr__next-label">Next action</p>
      <p className="dr__next-title">
        {href ? (
          <a className="dr__link" href={href}>
            {label}
          </a>
        ) : (
          label
        )}
      </p>
      <p className="dr__next-owner">Owner: {owner}</p>
    </div>
  );
}

/**
 * A control that is honest about being unavailable.
 *
 * `reason` is required whenever `disabled` is true. A disabled button with no
 * explanation is the failure DR-11 names, and making the prop mandatory in
 * practice is cheaper than remembering.
 */
export function Action({
  label,
  reason,
  secondary,
  formAction,
  href,
}: {
  label: string;
  reason?: string | null;
  secondary?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
  href?: string;
}) {
  const className = secondary ? "dr__button dr__button--secondary" : "dr__button";

  if (reason) {
    return (
      <div>
        <button type="button" className={className} disabled aria-describedby={`why-${label.replace(/\W+/g, "-")}`}>
          {label}
        </button>
        <p className="dr__why" id={`why-${label.replace(/\W+/g, "-")}`}>
          {reason}
        </p>
      </div>
    );
  }

  if (href) {
    return (
      <a className={className} href={href}>
        {label}
      </a>
    );
  }

  return (
    <button type="submit" className={className} formAction={formAction}>
      {label}
    </button>
  );
}

/**
 * Professional Momentum, in the fixed five-part order.
 *
 * A description list, so the parts are labelled for a screen reader in the same
 * order a sighted reader meets them. The progress line is absent entirely when
 * no lawful number exists, rather than rendered empty.
 */
export function MomentumPanel({ momentum }: { momentum: ProfessionalMomentum }) {
  const delta = progressDeltaSentence(momentum.progressDelta);
  return (
    <dl className="dr__momentum">
      <dt>Action completed</dt>
      <dd>{momentum.actionCompleted}</dd>

      <dt>Value created</dt>
      <dd>{momentum.valueCreated}</dd>

      <dt>Work preserved</dt>
      <dd>{momentum.workPreserved}</dd>

      {delta ? (
        <>
          <dt>Progress</dt>
          <dd>{delta}</dd>
        </>
      ) : null}

      <dt>Next action</dt>
      <dd>
        {momentum.nextAction.href ? (
          <a className="dr__link" href={momentum.nextAction.href}>
            {momentum.nextAction.label}
          </a>
        ) : (
          momentum.nextAction.label
        )}
        {" · "}
        Owner: {momentum.nextAction.owner}
      </dd>
    </dl>
  );
}

/* ------------------------------------------------------------------ *
 * Commands
 *
 * A control that changes state is a submit button inside a form whose action
 * is a server action. That sentence is the correction the owner review asked
 * for: the first draft rendered `Action` on its own, outside any form and with
 * no `formAction`, which is a button that submits nothing.
 *
 * `CommandForm` exists so a surface cannot make that mistake again - it takes
 * the action, so there is no way to render its button without one.
 * ------------------------------------------------------------------ */

export function CommandForm({
  action,
  hidden,
  children,
  encType,
}: {
  action: (formData: FormData) => Promise<void>;
  /** Context the command needs: ids, locale, and where to return on refusal. */
  hidden: Record<string, string | null | undefined>;
  children: ReactNode;
  encType?: string;
}) {
  return (
    <form action={action} className="dr__form" encType={encType}>
      {Object.entries(hidden).map(([name, value]) =>
        value === null || value === undefined ? null : (
          <input type="hidden" name={name} value={value} key={name} />
        ),
      )}
      {children}
    </form>
  );
}

export function Field({
  label,
  name,
  help,
  type = "text",
  required,
  defaultValue,
  placeholder,
  accept,
}: {
  label: string;
  name: string;
  help?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  accept?: string;
}) {
  const id = `f-${name}`;
  return (
    <p className="dr__field">
      {/* The label stays visible. A placeholder is not a label. */}
      <label className="dr__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {help ? (
        <span className="dr__help" id={`${id}-help`}>
          {help}
        </span>
      ) : null}
      <input
        className="dr__input"
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        accept={accept}
        aria-describedby={help ? `${id}-help` : undefined}
      />
    </p>
  );
}

export function TextField({
  label,
  name,
  help,
  required,
  rows = 3,
}: {
  label: string;
  name: string;
  help?: string;
  required?: boolean;
  rows?: number;
}) {
  const id = `f-${name}`;
  return (
    <p className="dr__field">
      <label className="dr__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {help ? (
        <span className="dr__help" id={`${id}-help`}>
          {help}
        </span>
      ) : null}
      <textarea
        className="dr__input"
        id={id}
        name={name}
        rows={rows}
        required={required}
        aria-describedby={help ? `${id}-help` : undefined}
      />
    </p>
  );
}

export function SelectField({
  label,
  name,
  options,
  help,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  help?: string;
  defaultValue?: string;
}) {
  const id = `f-${name}`;
  return (
    <p className="dr__field">
      <label className="dr__label" htmlFor={id}>
        {label}
      </label>
      {help ? (
        <span className="dr__help" id={`${id}-help`}>
          {help}
        </span>
      ) : null}
      <select
        className="dr__input"
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-describedby={help ? `${id}-help` : undefined}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </p>
  );
}

/** The submit control of a `CommandForm`. */
export function Submit({ label, secondary }: { label: string; secondary?: boolean }) {
  return (
    <button type="submit" className={secondary ? "dr__button dr__button--secondary" : "dr__button"}>
      {label}
    </button>
  );
}

/**
 * What a command refused, and why.
 *
 * The sentence comes from the database function that refused it - "Admission
 * blocked: nda not yet accepted", "Only the owner of a Deal can take it into a
 * Deal Room" - so the member reads the actual rule rather than a generic
 * failure. `role="alert"` because it appears after an action they just took.
 */
export function CommandError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="dr__banner dr__banner--danger" role="alert">
      <p className="dr__banner-title">That did not go through</p>
      <p className="dr__banner-body">{message}</p>
    </div>
  );
}

/** The identity strip every room surface opens with. */
export function RoomHeader({
  reference,
  title,
  dealLine,
}: {
  reference: string;
  title: string;
  dealLine?: string | null;
}) {
  return (
    <header>
      <p className="dr__ref">{reference}</p>
      <h1 className="dr__title">{title}</h1>
      {dealLine ? <p className="dr__deal">{dealLine}</p> : null}
    </header>
  );
}
