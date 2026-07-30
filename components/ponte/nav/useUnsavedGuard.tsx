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
 *   2. In-app controls we own: the logo, a Back control, a nav item. These route
 *      through `guard(proceed)`. When the draft is clean, `proceed` runs at once
 *      and the user feels nothing. When it is dirty, the navigation is held and
 *      the shared UnsavedChangesDialog is opened; the held action runs only if
 *      the user chooses to leave.
 *
 * This is opt-in per control rather than a global link interceptor: a surface
 * decides which of its exits are guarded, which keeps the behaviour predictable
 * and avoids swallowing clicks the user did not make dangerous.
 */
export function useUnsavedGuard(dirty: boolean) {
  const pendingRef = useRef<(() => void) | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy Chrome requires a returnValue to be set for the prompt to show.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

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
