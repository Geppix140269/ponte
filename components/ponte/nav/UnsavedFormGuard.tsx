"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import { serializeFields, type FieldSnapshot } from "@/lib/nav/form-dirty";

/**
 * Unsaved-work protection for server-action `<form>` pages.
 *
 * The composers hold their draft in React state, so `useUnsavedGuard` can ask
 * them whether they are dirty. The Deal Room command pages and the admin
 * decision console do not: they are uncontrolled `<form>`s posting to a server
 * action, with the header logo, the bottom bar and a "Back to ..." link as their
 * exits, none of which this component renders. So the protection has to be
 * observed and intercepted from the outside:
 *
 *   - Dirty is read from the fields themselves. A snapshot is taken on mount and
 *     re-taken on every input; when it differs, real edits exist. A field
 *     returned to its default reads clean again, so deleting what you typed
 *     lifts the guard rather than trapping you behind it.
 *   - The browser exits (refresh, tab close, typed URL) are caught by
 *     `beforeunload`, attached only while dirty.
 *   - The in-app exits (any link, including the shared header logo and bottom
 *     bar, which this component cannot wrap) are caught by a capture-phase click
 *     listener that runs ONLY while dirty. It intercepts the navigation, opens
 *     the shared dialog, and performs the navigation only if the member chooses
 *     to leave. A plain modifier-click or a new-tab link is left alone.
 *
 * A real submission is allowed through: the `submit` event clears the guard so
 * the action's own redirect or revalidation is never intercepted.
 *
 * The wrapper is `display: contents`, so it adds a scanning root and the dialog
 * without changing the page's layout.
 */

function readFields(root: HTMLElement): FieldSnapshot[] {
  const nodes = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select",
  );
  const out: FieldSnapshot[] = [];
  nodes.forEach((el) => {
    const type = (el as HTMLInputElement).type;
    if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "image") {
      return;
    }
    if (type === "checkbox" || type === "radio") {
      out.push({ kind: "toggle", checked: (el as HTMLInputElement).checked });
    } else if (type === "file") {
      out.push({ kind: "file", count: (el as HTMLInputElement).files?.length ?? 0 });
    } else {
      out.push({ kind: "value", value: el.value });
    }
  });
  return out;
}

export default function UnsavedFormGuard({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("journey");
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let baseline = serializeFields(readFields(root));

    const recompute = () => {
      dirtyRef.current = !submittingRef.current && serializeFields(readFields(root)) !== baseline;
    };

    const onSubmit = () => {
      // A real submission owns the next navigation; do not fight it.
      submittingRef.current = true;
      dirtyRef.current = false;
      // If the action revalidates and stays on the page rather than redirecting,
      // re-arm against the freshly rendered defaults so a second edit is caught.
      window.setTimeout(() => {
        if (!rootRef.current) return;
        submittingRef.current = false;
        baseline = serializeFields(readFields(rootRef.current));
        dirtyRef.current = false;
      }, 1500);
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      // Hold this navigation behind the dialog. Leaving is a full navigation to
      // the anchor's resolved URL, which also clears the unsaved state.
      const destination = anchor.href;
      e.preventDefault();
      e.stopImmediatePropagation();
      pendingRef.current = () => {
        submittingRef.current = true;
        window.location.assign(destination);
      };
      setPromptOpen(true);
    };

    root.addEventListener("input", recompute, true);
    root.addEventListener("change", recompute, true);
    root.addEventListener("submit", onSubmit, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      root.removeEventListener("input", recompute, true);
      root.removeEventListener("change", recompute, true);
      root.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  const onContinueEditing = () => {
    pendingRef.current = null;
    setPromptOpen(false);
  };
  const onLeave = () => {
    const proceed = pendingRef.current;
    pendingRef.current = null;
    setPromptOpen(false);
    proceed?.();
  };

  return (
    <div ref={rootRef} style={{ display: "contents" }}>
      {children}
      <UnsavedChangesDialog
        open={promptOpen}
        onContinueEditing={onContinueEditing}
        onLeave={onLeave}
        t={t}
      />
    </div>
  );
}
