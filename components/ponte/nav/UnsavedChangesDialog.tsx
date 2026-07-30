"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * The shared "You have unsaved changes" dialog.
 *
 * It extends the precedent already in the app: `ClassifyStep`'s inline
 * `DiscardWarning`, which stops a classification change from silently destroying
 * later answers and focuses the safe option by default. This is the same idea
 * promoted to a real modal for the leave-the-page case the brief describes, with
 * the three actions the brief names.
 *
 * Safety is in the ordering and the focus, not just the words:
 *   - "Continue editing" is the safe action. It carries focus on open, and it is
 *     what Escape and a backdrop click both resolve to.
 *   - "Save as draft" (authenticated) or "Sign in and save" (anonymous) is
 *     offered only when the journey can genuinely persist the work. We never
 *     print a draft promise we cannot keep (brief section 6): an anonymous user
 *     is told honestly that signing in is what saves it.
 *   - "Leave without saving" is reachable but never the default and never loud.
 *
 * Translations arrive through `t`, scoped to the "journey" namespace by the
 * caller, on the same t-as-prop contract as ClassifyStep. That keeps the modal
 * testable through the project renderer, which has no intl context.
 *
 * Accessibility (brief section 9): role="alertdialog", aria-modal, a labelled
 * and described panel, a focus trap while open, and focus returned to whatever
 * opened it when it closes.
 */

export type SaveOption =
  | { kind: "draft"; onSave: () => void }
  | { kind: "signin"; onSignIn: () => void }
  | null;

export default function UnsavedChangesDialog({
  open,
  onContinueEditing,
  onLeave,
  save = null,
  t,
}: {
  open: boolean;
  onContinueEditing: () => void;
  onLeave: () => void;
  /** How this journey can save, if it can. Null hides the middle action. */
  save?: SaveOption;
  /** Translator scoped to the "journey" namespace. */
  t: (key: string) => string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus, put focus on the safe action, and restore it on
  // close. Keyed on `open` so every open/close cycle is symmetric.
  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    safeRef.current?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onContinueEditing();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onContinueEditing],
  );

  if (!open) return null;

  return (
    <div
      className="pux__scrim"
      onMouseDown={(e) => {
        // A click on the backdrop is the safe resolution, not a silent leave.
        if (e.target === e.currentTarget) onContinueEditing();
      }}
    >
      <div
        ref={panelRef}
        className="pux"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pux-h"
        aria-describedby="pux-d"
        onKeyDown={onKeyDown}
      >
        <p className="pux__h" id="pux-h">
          {t("unsaved.title")}
        </p>
        <p className="pux__d" id="pux-d">
          {t("unsaved.body")}
        </p>
        {save?.kind === "signin" && <p className="pux__note">{t("unsaved.signInToSave")}</p>}

        <div className="pux__a">
          <button
            ref={safeRef}
            type="button"
            className="pux-btn pux-btn--safe"
            onClick={onContinueEditing}
          >
            {t("unsaved.continueEditing")}
          </button>

          {save?.kind === "draft" && (
            <button type="button" className="pux-btn pux-btn--draft" onClick={save.onSave}>
              {t("unsaved.saveDraft")}
            </button>
          )}
          {save?.kind === "signin" && (
            <button type="button" className="pux-btn pux-btn--draft" onClick={save.onSignIn}>
              {t("unsaved.signInAndSave")}
            </button>
          )}

          <button type="button" className="pux-btn pux-btn--leave" onClick={onLeave}>
            {t("unsaved.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
