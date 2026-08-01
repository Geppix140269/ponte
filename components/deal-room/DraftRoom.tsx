import {
  DRAFT_HISTORY,
  DRAFT_RECOGNITION,
  DRAFT_REGIONS,
  DRAFT_ROOM,
  REGION_STATE_LABEL,
} from "@/lib/deal-room/draft-room-example";

/**
 * Screen 1 of the four: the private Deal Room draft, drawn.
 *
 * From `Ponte Deal Room - Four New Screens v1.html` in the owner's design
 * project. It is State B of ADR-0028 - a room a member has built for free
 * around their own published opportunity, which nobody else can see - and it
 * is the product's conversion mechanism rather than a step in a form.
 *
 * ## The four rules the drawing exists to hold
 *
 * **It opens as a presentation, not a form.** A serif title, the member's own
 * facts in an ink masthead, and a "Private to you" seal. The first thing seen
 * is their deal looking finished.
 *
 * **Every region is present whether or not it is filled.** A region never
 * collapses to a link, so the shape of the finished room is legible on a first
 * visit and nothing appears to go missing later. An empty region is a composed
 * field - a dashed frame, the state in plain words, what it is for, and one
 * action - not a shrug.
 *
 * **Open facts are drawn, not hidden.** Destination, delivery and price basis
 * are dashed and captioned as questions the procedure answers, so an unknown
 * reads as discipline rather than as an unfinished field.
 *
 * **No price anywhere.** No plan chooser, no upgrade banner, no countdown. The
 * only forward control is activation, where the cost is stated in full. A
 * member must reach the moment of pride without having been asked for money.
 *
 * ## It is an example, and says so
 *
 * Rendered today inside the public walkthrough, so the deal shown is the design
 * package's illustrative one and is labelled as an example by the caller. When
 * ADR-0028 State B is built this component takes a real room and the label goes
 * with the example.
 */
export default function DraftRoom({ idPrefix = "dr" }: { idPrefix?: string }) {
  return (
    <div className="dm">
      {/* The masthead. The member's deal, presented. */}
      <header className="pres">
        <p className="pres__t">
          <span>Master Deal Room</span>
          <span className="mono">{DRAFT_ROOM.reference}</span>
          <span className="mono">Deal {DRAFT_ROOM.deal}</span>
          <span className="r">
            <span className="pres__seal">
              <i aria-hidden="true" />
              {DRAFT_ROOM.seal}
            </span>
          </span>
        </p>

        <h1 id={`${idPrefix}-title`}>{DRAFT_ROOM.title}</h1>

        <p className="pres__by">
          <span>{DRAFT_ROOM.owner}</span>
          <i aria-hidden="true" />
          <span>{DRAFT_ROOM.place}</span>
          <i aria-hidden="true" />
          <span>{DRAFT_ROOM.family}</span>
          <i aria-hidden="true" />
          <span>{DRAFT_ROOM.published}</span>
        </p>

        <dl className="pres__f">
          {DRAFT_ROOM.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              {/*
                An open fact keeps its own class rather than being omitted. The
                room says "Destination: Open, not yet agreed", which is a
                statement about the deal; a blank would be a statement about the
                member.
              */}
              <dd className={fact.open ? "open" : undefined}>
                {fact.value}
                {fact.detail ? <em>{fact.detail}</em> : null}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="dm2">
        <div className="dm2__m">
          {DRAFT_REGIONS.map((region) => (
            <section className="rg" key={region.id} aria-labelledby={`${idPrefix}-${region.id}`}>
              <header className="rg__h">
                <b id={`${idPrefix}-${region.id}`}>{region.name}</b>
                {/* The state in a word. Colour is never the carrier. */}
                <span
                  className={
                    region.state === "ready" || region.state === "partial" ? "c" : "c c--wait"
                  }
                  style={{ marginInlineStart: 0 }}
                >
                  {REGION_STATE_LABEL[region.state]}
                </span>
              </header>

              <div className="rg__b">
                {region.zero ? (
                  <div className="rgz">
                    <div className="rgz__l">
                      <i className={region.state === "empty" ? "rd" : undefined} aria-hidden="true" />
                      <div>
                        <b>{region.zero}</b>
                        <p>{region.zeroBody}</p>
                      </div>
                    </div>

                    {region.id === "progress" ? (
                      /*
                        The progress model shows its neutral state honestly: ten
                        dashed segments, NO figure, and the reason printed
                        underneath. A percentage against a procedure nobody has
                        agreed would be a claim, which is what ADR-0024 and the
                        Deal Room spec both refuse.
                      */
                      <div className="np">
                        <p className="np__t">
                          <b>Procedural completion</b>
                          <span>Not started</span>
                        </p>
                        <div className="np__r" aria-hidden="true">
                          {Array.from({ length: 10 }, (_, i) => (
                            <i key={i} />
                          ))}
                        </div>
                        <p className="np__s">
                          <span>Procedure agreed</span>
                          <span>Ready</span>
                        </p>
                        <p>
                          A figure appears here once both principal parties approve a version of the procedure, and
                          not before.
                        </p>
                      </div>
                    ) : null}

                    {region.id === "activity" ? (
                      <div>
                        {DRAFT_HISTORY.map((entry) => (
                          <p className="spec" key={entry.when} style={{ borderInlineStart: "none" }}>
                            <i aria-hidden="true" />
                            <span>
                              <b>{entry.what}</b>
                              <span>{entry.detail}</span>
                            </span>
                            <u>{entry.when}</u>
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {(region.cta || region.cta2) && (
                      <div className="rgz__a">
                        {region.cta ? (
                          <button type="button" className="dmb dmb--sm">
                            {region.cta}
                          </button>
                        ) : null}
                        {region.cta2 ? (
                          <button type="button" className="dmb dmb--2 dmb--sm">
                            {region.cta2}
                          </button>
                        ) : null}
                        <span className="why">{region.purpose}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="rgz" style={{ borderStyle: "solid" }}>
                    <b>{region.purpose}</b>
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Progressive recognition. What was created, what it makes possible,
            and one next action. Nothing congratulates anybody. */}
        <aside className="dm2__s">
          <div className="rec">
            <p className="rec__h">
              What this room has become<span>Since 28 July</span>
            </p>
            <ol>
              {DRAFT_RECOGNITION.map((entry) => (
                <li key={entry.title} className={entry.state === "done" ? undefined : entry.state}>
                  <i aria-hidden="true" />
                  <b>
                    {entry.title}
                    <span>{entry.detail}</span>
                  </b>
                  {entry.when ? <time>{entry.when}</time> : <time aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <p className="rec__f">
              Nothing here is a score. It is a record of what you have built and what it makes possible.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
