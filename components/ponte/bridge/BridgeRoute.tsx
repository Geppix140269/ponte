"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import type { FlowIconKey, FlowLabelledKey } from "@/design-system/ponte-flow/generated/flow-icon-keys";
import {
  BASE_PIER,
  DECK_HEIGHT,
  GUTTER,
  VERTICAL_BELOW,
  blockWidth,
  deckBaseline,
  deckPath,
  elevationPath,
  elevationX,
  stationFractions,
  subPath,
} from "./geometry";

/**
 * `PB.route` as a React primitive: the Family Bridge and the Action Bridge.
 *
 * ## This is a translation of the recovered engine, not an interpretation
 *
 * The first version of this component was written without
 * `design/authority/bridge/v1/source/ponte-bridge.js`, which was missing from
 * the repository, and drew the deck as a straight horizontal rule. **The owner
 * rejected that**: a straight line is not the Ponte bridge, and eight decisions
 * marked `ENGINE DECISION` were guesses standing in for an authority.
 *
 * The approved package has since been recovered and every one of its sixteen
 * files now matches `SOURCE-MANIFEST.md` byte for byte. So the geometry below
 * is the engine's own:
 *
 * - the deck is a **cubic Bezier arch**, not a line;
 * - stations sit at **non-uniform fractions of the path length**, measured with
 *   `getPointAtLength`, so they follow the curve and rise with it;
 * - station blocks are **sized from the measured gap** between those points;
 * - each pier lengthens to reach the deck from a **shared label baseline**;
 * - **abutments** cap both ends, because a crossing begins and ends somewhere;
 * - the gold runner travels on `offset-path` built from **the same curve**, not
 *   a straight overlay.
 *
 * The implementation notes authorise exactly this: "wrap the engine or translate
 * it into shared React primitives without changing its geometry, states,
 * accessibility or semantics".
 *
 * ## Where the geometry lives
 *
 * The arithmetic is in `./geometry.ts` so it can be tested against the engine's
 * own numbers. This file measures the container, asks that module where things
 * go, and positions them. React owns the DOM, state and accessibility; it does
 * not own the shape.
 *
 * ## Two modes
 *
 * `select` renders a **radiogroup of buttons with roving tabindex**: one tab
 * stop, arrow keys within. `navigate` renders real links, so every destination
 * keeps its query string and its middle-click.
 */

export interface BridgeStation {
  key: string;
  title: string;
  /** One line on what it is. Never a claim the record cannot support. */
  description?: string;
  /** The small mono index. Engine default: `01 · UNIT`. */
  index?: string;
  /** Shown in gold only while this station is chosen. */
  mark?: string;
  /** Destination, for a `navigate` bridge. */
  href?: string;
  /**
   * An optional Ponte Flow marker, per ADR-0019.
   *
   * The approved package has no icon slot, so this is the implementation-layer
   * `brst__i` marker styled in `bridge-integration.css`, and ADR-0019 bounds it:
   * classification stations only, a registry key and nothing else, inheriting
   * `currentColor`, never the only carrier of meaning. The type excludes the
   * nine labelled keys because the title is always beside the marker.
   */
  icon?: Exclude<FlowIconKey, FlowLabelledKey>;
}

export interface BridgeRouteProps {
  stations: BridgeStation[];
  mode: "select" | "navigate";
  selected?: string | null;
  visited?: readonly string[];
  onSelect?: (key: string) => void;
  ariaLabel: string;
  /** The abutment where the crossing begins. Engine: `o.left`. */
  left?: string;
  /** The abutment where it ends. Engine: `o.right`. */
  right?: string;
  /** Draws the far abutment as a reserved crossing. Engine: `o.rightDashed`. */
  rightDashed?: boolean;
  /**
   * A note about the number of stations, where that needs saying.
   *
   * Engine: `o.count`, appended inside the bridge below the stage. The approved
   * stylesheet's `.br > .brx__empty` right-aligns it there, which is why it is a
   * child of this component rather than of the section around it.
   */
  countNote?: string | null;
  /**
   * Draw the elevation at every width, not only on a narrow viewport.
   *
   * For a bridge whose station count crowds its labels at the width it is
   * given. Seven stations in the composer column put "Worldwide" hard against
   * "Online only", which is a collision rather than a layout. The elevation is
   * the same approved drawing; this only changes what decides to use it.
   */
  alwaysVertical?: boolean;
}

const NARROW = `(max-width: ${VERTICAL_BELOW - 1}px)`;

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readNarrow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(NARROW).matches;
}

function useIsVertical(): boolean {
  return useSyncExternalStore(subscribe, readNarrow, () => false);
}

const SVG_NS = "http://www.w3.org/2000/svg";

export default function BridgeRoute({
  stations,
  mode,
  selected = null,
  visited = [],
  onSelect,
  ariaLabel,
  left,
  right,
  rightDashed,
  countNote = null,
  alwaysVertical = false,
}: BridgeRouteProps) {
  // The elevation is normally the narrow-viewport drawing, but a bridge with
  // enough stations crowds its labels long before the viewport gets narrow: at
  // seven stations in a composer column the labels of adjacent stations touch
  // and run together. Such a bridge asks for the elevation at every width. It
  // is the same approved drawing, chosen by the station count rather than by
  // the viewport.
  const isVertical = useIsVertical() || alwaysVertical;
  const groupId = useId();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const deckRef = useRef<SVGSVGElement | null>(null);
  const rowsRef = useRef<HTMLDivElement | null>(null);
  const stationRefs = useRef(new Map<string, HTMLElement>());

  const [focusKey, setFocusKey] = useState<string | null>(null);
  const tabStop = focusKey ?? selected ?? stations[0]?.key ?? null;

  /** Bumped on every selection so the runner remounts and replays. */
  const [travel, setTravel] = useState(0);
  /** Forces a re-measure when the container resizes. */
  const [width, setWidth] = useState(0);

  const selectedIndex = stations.findIndex((s) => s.key === selected);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = (value: number) => {
      const rounded = Math.round(value);
      setWidth((current) => (current === rounded ? current : rounded));
    };
    const observer = new ResizeObserver(([entry]) => read(entry.contentRect.width));
    observer.observe(el);
    read(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  /**
   * The desktop drawing.
   *
   * Measurement uses a real `<path>` and `getPointAtLength`, exactly as the
   * engine's `measure()` does. There is no closed form for a point at a given
   * arc length on a cubic Bezier, so this is not an optimisation that was
   * skipped: it is the only way to place a station ON the curve rather than
   * near it.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const deck = deckRef.current;
    if (isVertical || !stage || !deck) return;

    const W = Math.max(stage.clientWidth || 960, 320);
    const H = DECK_HEIGHT;
    const y0 = deckBaseline(H);
    const d = deckPath(W, H);

    // A detached path is enough for getPointAtLength in every browser that
    // supports it, and avoids the engine's temporary document-body insert.
    // Verified 31 July 2026 in Firefox 153 and Chromium 151: both return the
    // same length for the same deck, to three decimal places.
    const probe = document.createElementNS(SVG_NS, "path");
    probe.setAttribute("d", d);
    const L = probe.getTotalLength();

    /*
      A deck that cannot be measured places every station at the same point.

      Each station is `position: absolute` with no coordinates of its own, so
      the numbers written below are the only thing that separates them. If `L`
      comes back as 0 or NaN, `at()` returns the same point for every fraction
      and all three stations land on top of one another at the left, with the
      stage still at zero height and the section beneath drawn over them.

      Returning here leaves `data-measured` unset, which is what keeps the
      pre-measurement layout in `bridge-integration.css` in place. An
      unmeasurable deck therefore reads as a plain row of stations rather than
      as a pile of overlapping text. The measurement is retried on the next
      resize, selection or station change like any other run of this effect.
    */
    if (!Number.isFinite(L) || L <= 0) return;

    deck.setAttribute("viewBox", `0 0 ${W} ${H}`);
    deck.setAttribute("width", String(W));
    deck.setAttribute("height", String(H));
    deck.textContent = "";

    const at = (t: number) => {
      const point = probe.getPointAtLength(L * Math.max(0, Math.min(1, t)));
      return { x: point.x, y: point.y };
    };

    const track = document.createElementNS(SVG_NS, "path");
    track.setAttribute("class", "d-track");
    track.setAttribute("d", d);
    deck.appendChild(track);

    const fractions = stationFractions(stations.length);
    let livePath: string | null = null;
    if (selectedIndex > -1) {
      livePath = subPath(at, 0, fractions[selectedIndex]);
      const live = document.createElementNS(SVG_NS, "path");
      live.setAttribute("class", "d-live");
      live.setAttribute("d", livePath);
      deck.appendChild(live);
    }

    const points = fractions.map(at);
    const stationWidth = blockWidth(points);
    const baseline = Math.max(...points.map((p) => p.y));

    stations.forEach((station, index) => {
      const el = stationRefs.current.get(station.key);
      if (!el) return;
      const point = points[index];
      el.style.width = `${stationWidth}px`;
      el.style.left = `${point.x.toFixed(1)}px`;
      el.style.top = `${(point.y - 7.5).toFixed(1)}px`;
      const pier = el.querySelector<HTMLElement>(".brst__p");
      if (pier) pier.style.height = `${(BASE_PIER + baseline - point.y).toFixed(1)}px`;
    });

    // Abutment labels must clear the outermost station block on their own side.
    const leftWidth = Math.max(44, Math.min(150, points[0].x - stationWidth / 2 - 12));
    const rightWidth = Math.max(44, Math.min(150, W - points[points.length - 1].x - stationWidth / 2 - 12));
    stage.querySelectorAll<HTMLElement>(".br__ab--l").forEach((a) => {
      a.style.top = `${y0}px`;
      a.style.width = `${leftWidth}px`;
    });
    stage.querySelectorAll<HTMLElement>(".br__ab--r").forEach((a) => {
      a.style.top = `${y0}px`;
      a.style.width = `${rightWidth}px`;
    });

    // The runner rides the live segment itself, so the gold signal is on the
    // arc rather than on a straight line drawn between the same two points.
    const runner = stage.querySelector<HTMLElement>(".br__runner");
    if (runner && livePath) {
      runner.style.offsetPath = `path("${livePath}")`;
      runner.style.offsetRotate = "0deg";
      runner.style.left = "-4.5px";
      runner.style.top = "-4.5px";
    }

    /*
      The stage carries absolutely positioned children, so it has no height of
      its own. The engine's `fit` sets it from the lowest child, and `fitLater`
      repeats that once fonts have settled, because a label that reflows after
      a webfont loads would otherwise overlap the section beneath the bridge.
    */
    const fit = () => {
      let bottom = 0;
      Array.from(stage.children).forEach((child) => {
        if (child.tagName.toLowerCase() === "svg") return;
        const node = child as HTMLElement;
        bottom = Math.max(bottom, (node.offsetTop || 0) + (node.offsetHeight || 0));
      });
      if (bottom > 0) stage.style.height = `${bottom + 2}px`;
    };
    fit();

    /*
      Every station now carries a real left, top and width, so the stage may
      hand over from the pre-measurement layout to the approved drawing.

      The attribute ships in the server HTML and is REMOVED here, rather than
      being added here, for two reasons.

      It fails safe. Anything that stops this effect short - an unmeasurable
      deck above, a bundle that never loaded, a client that never hydrated -
      leaves the attribute exactly where the server put it, and the fallback in
      `bridge-integration.css` stays in force. A flag that had to be ADDED to
      trigger the fallback would be absent in precisely the case it exists for.

      And it scopes itself. `DealRoomBridge` renders the same `.br__stage` class
      and measures it its own way; it does not render this attribute, so no rule
      below can reach it.

      It is removed last, after `fit()`, because it is a statement that the
      numbers are already on the elements. Removing it earlier would hand over
      to a drawing that had not been positioned yet.
    */
    delete stage.dataset.unmeasured;

    const frame = requestAnimationFrame(fit);
    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        if (!cancelled) fit();
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [isVertical, width, selected, selectedIndex, stations, left, right]);

  /**
   * The elevation drawing: the mobile bridge.
   *
   * One bowed route with a cap at each end, every node placed ON the curve and
   * each pier reaching from its node across to the label column. The engine's
   * comment on this function is the rule it enforces: "No component may draw its
   * own vertical deck: that is how three of them ended up as straight rules."
   */
  useLayoutEffect(() => {
    const rows = rowsRef.current;
    if (!isVertical || !rows) return;

    const draw = () => {
      // Belt and braces alongside the keys above: the rows box must always size
      // itself from its stations. If anything ever puts a height on it, the last
      // station overflows onto whatever follows the bridge, which is a failure
      // the engine's own `fit` comment warns about in the other direction.
      rows.style.removeProperty("height");
      const H = rows.offsetHeight;
      if (!H) return;
      let svg = rows.querySelector<SVGSVGElement>(".br__vsvg");
      if (!svg) {
        svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        svg.setAttribute("class", "br__deck br__vsvg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        rows.insertBefore(svg, rows.firstChild);
      }
      svg.setAttribute("viewBox", `0 0 ${GUTTER} ${H}`);
      svg.setAttribute("width", String(GUTTER));
      svg.setAttribute("height", String(H));
      svg.style.cssText = `position:absolute;left:0;top:0;width:${GUTTER}px;height:${H}px`;
      svg.textContent = "";

      const track = document.createElementNS(SVG_NS, "path");
      track.setAttribute("class", "d-track");
      track.setAttribute("d", elevationPath(0, H, H));
      svg.appendChild(track);

      [1.2, H - 1.2].forEach((y) => {
        const cap = document.createElementNS(SVG_NS, "line");
        cap.setAttribute("class", "cap");
        cap.setAttribute("x1", (elevationX(y, H) - 5.5).toFixed(1));
        cap.setAttribute("y1", y.toFixed(1));
        cap.setAttribute("x2", (elevationX(y, H) + 5.5).toFixed(1));
        cap.setAttribute("y2", y.toFixed(1));
        svg.appendChild(cap);
      });

      let selectedTop: number | null = null;
      stations.forEach((station) => {
        const el = stationRefs.current.get(station.key);
        const node = el?.querySelector<HTMLElement>(".brst__n");
        if (!el || !node) return;
        const y = el.offsetTop + 9;
        const x = elevationX(y, H);
        node.style.left = `${(x - GUTTER - node.offsetWidth / 2).toFixed(1)}px`;
        const pier = el.querySelector<HTMLElement>(".brst__p");
        if (pier) {
          pier.style.left = `${(x - GUTTER + 7).toFixed(1)}px`;
          pier.style.width = `${Math.max(8, GUTTER - 6 - (x + 7)).toFixed(1)}px`;
        }
        if (station.key === selected) selectedTop = y;
      });

      if (selectedTop !== null) {
        const live = document.createElementNS(SVG_NS, "path");
        live.setAttribute("class", "d-live");
        live.setAttribute("d", elevationPath(0, selectedTop, H));
        svg.appendChild(live);
      }
    };

    const frame = requestAnimationFrame(draw);
    draw();
    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        if (!cancelled) draw();
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [isVertical, width, selected, stations]);

  // The travelling classes come off once the crossing has played, so the gold
  // signal stops. A moving point means work is happening now.
  useEffect(() => {
    if (travel === 0) return;
    const timer = setTimeout(() => setTravel(0), 900);
    return () => clearTimeout(timer);
  }, [travel]);

  const choose = useCallback(
    (key: string) => {
      if (mode !== "select" || !onSelect) return;
      setTravel((n) => n + 1);
      onSelect(key);
    },
    [mode, onSelect],
  );

  /**
   * Arrow-key traversal, matching the engine exactly: only the four arrows,
   * always preventing default, wrapping at both ends, moving focus and
   * selection together.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (mode !== "select") return;
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
      const next = stations[(index + (forward ? 1 : stations.length - 1)) % stations.length];
      setFocusKey(next.key);
      choose(next.key);
      stationRefs.current.get(next.key)?.focus();
    },
    [choose, mode, stations],
  );

  const rootClasses = [
    "br",
    isVertical ? "br--v" : null,
    selected ? "br--chosen" : null,
    travel > 0 ? "br--travelling" : null,
    travel > 0 ? "br--drawing" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const renderStation = (station: BridgeStation, index: number) => {
    const isOn = station.key === selected;
    const classes = ["brst", isOn ? "brst--on" : null, visited.includes(station.key) && !isOn ? "brst--visited" : null]
      .filter(Boolean)
      .join(" ");

    const titleId = `${groupId}-${station.key}-t`;
    const descriptionId = `${groupId}-${station.key}-d`;

    /*
      The station's accessible name is its title alone. Without this the name is
      every child concatenated, and `.brst__mk` is hidden with `height: 0` and
      `opacity: 0`, neither of which removes it from the accessibility tree. All
      three families announced themselves as selected.
    */
    const inner = (
      <>
        <span className="brst__n" aria-hidden="true" />
        <span className="brst__p" aria-hidden="true" />
        {/* ADR-0019. The marker hangs off the foot of the pier, so it belongs
            to the crossing rather than sitting inside a box of its own. It is
            inside the single clickable station element, and PonteIcon renders
            it aria-hidden, so the accessible name is still the title alone. */}
        {station.icon ? (
          <span className="brst__i">
            <PonteIcon name={station.icon} size={16} />
          </span>
        ) : null}
        <span className="brst__w" style={{ display: "block" }}>
          {station.index ? (
            <span className="brst__ix" aria-hidden="true">
              {station.index}
            </span>
          ) : null}
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
        </span>
      </>
    );

    const ref = (el: HTMLElement | null) => {
      if (el) stationRefs.current.set(station.key, el);
      else stationRefs.current.delete(station.key);
    };

    if (mode === "navigate") {
      return (
        <Link
          key={station.key}
          href={station.href ?? "/"}
          className={classes}
          data-id={station.key}
          aria-labelledby={titleId}
          aria-describedby={station.description ? descriptionId : undefined}
          ref={ref}
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
        data-id={station.key}
        tabIndex={station.key === tabStop ? 0 : -1}
        className={classes}
        onClick={() => {
          setFocusKey(station.key);
          choose(station.key);
        }}
        onKeyDown={(event) => onKeyDown(event, index)}
        onFocus={() => setFocusKey(station.key)}
        ref={ref}
      >
        {inner}
      </button>
    );
  };

  return (
    <div className={rootClasses} role={mode === "select" ? "radiogroup" : "group"} aria-label={ariaLabel} ref={rootRef}>
      {/*
        The two modes carry distinct keys so React never reuses one's DOM node
        as the other's.

        Without them both branches are a `<div>` in the same position, so React
        keeps the element and swaps its className. The horizontal `fit()` sets an
        inline height on the stage, and after a switch to elevation that height
        survived onto `.br__rows` and clipped it: the rows box stopped 44px short
        of its own content, and the last station's description ran over the
        section below. Which is exactly what it looked like at 390.

        `data-unmeasured` on the stage is the pre-measurement state, and it is
        correct in the server HTML: nothing has measured anything yet. The
        horizontal effect removes it once every station carries a real position.
        Until then `bridge-integration.css` lays the stations out in plain flow,
        so a bridge whose client never ran reads as a row of stations rather
        than as three of them stacked on the same point.
      */}
      {isVertical ? (
        <div key="rows" className="br__rows br__rows--arc" ref={rowsRef}>
          {stations.map(renderStation)}
        </div>
      ) : (
        <div key="stage" className="br__stage" data-unmeasured="" style={{ position: "relative" }} ref={stageRef}>
          <svg
            className="br__deck"
            style={{ position: "absolute", left: 0, top: 0 }}
            aria-hidden="true"
            focusable="false"
            ref={deckRef}
          />
          {left ? (
            <div className="br__ab br__ab--l">
              <i />
              <b>{left}</b>
            </div>
          ) : null}
          {right ? (
            <div className={rightDashed ? "br__ab br__ab--r br__ab--dashed" : "br__ab br__ab--r"}>
              <i />
              <b>{right}</b>
            </div>
          ) : null}
          {stations.map(renderStation)}
          {travel > 0 && selectedIndex > -1 ? (
            <span key={travel} className="br__runner br__runner--go" aria-hidden="true" />
          ) : null}
        </div>
      )}
      {/* In normal flow below the stage: it can never be placed at a guessed
          offset, because station blocks vary in height. */}
      {countNote ? <div className="brx__empty">{countNote}</div> : null}
    </div>
  );
}
