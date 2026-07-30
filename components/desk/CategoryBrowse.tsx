import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { buildBoardHref } from "@/lib/find/query";
import type { CategorySplit } from "@/lib/board/inventory";

/**
 * Every live market on the board, and which side of each one is crowded.
 *
 * ---------------------------------------------------------------------------
 * The split is the point
 * ---------------------------------------------------------------------------
 * A plain list of categories with one number each answers "how big is this
 * market". That is the less useful of the two questions a member actually has.
 * Coffee & Tea runs about six offers for every requirement; Consumer Goods runs
 * the other way at roughly twenty-five to one. Which side is thin is what tells
 * a member whether their own position is scarce or crowded, and it costs one
 * extra column to say it.
 *
 * Each row is three destinations, not one: the whole market, its offers, and
 * its requirements. A member who knows which side they are on should not have
 * to land on the mixed list and filter it themselves.
 *
 * ---------------------------------------------------------------------------
 * Rendered from what the inventory HAS
 * ---------------------------------------------------------------------------
 * The categories are discovered by reading the live records, not declared in a
 * constant here. So this page can only ever offer a market that genuinely has
 * signals in it, and a category that appears in the inventory appears here
 * without a code change. The consequence worth stating: a market with nothing
 * live is absent rather than listed-and-empty, which is the same rule the
 * board's family filters follow.
 */

/**
 * The proportional bar for one market.
 *
 * Presentational only, and hidden from assistive technology, because the two
 * counts either side of it already say the same thing in words. It carries no
 * status colour: supply and demand are not a good and a bad outcome, so they
 * are drawn as a filled and an outlined share of one rule rather than as two
 * semantic tints. See the note in SignalGates on why the palette is not spent
 * here.
 */
function Balance({ offers, total }: { offers: number; total: number }) {
  const share = total > 0 ? Math.round((offers / total) * 1000) / 10 : 0;
  return (
    <span className="cbrowse__bar" aria-hidden="true">
      <i className="cbrowse__bar-s" style={{ width: `${share}%` }} />
    </span>
  );
}

export default function CategoryBrowse({ splits }: { splits: CategorySplit[] | null }) {
  if (splits === null) {
    return (
      <section className="sec">
        <div className="err">
          <PonteIcon name="participation.boundary" size={20} label="Boundary of what is known" />
          <div>
            <b>The sources could not be read</b>
            <p>
              This is a technical failure, not a finding. It does not mean no market is live.
              Ponte cannot list the markets until the read succeeds.
            </p>
            <div className="empty__a">
              <Link className="b" href="/market-signals/categories">
                Try the read again
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const totalSignals = splits.reduce((sum, s) => sum + s.total, 0);

  return (
    <section className="sec">
      <div className="sech">
        <div>
          <h2>
            <PonteIcon name="deal.category" size={18} />
            Markets on the board
          </h2>
          <p className="d">
            {splits.length === 0
              ? "No market currently carries a live signal."
              : `${splits.length} markets, ${totalSignals.toLocaleString()} live signals. The bar shows how each market splits between the two sides.`}
          </p>
        </div>
        <Link href={buildBoardHref({ view: "board" })}>All signals</Link>
      </div>

      {splits.length === 0 ? (
        <div className="empty">
          <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
          <div>
            <b>No market is currently live on the public board</b>
            <p>
              Ponte publishes a signal only while it is approved and inside its public life.
              Nothing found is not the same as nothing happening.
            </p>
            <div className="empty__a">
              <Link className="b" href="/structure">
                Bring a requirement or offer to the desk
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="cbrowse">
          <div className="cbrowse__head" aria-hidden="true">
            <span>Market</span>
            <span className="cbrowse__v">Offers</span>
            <span className="cbrowse__v">Requirements</span>
            <span>Balance</span>
          </div>

          {splits.map((split) => (
            <div className="cbrowse__row" key={split.category}>
              <Link
                className="cbrowse__nm"
                href={buildBoardHref({ category: split.category, page: 1 })}
              >
                {split.category}
                <span className="cbrowse__tot">
                  {split.total.toLocaleString()} live
                </span>
              </Link>

              {/*
                Each count is its own link into that side of that market, and a
                side with nothing in it is plain text rather than a link to an
                empty result. A control that leads to a guaranteed empty page is
                not a control.
              */}
              {split.offers > 0 ? (
                <Link
                  className="cbrowse__v cbrowse__v--l"
                  href={buildBoardHref({ category: split.category, intent: "offer", page: 1 })}
                >
                  {split.offers.toLocaleString()}
                </Link>
              ) : (
                <span className="cbrowse__v cbrowse__v--0">0</span>
              )}

              {split.requirements > 0 ? (
                <Link
                  className="cbrowse__v cbrowse__v--l"
                  href={buildBoardHref({
                    category: split.category,
                    intent: "requirement",
                    page: 1,
                  })}
                >
                  {split.requirements.toLocaleString()}
                </Link>
              ) : (
                <span className="cbrowse__v cbrowse__v--0">0</span>
              )}

              <Balance offers={split.offers} total={split.total} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
