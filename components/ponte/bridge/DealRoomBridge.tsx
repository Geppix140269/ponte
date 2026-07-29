"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  GUTTER,
  VERTICAL_BELOW,
  blockWidth,
  deckPath,
  elevationPath,
  elevationX,
  stationFractions,
  subPath,
} from "./geometry";
import { BRIDGE_MILESTONES, bridgeAriaLabel, type BridgeModel } from "@/lib/deal-room/bridge";
import { MOMENTUM_LABEL } from "@/lib/deal-room/progress";

/**
 * The Multi-party Deal Room Bridge, v1.
 *
 * Commissioned by the owner on issue #97, decision 2, after the Gate A
 * preflight escalated it: Constitution section 8 names this bridge as
 * authoritative, section 24 makes a missing approved component a
 * stop-and-escalate condition, and section 23 forbids substituting cards, tabs
 * or a generic stepper. So this is the commissioned component, not an interim.
 *
 * ## It is a translation of `PB.dealroom`, not an interpretation
 *
 * Every number below is the approved engine's, from
 * `design/authority/bridge/v1/source/ponte-bridge.js` lines 449-507, verified
 * against `SOURCE-MANIFEST.md`. The same mistake was made once on this
 * repository already - a bridge built without the engine drew a straight line
 * and was rejected - so the specifics are worth naming:
 *
 * - deck height **104** and rise **46**, shallower than the other bridges,
 *   because the active milestone is named ABOVE the deck and the arc has to
 *   leave that band clear;
 * - milestone nodes at `stationFractions(n)`, radius **4.4** active and **3.2**
 *   otherwise, stroke width **1.5**, future nodes at opacity **.5**;
 * - only the **active** milestone is named. The engine's own comment is the
 *   reason: "Eight mono labels across one deck cannot be read - and the room's
 *   reader needs the current stage, not a printed list";
 * - participants are **piers below the deck**, placed at
 *   `stationFractions(n + 1).slice(0, n)`, block width capped at **140**, pier
 *   height `(principal ? 30 : 22) + baseline - y`;
 * - below a **460px container** it draws in elevation using the shared drawer,
 *   never its own vertical rule.
 *
 * The one deliberate divergence is the accessible label, and it is argued in
 * `lib/deal-room/bridge.ts`: the implementation notes require the next stage
 * and the not-guaranteed caveat, which the engine's label omits.
 *
 * ## Every class here is in the approved stylesheet
 *
 * `.brd`, `.brdp`, `.brdp__n`, `.brdp__p`, `.brdp__r`, `.brdp__s`,
 * `.brdp__cap`, `.brdp__tag`, `.brd__ms`, `.d-track`, `.d-live`, `.d-fwd`,
 * `.d-blocked`, `.br__pt--halt`, `.brj__state` and its modifiers are all
 * declared in `design/authority/bridge/v1/source/ponte-bridge.css`. Nothing is
 * restyled locally and no new visual convention is introduced.
 *
 * ## Motion
 *
 * The component is authored in its end state, so a paused tab, a print, a
 * screenshot, reduced motion and a JS failure all show correct information. The
 * draw animation plays only when the milestone index actually changes - a
 * durable state transition - and never loops. Reduced motion is a removal:
 * `.br--still` is applied when the user prefers it, and the approved stylesheet
 * turns every animation off and hides the runner.
 */

export interface DealRoomBridgeProps {
  model: BridgeModel;
  /** Where the reader is, e.g. the room reference. Kept short. */
  caption?: string;
}

const NARROW = `(max-width: ${VERTICAL_BELOW - 1}px)`;
const SVG_NS = "http://www.w3.org/2000/svg";

/** Engine: `o.deckH || 104` and `stage(el, H, 46)` in `dealroom`. */
const DECK_HEIGHT = 104;
const DECK_RISE = 46;
/** Engine: `blockW(pts, 140)`. Deal Room participants, not the 176 of a route. */
const PARTICIPANT_BLOCK_MAX = 140;

function subscribeNarrow(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readNarrow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(NARROW).matches;
}

function subscribeMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * This is a client component, but Next server-renders client components too,
 * and React warns - correctly - that a layout effect cannot be encoded into
 * server output. The warning is not cosmetic: it fires on every render of every
 * Deal Room page that carries a bridge, in the build log and in the test output,
 * and a warning that always fires is one nobody reads.
 *
 * Measurement genuinely needs the layout phase, so the effect stays
 * `useLayoutEffect` where it runs. On the server neither branch does anything,
 * because there is no layout to measure and the component is authored in its
 * end state.
 */
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const STATE_CHIP: Record<BridgeModel["condition"], { className: string; label: string } | null> = {
  none: null,
  blocked: { className: "brj__state brj__state--block", label: "Blocked" },
  paused: { className: "brj__state brj__state--halt", label: "Paused" },
  read_only: { className: "brj__state brj__state--off", label: "Read-only" },
};

export default function DealRoomBridge({ model, caption }: DealRoomBridgeProps) {
  const isVertical = useSyncExternalStore(subscribeNarrow, readNarrow, () => false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, readReducedMotion, () => true);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const deckRef = useRef<SVGSVGElement | null>(null);
  const rowsRef = useRef<HTMLDivElement | null>(null);
  const participantRefs = useRef(new Map<number, HTMLElement>());
  const milestoneRef = useRef<HTMLDivElement | null>(null);

  const [width, setWidth] = useState(0);

  /**
   * Draw only when the room actually moved.
   *
   * A re-render caused by anything else must not replay the crossing: motion
   * law says a moving point means work is happening now, so animating on a
   * resize would be a lie about the room.
   */
  const previousAt = useRef<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  useMeasureEffect(() => {
    const changed = previousAt.current !== null && previousAt.current !== model.at;
    previousAt.current = model.at;
    if (!changed || reducedMotion) return;
    setDrawing(true);
    const timer = setTimeout(() => setDrawing(false), 900);
    return () => clearTimeout(timer);
  }, [model.at, reducedMotion]);

  useMeasureEffect(() => {
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

  /* -------------------------------------------------------------- *
   * Desktop: the arched deck, engine `dealroom` non-vertical branch
   * -------------------------------------------------------------- */
  useMeasureEffect(() => {
    const stage = stageRef.current;
    const deck = deckRef.current;
    if (isVertical || !stage || !deck) return;

    const W = Math.max(stage.clientWidth || 960, 320);
    const H = DECK_HEIGHT;
    const d = deckPath(W, H, 1.5, DECK_RISE);

    deck.setAttribute("viewBox", `0 0 ${W} ${H}`);
    deck.setAttribute("width", String(W));
    deck.setAttribute("height", String(H));
    deck.textContent = "";

    const probe = document.createElementNS(SVG_NS, "path");
    probe.setAttribute("d", d);
    const L = probe.getTotalLength();
    const at = (t: number) => {
      const point = probe.getPointAtLength(L * Math.max(0, Math.min(1, t)));
      return { x: point.x, y: point.y };
    };

    const track = document.createElementNS(SVG_NS, "path");
    track.setAttribute("class", "d-track");
    track.setAttribute("d", d);
    deck.appendChild(track);

    const fractions = stationFractions(BRIDGE_MILESTONES.length);
    const reached = fractions[model.at];

    const live = document.createElementNS(SVG_NS, "path");
    live.setAttribute("class", "d-live");
    live.setAttribute("d", subPath(at, 0, reached));
    deck.appendChild(live);

    // The deck ahead. Reserved by default; danger-dashed when the room is
    // blocked, which is exactly what `.d-blocked` exists for and is why a
    // blocked room does not need a station of its own.
    if (model.at < BRIDGE_MILESTONES.length - 1) {
      const forward = document.createElementNS(SVG_NS, "path");
      forward.setAttribute("class", model.condition === "blocked" ? "d-blocked" : "d-fwd");
      forward.setAttribute("d", subPath(at, reached, 1));
      deck.appendChild(forward);
    }

    BRIDGE_MILESTONES.forEach((_, index) => {
      const point = at(fractions[index]);
      const node = document.createElementNS(SVG_NS, "circle");
      node.setAttribute("cx", point.x.toFixed(1));
      node.setAttribute("cy", point.y.toFixed(1));
      node.setAttribute("r", index === model.at ? "4.4" : "3.2");
      node.setAttribute(
        "fill",
        index === model.at ? "var(--pf-gold-ink)" : index < model.at ? "var(--pf-ink)" : "var(--pf-surface)",
      );
      node.setAttribute("stroke", index === model.at ? "var(--pf-gold-ink)" : "var(--pf-ink)");
      node.setAttribute("stroke-width", "1.5");
      node.setAttribute("opacity", index > model.at ? "0.5" : "1");
      deck.appendChild(node);
    });

    // Only the active milestone is named, positioned above its node once the
    // block has a measured height. Engine: the rAF re-position in `dealroom`.
    const label = milestoneRef.current;
    if (label) {
      const point = at(reached);
      label.style.left = `${point.x.toFixed(1)}px`;
      label.style.top = "0px";
      const place = () => {
        label.style.top = `${Math.max(0, point.y - label.offsetHeight - 13).toFixed(1)}px`;
      };
      place();
      requestAnimationFrame(place);
    }

    // Participants: piers below the deck, in the order they joined.
    const points = stationFractions(model.participants.length + 1)
      .slice(0, model.participants.length)
      .map(at);

    if (points.length > 0) {
      const baseline = Math.max(...points.map((point) => point.y));
      const participantWidth = blockWidth(points, PARTICIPANT_BLOCK_MAX);
      model.participants.forEach((participant, index) => {
        const el = participantRefs.current.get(index);
        if (!el) return;
        const point = points[index];
        el.style.left = `${point.x.toFixed(1)}px`;
        el.style.top = `${(point.y - 4.5).toFixed(1)}px`;
        el.style.width = `${participantWidth}px`;
        const pier = el.querySelector<HTMLElement>(".brdp__p");
        if (pier) {
          pier.style.height = `${((participant.principal ? 30 : 22) + baseline - point.y).toFixed(1)}px`;
        }
      });
    }

    // The stage carries absolutely positioned children, so it has no height of
    // its own. Set it from the lowest child, then again once fonts settle, or a
    // reflowed label overlaps whatever follows the bridge.
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
  }, [isVertical, width, model]);

  /* -------------------------------------------------------------- *
   * Mobile: the shared elevation drawer
   * -------------------------------------------------------------- */
  useMeasureEffect(() => {
    const rows = rowsRef.current;
    if (!isVertical || !rows) return;

    const draw = () => {
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

      model.participants.forEach((_, index) => {
        const el = participantRefs.current.get(index);
        const node = el?.querySelector<HTMLElement>(".brdp__n");
        if (!el || !node) return;
        const y = el.offsetTop + 9;
        const x = elevationX(y, H);
        node.style.left = `${(x - GUTTER - node.offsetWidth / 2).toFixed(1)}px`;
      });

      const live = document.createElementNS(SVG_NS, "path");
      live.setAttribute("class", "d-live");
      live.setAttribute("d", elevationPath(0, H, H));
      svg.appendChild(live);
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
  }, [isVertical, width, model]);

  const current = BRIDGE_MILESTONES[model.at];
  const chip = STATE_CHIP[model.condition];

  const rootClasses = ["br", "brd", isVertical ? "br--v" : null, drawing ? "br--drawing" : null, reducedMotion ? "br--still" : null]
    .filter(Boolean)
    .join(" ");

  const participantBlock = (index: number) => {
    const participant = model.participants[index];
    const classes = [
      "brdp",
      participant.principal ? "brdp--prin" : "brdp--add",
      participant.state === "awaited" ? "brdp--wait" : participant.state === "accepted" ? "brdp--acc" : null,
      participant.ownsNextAction ? "brdp--next" : null,
    ]
      .filter(Boolean)
      .join(" ");

    const stateLabel =
      participant.state === "awaited" ? "Awaited" : participant.state === "accepted" ? "Accepted" : "Joined";

    return (
      <div
        key={`${participant.role}-${index}`}
        className={classes}
        ref={(el) => {
          if (el) participantRefs.current.set(index, el);
          else participantRefs.current.delete(index);
        }}
      >
        <span className="brdp__n" aria-hidden="true" />
        <span className="brdp__p" aria-hidden="true" />
        <div className="brdp__r">{participant.role}</div>
        <div className="brdp__s">{stateLabel}</div>
        {participant.ownsNextAction ? (
          <>
            <i className="brdp__cap" aria-hidden="true" />
            <div className="brdp__tag">Owns next action</div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="pf-dealroom-bridge">
      {/*
        One `role="img"` with a full sentence, per the implementation notes for
        a non-interactive bridge. The drawing is decorative to assistive
        technology; the sentence is the content, and the visible facts are
        repeated as real text below so nothing depends on the graphic.
      */}
      <div className={rootClasses} role="img" aria-label={bridgeAriaLabel(model)} ref={rootRef}>
        {isVertical ? (
          <div key="rows" className="br__rows br__rows--arc" ref={rowsRef}>
            <div className="brd__ms brd__ms--on">
              <b>{current.label}</b>
              <u>
                Stage {model.at + 1} of {BRIDGE_MILESTONES.length}
              </u>
            </div>
            {model.participants.map((_, index) => participantBlock(index))}
          </div>
        ) : (
          <div key="stage" className="br__stage" style={{ position: "relative" }} ref={stageRef}>
            <svg
              className="br__deck"
              style={{ position: "absolute", left: 0, top: 0 }}
              aria-hidden="true"
              focusable="false"
              ref={deckRef}
            />
            <div className="brd__ms brd__ms--on" ref={milestoneRef}>
              <b>{current.label}</b>
              <u>
                Stage {model.at + 1} of {BRIDGE_MILESTONES.length}
              </u>
            </div>
            {model.participants.map((_, index) => participantBlock(index))}
          </div>
        )}
      </div>

      {/*
        The facts, as text. State never depends on colour alone, and a reader
        with images off, styles off or a screen reader gets the same content.
      */}
      <div className="pf-dealroom-bridge__facts">
        {chip ? (
          <span className={chip.className}>
            <i aria-hidden="true" />
            {chip.label}
          </span>
        ) : null}
        <span className="brj__state">
          <i aria-hidden="true" />
          {MOMENTUM_LABEL[model.momentum]}
        </span>
        {caption ? <span className="pf-dealroom-bridge__ref">{caption}</span> : null}
      </div>
    </div>
  );
}
