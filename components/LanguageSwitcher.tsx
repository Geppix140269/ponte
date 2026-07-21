"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe, Check } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";

// Globe switcher. Picking a language calls next-intl's router, which persists
// the choice in the NEXT_LOCALE cookie. From then on Accept-Language is
// ignored, so an explicit choice is never overridden.
export default function LanguageSwitcher() {
  const active = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === active) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full p-2 text-gray-2 hover:bg-white/5 hover:text-gold disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${localeNames[active]}`}
      >
        <Globe className="h-5 w-5" />
        <span className="hidden text-xs uppercase tracking-wide sm:inline">
          {active}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose a language"
          className="absolute end-0 z-50 mt-2 max-h-80 w-44 overflow-y-auto rounded-xl border border-white/10 bg-navy/95 p-1 shadow-xl backdrop-blur"
        >
          {locales.map((code) => {
            const selected = code === active;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(code)}
                lang={code}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                  selected
                    ? "bg-white/10 text-gold"
                    : "text-cream hover:bg-white/5 hover:text-gold"
                }`}
              >
                <span>{localeNames[code]}</span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
