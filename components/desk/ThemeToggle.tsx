"use client";

import { useEffect, useState } from "react";

/**
 * Dark or light, chosen by the member and remembered.
 *
 * Dark is the ground the product is designed on and the server always renders
 * it. This control only records a departure from that, so the stored value is
 * read and written by the inline script in `app/[locale]/layout.tsx` as well as
 * here. That script runs before first paint, which is what stops a member who
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
      {/*
        A word, not a glyph. Constitution section 7 prohibits ad hoc SVG
        interface icons, and the Ponte Flow registry has no sun or moon: an
        icon for this control would have to be invented, which is precisely
        what that section exists to stop. The label also says which state the
        control moves to, which no unlabelled sun or moon does without being
        learned first.
      */}
      {next === "light" ? "Light" : "Dark"}
    </button>
  );
}
