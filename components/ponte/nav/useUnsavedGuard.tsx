"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Protection against losing entered work when leaving a journey.
 *
 * Two layers, because two different things take a user off a page:
 *
 *   1. The browser: refresh, tab close, typed URL, the browser Back button. Only
 *      `beforeunload` can intercept these, and only to raise the browser's own
 *      generic prompt. It is attached ONLY while there is real work to lose, so
 *      a clean page never nags. The brief allows exactly this ("where browser
 *      protections can reasonably be applied").
 *
 *   2. In-app controls. Two ways to cover them:
 *      - `guard(proceed)` for a control the surface owns (a Back button, a
 *        wordmark it renders). When clean, `proceed` runs at once; when dirty,
 *        the navigation is held behind the shared dialog.
 *      - `interceptLinks`, for the exits the surface does NOT render, such as the
 *        shared header logo or the bared journey's own nav. When enabled, a
 *        capture-phase click listener (installed only while dirty) holds any
 *        in-app link the same way, and performs the navigation only on "Leave".
 *        Off by default, so a caller that wires its own exits keeps the tighter
 *        opt-in behaviour and nothing swallows a click it did not make dangerous.
 */
export function useUnsavedGuard(dirty: boolean, opts?: { interceptLinks?: boolean }) {
  const interceptLinks = opts?.interceptLinks ?? false;
  const pendingRef = useRef<(() => void) | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy Chrome requires a returnValue to be set for the prompt to show.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    let onClickCapture: ((e: MouseEvent) => void) | null = null;
    if (interceptLinks) {
      onClickCapture = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return;
        }
        const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!anchor) return;
        if (anchor.target && anchor.target !== "_self") return;
        if (anchor.hasAttribute("download")) return;
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#")) return;

        const destination = anchor.href;
        e.preventDefault();
        e.stopImmediatePropagation();
        pendingRef.current = () => window.location.assign(destination);
        setPromptOpen(true);
      };
      document.addEventListener("click", onClickCapture, true);
    }

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (onClickCapture) document.removeEventListener("click", onClickCapture, true);
    };
  }, [dirty, interceptLinks]);

  /** Run `proceed`, or hold it behind the dialog when work would be lost. */
  const guard = useCallback(
    (proceed: () => void) => {
      if (!dirty) {
        proceed();
        return;
      }
      pendingRef.current = proceed;
      setPromptOpen(true);
    },
    [dirty],
  );

  /** The safe resolution: drop the held navigation, stay on the page. */
  const onContinueEditing = useCallback(() => {
    pendingRef.current = null;
    setPromptOpen(false);
  }, []);

  /** Leave: run whatever navigation was held. */
  const leaveNow = useCallback(() => {
    const proceed = pendingRef.current;
    pendingRef.current = null;
    setPromptOpen(false);
    proceed?.();
  }, []);

  return { guard, promptOpen, onContinueEditing, leaveNow };
}
