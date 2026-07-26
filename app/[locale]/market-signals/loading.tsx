import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import { railForScreen } from "@/lib/desk/journey";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

/**
 * The listing's loading state.
 *
 * Two things it has to get right, and one it has to avoid.
 *
 * It holds the register's own column widths, so nothing reflows when the rows
 * arrive. A skeleton that is a different shape from the content it stands in
 * for is a second layout the reader has to re-learn a moment later, and it was
 * the fault behind correction C10.
 *
 * The rail station is `active`, not `here`, because Ponte is genuinely running
 * a query. That is the one animated state in the system and it means work is
 * actually happening; it is not a decoration, and reduced-motion turns it off.
 *
 * It states no counts. A skeleton that says "reading 438 sources" is inventing
 * a number before the read that would produce it has returned.
 */
const HEADS = ["Classification", "Signal", "Primary fact", "Second fact", "Third fact", "Read", ""];

function SkeletonRow() {
  return (
    <div className="reg__row" aria-hidden="true">
      <div className="reg__cls">
        <span className="sk" style={{ height: 9, width: "78%" }} />
      </div>
      <div className="reg__t">
        <span className="sk" style={{ height: 13, width: "88%", marginBottom: 8 }} />
        <span className="sk" style={{ height: 9, width: "52%" }} />
      </div>
      {[0, 1, 2].map((i) => (
        <div className="reg__f" key={i}>
          <span className="sk" style={{ height: 8, width: "64%", marginBottom: 6 }} />
          <span className="sk" style={{ height: 11, width: "82%" }} />
        </div>
      ))}
      <div className="reg__src">
        <span className="sk" style={{ height: 9, width: "80%" }} />
      </div>
      <div className="reg__a" />
    </div>
  );
}

export default function Loading() {
  const rail = railForScreen("listing", { active: true });

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market">
        <section className="sec" aria-busy="true" aria-label="Reading sources">
          <div className="sech">
            <div>
              <h2>
                <PonteIcon name="evidence.evreview" size={18} />
                Market Signals
              </h2>
              <p className="d">
                Read from named public sources. Nothing here has been confirmed with the party
                named in it.
              </p>
            </div>
          </div>

          <div className="reg">
            <div className="reg__head" aria-hidden="true">
              {HEADS.map((head, i) => (
                <span key={i}>{head}</span>
              ))}
            </div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>

          <div className="notice" style={{ marginTop: 12 }}>
            <PonteIcon name="evidence.evreview" size={18} />
            <div>
              <b>Reading sources now</b>
              The rail point is moving because Ponte is running a query. Column widths are held so
              the register does not reflow when the rows arrive.
            </div>
          </div>
        </section>
      </DeskShell>
    </div>
  );
}
