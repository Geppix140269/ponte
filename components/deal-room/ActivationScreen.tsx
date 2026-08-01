import { ACTIVATION } from "@/lib/deal-room/screens-example";

/**
 * Screen 2: activation. The one paid moment in the product.
 *
 * From `Ponte Deal Room - Four New Screens v1.html`. This is the transition
 * from State B to State C in ADR-0028: a room the member has already built and
 * seen becomes externally operational, and that is the ONLY event Ponte
 * charges for.
 *
 * ## What the drawing holds
 *
 * **The price is stated once, large, with no comparison.** No tiers, no
 * "from", no struck-through anything. A second figure beside it would make
 * this read as one of two plans, which ADR-0028 rules out.
 *
 * **The visibility choice is two explained cards, and never silent.** Both are
 * fully described, the default is marked in words as well as by selection, and
 * "open" never stands alone: the card says in its own words that nobody enters
 * by applying.
 *
 * **Confirmation is an unticked box and a control that says why it is
 * unavailable.** A disabled button that sits there dead teaches a member that
 * the screen is broken; this one states the condition. No amount moves before
 * a deliberate act, which is the brief's phrase and the rule underneath it.
 *
 * ## Rendered here as a drawing
 *
 * Activation as an EVENT does not exist yet: it is item 3 of the eleven in
 * ADR-0028. So the controls below are inert and the surface is shown inside
 * the walkthrough, where its job is to let a visitor see exactly what they
 * would be asked before they are ever asked it. When the event is built this
 * component takes real state and the controls become live.
 */
export default function ActivationScreen({ idPrefix = "act" }: { idPrefix?: string }) {
  return (
    <div className="dm">
      <header className="act2">
        <p className="k">{ACTIVATION.kicker}</p>
        <h1 id={`${idPrefix}-h`}>{ACTIVATION.head}</h1>
        <p>{ACTIVATION.body}</p>

        <p className="price">
          <b className="mono">{ACTIVATION.price}</b>
          <em>{ACTIVATION.period}</em>
        </p>

        <ul className="incl">
          {ACTIVATION.included.map((line) => (
            <li key={line}>
              <i aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="dm2__m">
        {/* The choice. Explicit, explained, and never assigned silently. */}
        <section className="dmsec" aria-labelledby={`${idPrefix}-vis`}>
          <h3 id={`${idPrefix}-vis`}>
            How should counterparties reach this Deal Room?
            <span>You choose. Nothing is assumed.</span>
          </h3>
          <div className="vis2">
            {ACTIVATION.choice.map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={`${idPrefix}-visibility`}
                  defaultChecked={option.isDefault}
                  disabled
                />
                <span>
                  <b>
                    <u>{option.isDefault ? "Default" : "Alternative"}</u>
                    {option.title}
                    {option.isDefault ? <span className="dflt">Selected</span> : null}
                  </b>
                  <p>{option.body}</p>
                  <span className="d">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* The ledger. Legible, and subordinate to the headline figure. */}
        <section className="dmsec" aria-labelledby={`${idPrefix}-chg`}>
          <h3 id={`${idPrefix}-chg`}>
            What else could be charged
            <span>Nothing here happens without another deliberate act</span>
          </h3>
          <div className="chg2">
            {ACTIVATION.ledger.map((row) => (
              <div key={row.what}>
                <b>
                  {row.what}
                  <span>{row.why}</span>
                </b>
                <u className="mono">{row.amount}</u>
              </div>
            ))}
          </div>
        </section>

        <section className="dmsec" aria-labelledby={`${idPrefix}-cf`}>
          <h3 id={`${idPrefix}-cf`}>Confirm</h3>
          <div className="confirm">
            <input type="checkbox" disabled aria-describedby={`${idPrefix}-cfw`} />
            <span>
              <b>{ACTIVATION.confirm}</b>
              <p id={`${idPrefix}-cfw`}>{ACTIVATION.confirmSub}</p>
            </span>
          </div>
          <p className="rgz__a" style={{ marginTop: 14 }}>
            {/*
              The control states its own condition rather than sitting dead.
              A disabled button with no reason teaches a member that the page
              is broken, and they press it again.
            */}
            <span className="dmb" aria-disabled="true">
              Activate this Deal Room
            </span>
            <span className="why">Available once the box above is ticked.</span>
          </p>
        </section>

        {/* The fear behind the click, answered. */}
        <section className="dmsec" aria-labelledby={`${idPrefix}-nc`}>
          <h3 id={`${idPrefix}-nc`}>What does not change</h3>
          <div className="priv">
            <div>
              <i aria-hidden="true">01</i>
              <span>
                <b>Activation discloses nothing by itself</b>
                <span>Your contact details stay private. Admission is still formal, and still yours to grant.</span>
              </span>
            </div>
            <div>
              <i aria-hidden="true">02</i>
              <span>
                <b>Expiry preserves, it does not delete</b>
                <span>When the period ends the room becomes read only. Every document and decision remains.</span>
              </span>
            </div>
            <div>
              <i aria-hidden="true">03</i>
              <span>
                <b>The counterparty never pays</b>
                <span>Anybody you invite takes part at no cost, for the whole life of the room.</span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
