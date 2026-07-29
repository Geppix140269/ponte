import { Link } from "@/i18n/navigation";
import {
  buildBoardHref,
  clearedAll,
  clearedSearch,
  hasStructuredFilters,
  type FindQuery,
} from "@/lib/find/query";
import { parseSignalSearch, MAX_QUERY_LENGTH } from "@/lib/search/signal-search";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";

/**
 * Free-text search over the Market Signals inventory.
 *
 * The board had structured filters and nothing else, which meant that finding a
 * signal about gas oil required knowing that Ponte files it under a sector, and
 * then knowing which one. A member does not arrive with Ponte's taxonomy. They
 * arrive with a phrase, and until this existed the phrase had nowhere to go.
 *
 * ---------------------------------------------------------------------------
 * A plain GET form, and why that is the whole design
 * ---------------------------------------------------------------------------
 * No client component, no state, no fetch, no debounce. The browser submits the
 * form, the URL changes, the server renders the answer. Three things follow
 * from that and each is a requirement rather than a side effect:
 *
 *   - **Enter submits it**, because Enter submits forms. Nothing implements it.
 *   - **The search state IS the URL**, so it is shareable, bookmarkable, and
 *     survives reload, Back and Forward without a line of code.
 *   - **It works without JavaScript**, which is not a nicety here: this is the
 *     primary way into a commercial inventory and it should not depend on a
 *     bundle having loaded.
 *
 * The hidden fields are what make it compose. A GET form replaces the query
 * string wholesale, so every filter a member has already set has to be carried
 * across or it is silently dropped by the act of searching. `page` is
 * deliberately NOT carried: a new search is a new result set, and page 4 of the
 * old one means nothing in it.
 */

/** Every dimension a search must carry across, in URL-parameter form. */
function carried(q: FindQuery): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const add = (name: string, value: string | number | null) => {
    if (value !== null && value !== "") out.push([name, String(value)]);
  };
  add("family", q.family);
  add("serviceCategory", q.serviceCategory);
  add("serviceSubcategory", q.serviceSubcategory);
  add("partnerType", q.partnerType);
  add("sector", q.sector);
  add("territory", q.territory);
  add("product", q.product);
  add("intent", q.intent);
  add("market", q.market);
  add("origin", q.origin);
  add("minQty", q.minQty);
  add("sort", q.sort);
  return out;
}

export default function SignalSearch({ q }: { q: FindQuery }) {
  const search = parseSignalSearch(q.q);
  // A query that was typed but cannot be searched. One character matches most
  // of the board and orders none of it, so it is not run. Saying so is the only
  // honest option, because the alternative is a full board under a heading
  // claiming to be a result.
  const tooShort = q.q !== null && search === null;
  /**
   * The terms the VOCABULARY added, and only those.
   *
   * Read from the matched alias groups rather than from `phrases`, which also
   * carries the format variants of an HS code. Those are the same code written
   * the way different sources stored it, so listing them told somebody who had
   * typed `99999999` that Ponte was "also searching 9999.9999" - true, and a
   * strange thing to say about a number they had just typed in full.
   *
   * Near-duplicates are collapsed on their spacing, so `en590` and `en 590`
   * appear once. Capped at four: the point is to show that the search was
   * widened and roughly how, not to print the table.
   */
  const widened: string[] = [];
  const seen = new Set<string>([(search?.normalised ?? "").replace(/ /g, "")]);
  for (const group of search?.groups ?? []) {
    for (const term of group.terms) {
      const key = term.replace(/ /g, "");
      if (seen.has(key) || widened.length >= 4) continue;
      seen.add(key);
      widened.push(term);
    }
  }

  return (
    <div className="sigsearch">
      <form className="sigsearch__f" method="get" action="/market-signals" role="search">
        <label className="sigsearch__l" htmlFor="signal-q">
          Search Market Signals
        </label>
        <div className="sigsearch__row">
          <input
            id="signal-q"
            className="sigsearch__i"
            type="search"
            name="q"
            defaultValue={q.q ?? ""}
            placeholder="Search products, HS codes, countries or requirements"
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
          />
          <button className="b sigsearch__go" type="submit">
            <PonteIcon name="evidence.evreview" size={15} />
            Search
          </button>
        </div>
        {carried(q).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>

      {tooShort && (
        <p className="sigsearch__note">
          A search needs at least two letters or digits, so this one was not run. Everything below
          is the board as it stands.
        </p>
      )}

      {search && (
        <p className="sigsearch__active">
          <span className="mono">Searching</span> <b>{search.raw}</b>
          {widened.length > 0 && (
            /*
             * Say that the search was widened, and by WHAT.
             *
             * A member who searched for `gas oil` and is shown a record titled
             * `Diesel EN590` has been given a correct answer that looks like a
             * wrong one. The vocabulary is only defensible if it is visible.
             *
             * The terms, not the group's name. Naming the group printed "also
             * searching gas oil" to somebody who had just typed gas oil, which
             * states that something was added while naming nothing.
             */
            <span className="sigsearch__also">
              {" "}
              also searching {widened.join(", ")}
            </span>
          )}{" "}
          <Link className="sigsearch__clear" href={buildBoardHref(clearedSearch(q))}>
            Clear search
          </Link>
          {hasStructuredFilters(q) && (
            <>
              {" "}
              <Link className="sigsearch__clear" href={buildBoardHref(clearedAll(q))}>
                Clear all
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
