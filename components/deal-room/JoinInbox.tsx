import { JOIN_APPLICATIONS, type IdentityState } from "@/lib/deal-room/screens-example";

/**
 * Screen 4: the request-to-join inbox.
 *
 * From `Ponte Deal Room - Four New Screens v1.html`. It exists only when a
 * room is discoverable: the owner reviews applications from members who found
 * the showroom and asked to open a private branch.
 *
 * ## Six identity states, six separate lines
 *
 * There is NO combined "Verified" badge, and there will not be one. ADR-0027
 * is explicit that these states stay specific, and the drawing goes further by
 * putting the two that matter next to each other on purpose:
 *
 *   Commercial authority declared
 *   Commercial authority not independently verified
 *
 * The strongest-looking claim is read beside its own limit. Each line also
 * carries the fact that satisfied it, or the reason it is unmet, so nothing is
 * a bare tick.
 *
 * They are shape-coded as well as worded, because colour is never the carrier:
 * a filled square is confirmed, a dashed circle is declared, a dotted square is
 * not established. The distinction survives greyscale.
 *
 * ## No contact route exists on this screen
 *
 * No email, no telephone, no WhatsApp, no handle. That is the entire point of
 * the gate: the owner decides on commercial relevance, and contact happens
 * inside the room after admission. A clarification is a set of named questions
 * answered through Ponte, which is why the asked state renders as questions
 * rather than as a message thread.
 *
 * ## Anti-inference is designed in, not asserted
 *
 * Nothing here shows a count of applications, a branch capacity or a queue
 * position, and nothing would in the applicant's view either. The drawing also
 * makes declining and archiving emit the same outward signal, so a decline
 * cannot be inferred from silence.
 *
 * ## Rendered here as a drawing
 *
 * The application journey is item 6 of the eleven in ADR-0028 and does not
 * exist. The three applications are the design package's examples, labelled by
 * the caller, and the controls are inert.
 */

const STATE_CLASS: Record<IdentityState, string> = {
  on: "on",
  declared: "decl",
  no: "no",
};

export default function JoinInbox({ idPrefix = "rq" }: { idPrefix?: string }) {
  return (
    <div className="dm">
      <div className="dm2__m" style={{ padding: 0 }}>
        <section className="dmsec" aria-labelledby={`${idPrefix}-h`}>
          <h3 id={`${idPrefix}-h`}>
            Requests to join
            <span>You decide who is admitted, and on what you can actually see</span>
          </h3>

          {JOIN_APPLICATIONS.map((application) => (
            <article className="app" key={application.ref}>
              <header className="app__h">
                <b>{application.organisation}</b>
                <span className="ref">{application.ref}</span>
                <span className="ref">{application.place}</span>
                <span className="age">{application.age}</span>
              </header>

              <div className="app__b">
                <div className="app__id">
                  <span className="idl__t">Identity, stated separately</span>
                  <ul className="idl">
                    {application.identity.map((fact) => (
                      <li key={fact.label} className={STATE_CLASS[fact.state]}>
                        <i aria-hidden="true" />
                        <span>
                          {fact.label}
                          <em>{fact.detail}</em>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="app__sum">
                  <dl className="sumg">
                    {application.summary.map((field) => (
                      <div key={field.label} className={field.wide ? "sumg--wide" : undefined}>
                        <dt>{field.label}</dt>
                        {/* An absence is information, shown muted rather than omitted. */}
                        <dd className={field.value === "Not stated." ? "q" : undefined}>{field.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {application.asked ? (
                    <div className="ask">
                      <b>Clarification asked {application.asked.on}</b>
                      <p>
                        Named questions, answered inside Ponte. No contact route is exchanged, and none is created by
                        asking.
                      </p>
                      <ul>
                        {application.asked.questions.map((question) => (
                          <li key={question}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              {/*
                Six actions, ranked. Accept and clarify lead; decline and
                archive are quiet; report and block are separated to the end,
                because a control that ends a relationship should not sit
                beside the one that begins it.
              */}
              <footer className="app__f">
                <span className="dmb dmb--sm" aria-disabled="true">
                  Accept and open a branch
                </span>
                <span className="dmb dmb--2 dmb--sm" aria-disabled="true">
                  Ask a clarification
                </span>
                <span className="dmb dmb--q dmb--sm" aria-disabled="true">
                  Decline
                </span>
                <span className="dmb dmb--q dmb--sm" aria-disabled="true">
                  Archive
                </span>
                <span className="sp">
                  <span className="dmb dmb--danger dmb--sm" aria-disabled="true">
                    Report
                  </span>
                  <span className="dmb dmb--danger dmb--sm" aria-disabled="true">
                    Block
                  </span>
                </span>
              </footer>
            </article>
          ))}
        </section>

        <p className="dmnote" style={{ fontFamily: "var(--pf-f-mono)", fontSize: 10.5, color: "var(--pf-ink-3)", lineHeight: 1.6 }}>
          An applicant sees the status of their own application and nothing else. Not how many others applied, not
          whether anybody was accepted, not how many branches are open, and not whether this room is near its limit.
          Declining and archiving look identical from outside, so a decline cannot be read from silence.
        </p>
      </div>
    </div>
  );
}
