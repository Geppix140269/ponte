"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share, X } from "lucide-react";

const DISMISSED_KEY = "ponte.install.dismissed";
const VISITS_KEY = "ponte.install.visits";

// Not offered until someone has come back once. Asking a first time visitor to
// install an app they have not used yet is how install prompts got their
// reputation, and this is a marketplace that has to earn the second visit
// before it asks for the home screen.
const MIN_VISITS = 2;

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, which predates the standard media query.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    let dismissed = false;
    let visits = 0;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
      visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
    } catch {
      // Private browsing, or storage denied. Never offer in that case: the
      // dismissal could not be remembered, so the bar would return forever.
      return;
    }
    if (dismissed || visits < MIN_VISITS) return;

    const onBeforeInstall = (event: Event) => {
      // Chrome shows its own bar unless this is claimed.
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS fires no such event, and installing there is a manual gesture buried
    // in the share sheet. It has to be described rather than triggered.
    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) setShowIosHint(true);

    const onInstalled = () => {
      setDeferred(null);
      setShowIosHint(false);
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // Already installed, so it will not be offered again anyway.
      }
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDeferred(null);
    setShowIosHint(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to remember it with. The visit gate still limits the ask.
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // Once used the event cannot be used again, whichever way it went.
    dismiss();
  };

  const ios = showIosHint && !deferred;
  if (!deferred && !ios) return null;

  return (
    /*
     * Two rows, not one. On a single row the title lost half of itself to an
     * ellipsis on a 390px screen, and "Add Ponte to your home..." is not a
     * sentence anybody can act on. German and Russian are longer again.
     */
    <div className="install-bar md:hidden" role="region" aria-label={t("installTitle")}>
      <div className="glass-tight p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-gold/35 bg-gold/15 text-gold">
            {ios ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium leading-snug text-cream">
              {t("installTitle")}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-gray-2">
              {ios ? t("iosBody") : t("installBody")}
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label={t("installDismiss")}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-gray-2 transition-colors hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* iOS cannot be prompted, only instructed, so it gets no button. */}
        {!ios && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={install}
              className="btn-gold !px-5 !py-[9px] !text-[12px]"
            >
              {t("installAction")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
