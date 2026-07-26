import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import { railForScreen } from "@/lib/desk/journey";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

/**
 * No such Market Signal.
 *
 * A segment-scoped not-found, because the application's global 404 is still the
 * legacy obsidian page: gold on obsidian, a `btn-gold`, and a link to the old
 * Catalogue. Reached from a mistyped or stale signal link, that dropped a
 * visitor straight out of the new product and into the old one, which is the
 * exact leak this route was migrated to close.
 *
 * It now renders in the Desk system rather than the Explore chrome it was first
 * written in, so a 404 on a Desk route no longer lands in the surface the Desk
 * replaces. Migrating the GLOBAL 404 affects every legacy route still using it
 * and remains its own change.
 *
 * Three cases arrive here, and the copy is honest for all three: no such
 * signal, an id that was never valid, and a read that failed. The page does not
 * guess which, and does not claim the signal "expired" when it may never have
 * existed. That is a different screen: a signal Ponte DID publish and has since
 * withdrawn keeps its reference and says so.
 *
 * The rail still shows R-FIND at Record. The member is where they were; it is
 * the record that is not there.
 */
export default function MarketSignalNotFound() {
  const rail = railForScreen("signal", { objectiveStated: false });

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market">
        <div className="detail__m" style={{ maxWidth: 860 }}>
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/market-signals">Market Signals</Link>
            <span aria-hidden="true">/</span>
            <span>Not found</span>
          </nav>

          <div className="err">
            <PonteIcon name="participation.boundary" size={20} label="Boundary of what is known" />
            <div>
              <b>No signal exists at this address</b>
              <p>
                Ponte holds no record with this reference. That can mean the link was mistyped,
                that the reference was never valid, or that the read failed. Ponte does not guess
                which, and does not tell you a signal expired when it may never have existed.
              </p>
            </div>
          </div>

          <p style={{ marginTop: 14 }}>
            <Link className="b" href="/market-signals">
              Back to Market Signals
            </Link>
          </p>
        </div>
      </DeskShell>
    </div>
  );
}
