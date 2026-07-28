"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { CategoryIconMap } from "./CategoryIcons";

/**
 * The one selectable category control.
 *
 * Every category question in Ponte is the same question in a different
 * vocabulary: here is a set of recognisable things, choose the one (or the
 * several) that describe what you are doing. Writing that once means Find, the
 * composer, Explore and account editing cannot drift into asking it three
 * different ways, and it means the keyboard and screen-reader behaviour is
 * fixed in one place rather than reimplemented per surface.
 *
 * Two selection modes, and they are genuinely different controls:
 *
 *   single    a radiogroup. Exactly one answer, roving tabindex, arrow keys
 *             traverse and select, the group is one tab stop.
 *   multiple  independent checkboxes. Each is its own tab stop, because that
 *             is what a screen-reader user expects of a set of independent
 *             yes/no choices, and arrow-key traversal would be wrong here.
 *
 * Selection never depends on colour alone. A chosen option carries a gold
 * status rule, ink-to-gold title, and the word "Selected" in the corner. Turn
 * the screen greyscale and all three survive.
 */

export interface PickerOption {
  key: string;
  label: string;
  description?: string;
  /** The lookup used against the icon map. Defaults to `key`. */
  iconKey?: string;
  isOther?: boolean;
}

interface CommonProps {
  options: readonly PickerOption[];
  /** Server-rendered icon nodes. Omit for a list that carries no icons. */
  icons?: CategoryIconMap;
  /** The visible question. Labels the group for assistive technology. */
  legend: string;
  /** Optional sentence under the question. */
  hint?: string;
  /**
   * Show a filter box above the options. Turn this on for a long list; the
   * requirement asks for it where a subcategory list becomes hard to scan.
   * It filters the taxonomy choices and nothing else.
   */
  searchable?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  selectedLabel?: string;
  /** Renders one column regardless of width. Used for second-level lists. */
  dense?: boolean;
  /** Extra content shown directly under the chosen option, e.g. Other's field. */
  children?: ReactNode;
}

type SingleProps = CommonProps & {
  mode: "single";
  value: string | null;
  onChange: (key: string) => void;
};

type MultipleProps = CommonProps & {
  mode: "multiple";
  value: readonly string[];
  onChange: (keys: string[]) => void;
};

export type CategoryPickerProps = SingleProps | MultipleProps;

export default function CategoryPicker(props: CategoryPickerProps) {
  const {
    options,
    icons,
    legend,
    hint,
    searchable = false,
    searchLabel,
    searchPlaceholder,
    emptyLabel,
    selectedLabel = "Selected",
    dense = false,
    children,
  } = props;

  const groupId = useId();
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  /**
   * The filter narrows what is shown; it never reorders. Order is taxonomy
   * order, and taxonomy order puts Other last on purpose, so a filter that
   * ranked by relevance could float the escape route above real categories.
   */
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description ? o.description.toLowerCase().includes(q) : false),
    );
  }, [options, query]);

  const isChosen = (key: string): boolean =>
    props.mode === "single" ? props.value === key : props.value.indexOf(key) >= 0;

  const choose = (key: string): void => {
    if (props.mode === "single") {
      props.onChange(key);
      return;
    }
    const next = props.value.slice();
    const at = next.indexOf(key);
    if (at >= 0) next.splice(at, 1);
    else next.push(key);
    props.onChange(next);
  };

  /**
   * Arrow-key traversal, for the radiogroup only.
   *
   * Four arrows, wrapping at both ends, matching the Bridge primitive so the
   * two structured controls in the product behave identically. Moving the
   * selection also moves focus, which is the documented radiogroup pattern.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (props.mode !== "single") return;
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (keys.indexOf(event.key) < 0) return;
    event.preventDefault();
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const current = shown.findIndex((o) => o.key === props.value);
    const from = current < 0 ? (forward ? -1 : 0) : current;
    const next = (from + (forward ? 1 : -1) + shown.length) % shown.length;
    const target = shown[next];
    if (!target) return;
    props.onChange(target.key);
    const node = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-option="${cssEscape(target.key)}"]`,
    );
    node?.focus();
  };

  /** The single tab stop in a radiogroup: the chosen option, or the first. */
  const rovingIndex = (key: string, index: number): number => {
    if (props.mode !== "single") return 0;
    if (props.value) return props.value === key ? 0 : -1;
    return index === 0 ? 0 : -1;
  };

  return (
    <div className="pcat">
      <div className="pcat__head">
        <p className="pcat__legend" id={`${groupId}-legend`}>
          {legend}
        </p>
        {hint && <p className="pcat__hint">{hint}</p>}
      </div>

      {searchable && (
        <div className="pcat__filter">
          <label className="pcat__filterl" htmlFor={`${groupId}-filter`}>
            {searchLabel ?? "Filter these options"}
          </label>
          <input
            id={`${groupId}-filter`}
            className="pcat__filteri"
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div
        ref={listRef}
        className={`pcat__grid${dense ? " pcat__grid--dense" : ""}`}
        role={props.mode === "single" ? "radiogroup" : "group"}
        aria-labelledby={`${groupId}-legend`}
        onKeyDown={onKeyDown}
      >
        {shown.map((option, index) => {
          const chosen = isChosen(option.key);
          const icon = icons ? icons[option.iconKey ?? option.key] : undefined;
          return (
            <button
              key={option.key}
              type="button"
              data-option={option.key}
              className={`pcat__opt${option.isOther ? " pcat__opt--other" : ""}`}
              role={props.mode === "single" ? "radio" : "checkbox"}
              aria-checked={chosen}
              tabIndex={rovingIndex(option.key, index)}
              onClick={() => choose(option.key)}
            >
              <span className="pcat__mark" aria-hidden="true" />
              <span className="pcat__ico" aria-hidden="true">
                {icon ?? null}
              </span>
              <span className="pcat__body">
                <span className="pcat__t">{option.label}</span>
                {option.description && <span className="pcat__d">{option.description}</span>}
              </span>
              {/*
                The third, non-colour signal that this option is the chosen one.
                Hidden from assistive technology because aria-checked already
                says it, and hearing "Selected" after "selected" is noise.
              */}
              {chosen && (
                <span className="pcat__on" aria-hidden="true">
                  {selectedLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {shown.length === 0 && <p className="pcat__none">{emptyLabel ?? "No option matches that."}</p>}

      {children}
    </div>
  );
}

/**
 * Enough escaping for a taxonomy key in an attribute selector.
 *
 * Keys are lower-case letters, digits, dots and underscores by construction, so
 * the only character the selector grammar objects to is the dot. `CSS.escape`
 * would be the general answer and is not available during server rendering,
 * and this runs on both.
 */
function cssEscape(value: string): string {
  return value.replace(/\./g, "\\.");
}
