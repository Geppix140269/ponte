import { Link } from "@/i18n/navigation";
import { buildBoardHref, effectiveSort, withSort, type BoardSort, type FindQuery } from "@/lib/find/query";

/**
 * The orderings that are actually implemented, and only those.
 *
 * Relevance is offered only while there is a query, because relevance to
 * nothing is not a definition. A control that appears, is selectable and then
 * silently behaves as Newest is worse than an absent control: it teaches a
 * member that Ponte's controls do not do what they say.
 */
export default function SortLinks({ q, disabled }: { q: FindQuery; disabled?: boolean }) {
  const options: Array<{ key: BoardSort; label: string }> = q.q
    ? [
        { key: "relevance", label: "Relevance" },
        { key: "newest", label: "Newest" },
        { key: "oldest", label: "Oldest" },
      ]
    : [
        { key: "newest", label: "Newest" },
        { key: "oldest", label: "Oldest" },
      ];

  const active = effectiveSort(q);

  return (
    <div className="sortlinks">
      <span className="sortlinks__l mono">Order</span>
      {options.map((option) => {
        const current = option.key === active;
        return current || disabled ? (
          <span
            key={option.key}
            className="sortlinks__o sortlinks__o--on"
            aria-current={current ? "true" : undefined}
          >
            {option.label}
          </span>
        ) : (
          <Link
            key={option.key}
            className="sortlinks__o"
            href={buildBoardHref(withSort(q, option.key))}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
