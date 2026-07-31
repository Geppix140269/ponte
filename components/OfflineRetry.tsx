"use client";

/**
 * The one control on the offline page. It carries the Desk's own button
 * primitive (`.b`) rather than the retired obsidian gold button, because the
 * page it belongs to now renders inside the Desk shell (Issue #130 Stage 3).
 * Behaviour is unchanged: reload the document the reader was already on.
 */
export default function OfflineRetry({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.location.reload()} className="b">
      {label}
    </button>
  );
}
