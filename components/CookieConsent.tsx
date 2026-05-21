"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ponte-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — fail closed (don't show banner)
    }
  }, []);

  function setChoice(choice: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-navy"
    >
      <div className="container-px flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-white/70">
          We use only essential storage to remember your preferences. We&apos;ll
          ask before setting any non-essential cookies. See our{" "}
          <Link href="/cookies" className="text-gold hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => setChoice("declined")}
            className="btn-outline-light"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setChoice("accepted")}
            className="btn-gold"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
