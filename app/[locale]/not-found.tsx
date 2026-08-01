import { Link } from "@/i18n/navigation";
import DeskShell from "@/components/desk/DeskShell";
import PonteFooter from "@/components/PonteFooter";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

/**
 * The page that is not there.
 *
 * ## Why this was rebuilt
 *
 * The previous version was pre-Desk and had never been migrated: Tailwind
 * utilities, a `.glass` panel, `text-white`, and a `btn-gold` primary control
 * that renders as the bright lime the owner ruled out by name. Because it was
 * not bared in `ChromeGate` it also drew the retired obsidian header above
 * itself, advertising a MARKETPLACE that was retired in Stage 4.
 *
 * None of that was noticed for the same reason as the Deal Room chrome: nobody
 * looks at a 404 until something sends them to one. On 1 August 2026 the
 * entrance's own primary call to action did, and this is what the owner saw.
 *
 * It is now a Desk surface, drawn from tokens, and it obeys the theme like every
 * other page.
 *
 * ## What it says
 *
 * It does not apologise and it does not guess. A 404 is a statement about an
 * address, not about the member, and the three ways out are the three places
 * that are always somewhere to be: the entrance, the public board, and the
 * composer.
 *
 * `/explore` is deliberately not offered. It still exists but renders the
 * pre-Desk chrome, which is the seam this page was just pulled out of.
 */
export default function NotFound() {
  return (
    <div className="ponte-desk">
      {/* No rail: nothing has started, and a rail here would place a member
          inside a journey they did not begin. Same rule as the entrance. */}
      <DeskShell rail={null}>
        <section className="sec">
          <div className="empty">
            <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
            <div>
              <b>There is nothing at this address</b>
              <p>
                The page may have been moved or retired, or the link may be mistyped. This says nothing about your
                account, and nothing you were doing has been lost.
              </p>
              <div className="empty__a">
                <Link className="b" href="/">
                  Back to the entrance
                </Link>
                <Link className="b b--2" href="/market-signals">
                  Read the Market Signals
                </Link>
                <Link className="b b--2" href="/structure">
                  Bring a requirement or offer to the desk
                </Link>
              </div>
            </div>
          </div>
        </section>
      </DeskShell>
      <PonteFooter />
    </div>
  );
}
