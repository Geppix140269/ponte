"use client";

import { useEffect } from "react";

/*
 * Registers public/sw.js. Read the header of that file before changing
 * anything here: the worker deliberately never stores a page, so nothing in
 * this component needs to worry about serving a stale board.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // A worker in development fights hot reload and caches chunks that are
    // about to be rebuilt. Test it with `next build && next start`.
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js", {
        // Always revalidate the worker script itself. Without this a browser
        // may serve /sw.js from its own HTTP cache for up to a day, and the
        // kill switch documented in that file would never reach anyone.
        updateViaCache: "none",
      })
      .then((registration) => {
        // A replacement worker would otherwise wait until every tab of the
        // site closed, which on a phone can be weeks. Taking over at once is
        // safe here precisely because no page is ever cached: the only thing
        // that changes hands is which offline page is on disk.
        registration.addEventListener("updatefound", () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              next.postMessage("skip-waiting");
            }
          });
        });
      })
      .catch(() => {
        // No worker means no offline page. Everything else still works, so
        // this is not worth an error in front of a member.
      });
  }, []);

  return null;
}
