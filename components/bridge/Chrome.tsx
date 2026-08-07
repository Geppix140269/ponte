"use client";

import { useEffect, useState } from "react";
import { PRIMARY_NAV, signInHref } from "@/lib/nav/primary";

/**
 * The chrome: the masthead and the market signals tape.
 *
 * ## Which screens get it
 *
 * `ADR-0032-AMENDMENT-1` section 3: "every screen" means every screen in the
 * NEW SYSTEM. It does not mean unbarring the fourteen ChromeGate route
 * families, which would re-create the double-header defect a whole PR was spent
 * removing. A route adopts this when it is rebuilt, one at a time.
 *
 * ## The tape
 *
 * It runs because the market runs. But "never stops" was written about the
 * market and not about the animation, and three things follow:
 *
 *   - `prefers-reduced-motion` stops it. Item 6 governs.
 *   - Hover-pause serves a mouse and nothing else. There is a real control,
 *     it is visible, it is reachable by keyboard, and it says which state it
 *     is in rather than being an icon that toggles silently.
 *   - The choice persists for the session. A member who stopped it once should
 *     not have to stop it again on the next screen.
 */

export interface Signal {
  /** What is being traded. */
  subject: string;
  /** How much of it. */
  volume: string;
  /** Where it is going. Carries the bronze, as the live part of the line. */
  corridor: string;
}

const PAUSE_KEY = "ponte.bridge.tape.paused";

export interface ChromeProps {
  signals: readonly Signal[];
  /** Who is signed in, or null. The masthead states it and nothing more. */
  who?: string | null;
  nav?: readonly { key: string; label: string; href: string }[];
  current?: string;
}

/**
 * What the bridge header carries.
 *
 * It used to declare its own three links here. That was one place for THIS
 * generation, but the walkthrough of 7 August 2026 found four other headers
 * declaring their own, so the entrance and the rest of the product disagreed
 * about what Ponte's places are called, and the entrance's own bar offered
 * neither primary journey.
 *
 * The entries now come from `PRIMARY_NAV`, the one declaration for every shell,
 * with the account or sign-in door appended because that is the only part of
 * the bar that depends on who is reading it.
 */
export function primaryNav(
  who: string | null,
  returnTo?: string | null,
): { key: string; label: string; href: string }[] {
  return [
    ...PRIMARY_NAV.map((n) => ({ key: n.key, label: n.label, href: n.href })),
    who
      ? { key: "account", label: "Account", href: "/account" }
      : { key: "account", label: "Sign in", href: signInHref(returnTo) },
  ];
}

export default function Chrome({ signals, who = null, nav = [], current }: ChromeProps) {
  /*
    Undefined until read, so the first paint does not assert "running" to a
    member who paused it and would see it start again before stopping.
  */
  const [paused, setPaused] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setPaused(window.sessionStorage.getItem(PAUSE_KEY) === "1");
    } catch {
      // A blocked store is not a reason to fail. It runs, and the control works
      // for as long as the page is open.
      setPaused(false);
    }
  }, []);

  function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      window.sessionStorage.setItem(PAUSE_KEY, next ? "1" : "0");
    } catch {
      /* The control still works; only the memory of it is lost. */
    }
  }

  // Doubled, so the run can translate by exactly half and loop seamlessly.
  const run = [...signals, ...signals];

  return (
    <>
      <header className="brg-mast">
        <div className="brg-mx brg-mast__bar">
          <button className="brg-mast__mark" type="button">
            Ponte
          </button>
          {nav.length > 0 && (
            <nav className="brg-mast__nav">
              {nav.map((entry) => (
                <a
                  key={entry.key}
                  href={entry.href}
                  {...(entry.key === current ? { "aria-current": "page" as const } : {})}
                >
                  {entry.label}
                </a>
              ))}
            </nav>
          )}
          {who && <span className="brg-mast__who">{who}</span>}
        </div>
      </header>

      <div className="brg-tape" data-paused={paused ? "true" : "false"}>
        <div className="brg-tape__mask" />
        <div className="brg-tape__run">
          {run.map((signal, index) => (
            <span className="brg-tape__item" key={`${signal.subject}-${index}`}>
              <i className="brg-tape__live" aria-hidden="true" />
              <b>{signal.subject}</b>
              <span>{signal.volume}</span>
              <span className="brg-tape__to">{signal.corridor}</span>
            </span>
          ))}
        </div>
        {/*
          Named states, not an icon. "Pause" and "Resume" tell a screen reader
          and a sighted member the same thing, and neither has to work out what
          a glyph means.
        */}
        <button className="brg-tape__pause" type="button" onClick={toggle}>
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
    </>
  );
}
