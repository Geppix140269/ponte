"use client";

import { useEffect, useState } from "react";

/**
 * Dark or light, chosen by the member and remembered.
 *
 * Dark is the ground the product is designed on and the server always renders
 * it. This control only records a departure from that, so the stored value is
 * read and written by the inline script in `app/[locale]/layout.tsx` as well as
 * here — that script runs before first paint, which is what stops a member who
 * chose light from seeing a dark frame first.
 *
 * The button renders `null` until mounted. Server and client would otherwise
 * disagree about which label to show: the server cannot read localStorage, so
 * it would always print "Light" and React would then swap it on hydration,
 * which is both a hydration mismatch and a visible flicker in the command bar.
 */

type Theme = "dark" | "light";

const KEY = "ponte-theme";

function current(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(current());
  }, []);

  if (theme === null) return null;

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="cmd__theme"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // A blocked or partitioned store is not a reason to refuse the
          // switch: the theme still changes, it just is not remembered.
        }
        setTheme(next);
      }}
    >
      {/* Two glyphs, one shown. A sun for the light it would switch to, a
          moon for the dark. Drawn here rather than taken from the icon
          registry because neither exists in it, and inventing a registry
          entry for a chrome control is exactly what the Constitution forbids. */}
      {next === "light" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="8"
              y1="1.6"
              x2="8"
              y2="3.3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              transform={`rotate(${deg} 8 8)`}
            />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M13 9.6A5.6 5.6 0 1 1 6.4 3a4.6 4.6 0 0 0 6.6 6.6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
