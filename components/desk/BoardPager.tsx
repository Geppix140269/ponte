import { Link } from "@/i18n/navigation";
import { buildBoardHref, withPage, type FindQuery } from "@/lib/find/query";

/**
 * Previous and Next over the complete eligible inventory.
 *
 * The data layer has accepted an offset and reported a true total since the
 * inventory search was written, and no surface used either: the board printed
 * "3,517 signals" beside sixty of them and had no way to the rest. ADR-0011
 * calls that the defect, not the page size: sixty is a permitted page, and it
 * was being read as the inventory.
 *
 * Page numbers travel in the URL rather than in component state, so a member
 * can send someone page 12 of a search and have them arrive at page 12 of the
 * same search. That is also why this is Links and not buttons: it is
 * navigation, it belongs in history, and Back has to work.
 */
export default function BoardPager({
  q,
  total,
  offset,
  pageSize,
}: {
  q: FindQuery;
  /** Records matching the whole search, across the table. Not the page length. */
  total: number;
  /** The offset actually read, which may have been clamped back from the URL. */
  offset: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  // Derived from the offset the read actually used, not from the URL. A stale
  // link to page 40 of a set that now has 3 pages is answered at page 3, and
  // the control has to agree with the records above it.
  const page = Math.floor(offset / pageSize) + 1;
  const first = offset + 1;
  const last = Math.min(offset + pageSize, total);

  return (
    <nav className="pager" aria-label="Market Signals pages">
      {page > 1 ? (
        <Link className="b b--2 b--sm" href={buildBoardHref(withPage(q, page - 1))} rel="prev">
          Previous
        </Link>
      ) : (
        <span className="b b--2 b--sm" aria-disabled="true">
          Previous
        </span>
      )}

      <p className="pager__at mono" aria-live="polite">
        Showing {first.toLocaleString()}&ndash;{last.toLocaleString()} of {total.toLocaleString()}
        <span className="pager__of"> &middot; page {page} of {pages.toLocaleString()}</span>
      </p>

      {page < pages ? (
        <Link className="b b--2 b--sm" href={buildBoardHref(withPage(q, page + 1))} rel="next">
          Next
        </Link>
      ) : (
        <span className="b b--2 b--sm" aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
