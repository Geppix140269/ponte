"use client";
import { useEffect } from "react";

export function TrackView({ event, props }: { event: string; props?: Record<string, unknown> }) {
  useEffect(() => {
    try {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, props }), keepalive: true }).catch(() => {});
    } catch { /* noop */ }
  }, [event, props]);
  return null;
}
