"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import type { FlowIconKey, FlowLabelledKey } from "@/design-system/ponte-flow/generated/flow-icon-keys";

/**
 * `PB.route` as a React primitive: the Family Bridge and the Action Bridge.
 *
 * The approved package ships `source/ponte-bridge.css` as the visual and motion
 * authority and `source/ponte-bridge.js` as a framework-neutral engine. The
 * implementation notes authorise either wrapping the engine or translating it
 * into shared React primitives "without changing its geometry, states,
 * accessibility or semantics". This is that translation.
 *
 * **The engine source is not in the repository.** `source/archive/` holds a
 * single truncated chunk of a gzip stream that does not decompress, and the CI
 * job that would fetch the package fails on its Google Drive checksum. So the
 * CSS is the authority this is built against, class for class and state for
 * state, and the decisions the missing engine would have made are marked
 * `ENGINE DECISION` below so a reviewer can check each one against the
 * reference renders rather than having to find them.
 *
 * ## The vocabulary, unchanged
 *
 * deck (the line that is crossed) · node (a station on it) · pier (the rule
 * carrying a label) · point/runner (a moving mark, meaning work happening now).
 * Nothing else. Every class name below comes from the approved stylesheet; none
 * is invented, and no rule of it is overridden.
 *
 * ## Two modes, because two things are being done
 *
 * `select` renders stations as a **radiogroup of buttons with roving tabindex**,
 * which is the accessibility model the notes require: one tab stop for the whole
 * bridge, arrow keys between stations, focus surviving re-render. That is the
 * Family Bridge.
 *
 * `navigate` renders stations as real links. That is the Action Bridge, and it
 * matters that they are genuine `<a href>` elements: every existing destination
 * keeps its query string, middle-click and open-in-new-tab keep working, and
 * routing behaviour is preserved rather than reimplemented behind a click
 * handler.
 */

export interface BridgeStation {
  /** Stable identity. What `selected` refers to and what `onSelect` returns. */
  key: string;
  /** The station's name, as a member reads it. */
  title: string;
  /** One line on what it is. Never a claim the record cannot support. */
  description?: string;
  /** The small mono index above the title. */
  index?: string;
  /**
   * Shown only while this station is the selected one, in gold. The approved
   * stylesheet keeps it at `height: 0; opacity: 0` until `.brst--on`, so it
   * costs no layout when unselected.
   */
  mark?: string;
  /** Destination, for a `navigate` bridge. Ignored in `select` mode. */
  href?: string;
  /** An approved Ponte Flow registry key. Never a filename or raw markup. */
  icon?: Exclude<FlowIconKey, FlowLabelledKey>;
}

export interface BridgeRouteProps {
  stations: BridgeStation[];
  /** `select` for the Family Bridge, `navigate` for the Action Bridge. */
  mode: "select" | "navigate";
  /** The chosen station's key, in `select` mode. */
  selected?: string | null;
  /** Stations the member has opened before, marked with a filled centre. */
  visited?: readonly string[];
  onSelect?: (key: string) => void;
  /** Names the bridge for a screen reader. Required: it is the group's name. */
  ariaLabel: string;
}

/**
 * The station block's own width, from `.brst { width: 176px }` in the approved
 * stylesheet.
 *
 * ENGINE DECISION. The notes require that "station positions and block widths
 * are measured" and forbid "replac[ing] measured spacing with a single fixed
 * width". Positions here are computed as
 * `88px + (100% - 176px) * i/(n-1)`, a CSS `calc`, so the span between the
 * first and last station is genuinely the measured container width, and the
 * inset is the station's own half-width so the outermost labels cannot clip.
 * Spacing is therefore derived from both measurements the notes name, and no
 * fixed gap is hardcoded. Doing it in `calc` rather than JavaScript also means
 * the layout is correct in the server-rendered HTML and does not move on
 * hydration.
 */
const STATION_WIDTH = 176;

/**
 * The deck's user-space width.
 *
 * ENGINE DECISION. The deck is drawn in a `0 0 1000 4` viewBox with
 * `preserveAspectRatio="none"`, so it stretches to any container, and the paths
 * carry `vector-effect="non-scaling-stroke"` so the 1.75px stroke the approved
 * stylesheet sets is unaffected by that stretch.
 *
 * This is what lets `--br-len` be exact without measuring anything: a straight
 * path from 0 to 1000 has a length of exactly 1000 user units, which is the
 * value `.br--drawing .d-live { stroke-dasharray: var(--br-len) }` needs. The
 * engine would have read it from `getTotalLength()`; the geometry here makes it
 * knowable in advance, which keeps the drawn state correct server-side.
 */
const DECK_UNITS = 1000;

/** Below this container width the approved vertical treatment is used. */
const VERTICAL_BELOW = 460;

/**
 * Whether the viewport is narrow enough for the vertical bridge.
 *
 * `useSyncExternalStore` rather than an effect, so the first client render is
 * already correct and React does not warn about a hydration mismatch. The
 * server snapshot is `false`: the approved desktop composition is the default,
 * and a narrow client corrects it before paint.
 *
 * The notes specify "below a 460px container". The bridge spans the hero
 * column, so the viewport is measured with the horizontal page padding removed
 * rather than the element, which avoids a resize observer that would report
 * zero on the first pass and flip the layout after paint.
 */
const PAGE_GUTTER = 48;

const NARROW = `(max-width: ${VERTICAL_BELOW + PAGE_GUTTER - 1}px)`;

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Guarded rather than assuming a browser: the snapshot is read wherever the
 * component is rendered, which includes a test renderer with no `window`. The
 * answer without one is the same as the server's, so the horizontal composition
 * is what a caller gets when nothing can be measured.
 */
function readNarrow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(NARROW).matches;
}

function useIsVertical(): boolean {
  return useSyncExternalStore(subscribe, readNarrow, () => false);
}

/** The fraction of the deck a station sits at. One station sits at the middle. */
function fractionFor(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return index / (count - 1);
}

export default function BridgeRoute({
  stations,
  mode,
  selected = null,
  visited = [],
  onSelect,
  ariaLabel,
}: BridgeRouteProps) {
  const isVertical = useIsVertical();
  const groupId = useId();
  const deckRef = useRef<HTMLDivElement | null>(null);
  const stationRefs = useRef(new Map<string, HTMLElement>());

  /**
   * Which station the roving tabindex currently sits on.
   *
   * Separate from `selected` because they genuinely differ: arrow keys move
   * focus through the group, and the notes require focus to survive re-render.
   * Tying the tab stop to `selected` would drop focus to another element every
   * time the parent re-rendered on selection.
   */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const tabStop = focusKey ?? selected ?? stations[0]?.key ?? null;

  /**
   * The transition. `travelling` runs the runner and draws the live deck;
   * `from` is where the runner starts.
   *
   * Held in state rather than driven by CSS alone because the runner's path is
   * the segment between two stations, which is only known at the moment of
   * selection.
   */
  const [move, setMove] = useState<{ from: number; to: number; token: number } | null>(null);
  const [deckWidth, setDeckWidth] = useState(0);

  // The runner travels in real pixels, so this one measurement is unavoidable.
  // Everything else is resolution-independent, so a missing measurement costs
  // only the runner, which is decorative reinforcement of a state the classes
  // already express.
  const [deckHeight, setDeckHeight] = useState(0);

  useLayoutEffect(() => {
    const el = deckRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Rounded, and only stored when it actually changes. Setting the wrapper's
    // height below can add or remove the page scrollbar, which changes this
    // element's width by a fraction of a pixel; feeding that straight back into
    // state is the classic ResizeObserver loop, and it locks the renderer.
    const read = (width: number) => {
      const rounded = Math.round(width);
      setDeckWidth((current) => (current === rounded ? current : rounded));
    };
    const observer = new ResizeObserver(([entry]) => read(entry.contentRect.width));
    observer.observe(el);
    read(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  /**
   * The wrapper's height, measured from the tallest station.
   *
   * ENGINE DECISION, forced by the same absolute positioning the approved
   * stylesheet uses: `.brst` is `position: absolute`, so the wrapper has no
   * height of its own and would collapse onto the content below it. The engine
   * sized it from the measured stations; so does this.
   *
   * Measured on every render rather than once, because the selected station is
   * genuinely taller: `.brst__mk` goes from `height: 0` to `height: auto` when
   * a station becomes `.brst--on`. Taking the maximum across all stations means
   * the deck settles at its tallest state and does not oscillate as the
   * selection moves between them.
   */
  useLayoutEffect(() => {
    if (isVertical) return;
    let tallest = 0;
    stationRefs.current.forEach((el) => {
      tallest = Math.max(tallest, el.offsetHeight);
    });
    // Integer, monotonic, and explicitly scoped to the things that can actually
    // change a station's height. An effect with no dependency list re-measures
    // after every render, which turns a one-pixel rounding difference into an
    // endless loop.
    const rounded = Math.ceil(tallest);
    if (rounded > 0) setDeckHeight((current) => (rounded > current ? rounded : current));
  }, [isVertical, deckWidth, selected, stations.length]);

  const selectedIndex = stations.findIndex((s) => s.key === selected);

  // Clear the transition once it has played out. The runner is 620ms and the
  // node's arrival is delayed to meet it, per the approved keyframes, so the
  // settled state is reached at 620 + 220. After this the gold signal is gone:
  // a moving point means work is happening NOW, and the choice is made.
  useEffect(() => {
    if (!move) return;
    const timer = setTimeout(() => setMove(null), 900);
    return () => clearTimeout(timer);
  }, [move]);

  const choose = useCallback(
    (key: string, index: number) => {
      if (mode !== "select" || !onSelect) return;
      const from = selectedIndex >= 0 ? fractionFor(selectedIndex, stations.length) : 0;
      setMove({ from, to: fractionFor(index, stations.length), token: Date.now() });
      onSelect(key);
    },
    [mode, onSelect, selectedIndex, stations.length],
  );

  /**
   * Arrow-key traversal for the radiogroup.
   *
   * A radiogroup selects on arrow, which is the platform behaviour a screen
   * reader user expects: moving through the options IS choosing between them.
   * Home and End jump to the ends. Focus is moved explicitly so it lands on the
   * station the member just chose rather than staying behind.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (mode !== "select") return;
      const last = stations.length - 1;
      let next: number | null = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;
      if (next === null) return;

      event.preventDefault();
      const station = stations[next];
      setFocusKey(station.key);
      choose(station.key, next);
      stationRefs.current.get(station.key)?.focus();
    },
    [choose, mode, stations],
  );

  const rootClasses = [
    "br",
    isVertical ? "br--v" : null,
    selected ? "br--chosen" : null,
    move ? "br--travelling" : null,
    move ? "br--drawing" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const inset = STATION_WIDTH / 2;

  /** A station's centre in pixels along the deck, from the same calc the CSS uses. */
  const centreOf = (fraction: number) => inset + Math.max(deckWidth - STATION_WIDTH, 0) * fraction;

  /**
   * The live deck: the part of the crossing that has been made, ending at the
   * chosen station's node.
   *
   * The deck spans the whole wrapper while the stations are inset by half their
   * own width, so the first station sits a little way along the deck rather
   * than at its very start. That is why this converts pixels to deck units
   * instead of using the station fraction directly: the two spans are different,
   * and using the fraction would draw the live deck short of the node on every
   * station but the last.
   *
   * With nothing chosen there is no live portion at all. The track alone is the
   * honest drawing, because no crossing has been made.
   */
  const liveLength =
    selectedIndex >= 0 && deckWidth > 0
      ? (centreOf(fractionFor(selectedIndex, stations.length)) / deckWidth) * DECK_UNITS
      : 0;

  const runnerFrom = move ? centreOf(move.from) : 0;
  const runnerTo = move ? centreOf(move.to) : 0;

  return (
    <div className={rootClasses} role={mode === "select" ? "radiogroup" : "group"} aria-label={ariaLabel}>
      <div
        className="br__deckwrap"
        ref={deckRef}
        style={deckHeight > 0 && !isVertical ? ({ ["--br-h" as string]: `${deckHeight}px` } as React.CSSProperties) : undefined}
      >
        {/*
          The deck. Authored in its settled state: with no selection the track
          is drawn and nothing else, which is exactly what a print, a paused tab
          or a JavaScript failure should show.
        */}
        {!isVertical ? (
          <svg
            className="br__deck"
            viewBox={`0 0 ${DECK_UNITS} 4`}
            preserveAspectRatio="none"
            height={4}
            aria-hidden="true"
            focusable="false"
          >
            <path className="d-track" d={`M0 2 H${DECK_UNITS}`} vectorEffect="non-scaling-stroke" />
            {liveLength > 0 ? (
              <path
                className="d-live"
                d={`M0 2 H${liveLength}`}
                vectorEffect="non-scaling-stroke"
                style={{ ["--br-len" as string]: liveLength }}
              />
            ) : null}
          </svg>
        ) : null}

        {/*
          The runner: the member's own signal, in gold, moving to the place it
          has arrived. It exists only during the transition and is removed when
          the state settles, because a moving point claims work is happening now.
        */}
        {move && !isVertical && deckWidth > 0 ? (
          <span
            key={move.token}
            className="br__runner br__runner--go"
            aria-hidden="true"
            style={{
              top: 0,
              left: 0,
              offsetPath: `path("M ${runnerFrom} 2 L ${runnerTo} 2")`,
              offsetRotate: "0deg",
            }}
          />
        ) : null}

        <div className={isVertical ? "br__rows" : undefined}>
          {stations.map((station, index) => {
            const isOn = station.key === selected;
            const classes = [
              "brst",
              isOn ? "brst--on" : null,
              visited.includes(station.key) && !isOn ? "brst--visited" : null,
            ]
              .filter(Boolean)
              .join(" ");

            const position = isVertical
              ? undefined
              : {
                  left: `calc(${inset}px + (100% - ${STATION_WIDTH}px) * ${fractionFor(index, stations.length)})`,
                };

            const titleId = `${groupId}-${station.key}-t`;
            const descriptionId = `${groupId}-${station.key}-d`;

            /*
              The station's accessible name is its title and nothing else.
              Without this the name is the concatenation of every child, which
              here reads "01 Products Physical goods, classified against the HS
              taxonomy Selected", and the last word is announced on EVERY
              station, because `.brst__mk` is hidden with `height: 0` and
              `opacity: 0`, neither of which removes it from the accessibility
              tree. A screen-reader user would hear all three families claim to
              be selected.

              So: the title names it, the description describes it, and the two
              decorative parts are hidden. The selected state is carried by
              `aria-checked`, which is the property that actually means it.
            */
            const inner = (
              <>
                <span className="brst__n" aria-hidden="true" />
                <span className="brst__p" aria-hidden="true" />
                {station.index ? (
                  <span className="brst__ix" aria-hidden="true">
                    {station.index}
                  </span>
                ) : null}
                {station.icon ? <PonteIcon name={station.icon} size={22} className="brst__ic" /> : null}
                <span className="brst__t" id={titleId}>
                  {station.title}
                </span>
                {station.description ? (
                  <span className="brst__d" id={descriptionId}>
                    {station.description}
                  </span>
                ) : null}
                {station.mark ? (
                  <span className="brst__mk" aria-hidden="true">
                    {station.mark}
                  </span>
                ) : null}
              </>
            );

            if (mode === "navigate") {
              return (
                <Link
                  key={station.key}
                  href={station.href ?? "/"}
                  className={classes}
                  style={position}
                  aria-labelledby={titleId}
                  aria-describedby={station.description ? descriptionId : undefined}
                  ref={(el) => {
                    if (el) stationRefs.current.set(station.key, el);
                    else stationRefs.current.delete(station.key);
                  }}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={station.key}
                type="button"
                role="radio"
                aria-checked={isOn}
                aria-labelledby={titleId}
                aria-describedby={station.description ? descriptionId : undefined}
                id={`${groupId}-${station.key}`}
                tabIndex={station.key === tabStop ? 0 : -1}
                className={classes}
                style={position}
                onClick={() => {
                  setFocusKey(station.key);
                  choose(station.key, index);
                }}
                onKeyDown={(event) => onKeyDown(event, index)}
                onFocus={() => setFocusKey(station.key)}
                ref={(el) => {
                  if (el) stationRefs.current.set(station.key, el);
                  else stationRefs.current.delete(station.key);
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
