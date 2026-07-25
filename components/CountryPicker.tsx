"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/countries";

/**
 * A searchable country picker over the full ISO list: type the two-letter code
 * or the start of a name, get a short suggestion list, tap to choose. Not a
 * wall of chips and not a native <select>: box-free, keyboard and tap friendly.
 *
 * `value` is the ISO alpha-2 code (or ""); `onChange` receives the chosen code.
 */
export default function CountryPicker({
  value,
  onChange,
  placeholder = "Type a country or its code",
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}) {
  const selected = COUNTRIES.find((c) => c.code === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // While closed, the field shows the chosen country; while open, it shows what
  // is being typed.
  const display = open ? query : selected ? `${selected.code}  ${selected.name}` : "";

  const results = useMemo(() => {
    const s = query.trim().toLowerCase();
    const list = !s
      ? COUNTRIES
      : COUNTRIES.filter(
          (c) => c.code.toLowerCase().startsWith(s) || c.name.toLowerCase().includes(s),
        );
    return list.slice(0, 8);
  }, [query]);

  useEffect(() => setActive(0), [query]);

  // Close when clicking away.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (code: string) => {
    onChange(code);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="vcp" ref={rootRef}>
      <input
        className="vcp__input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active].code);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="vcp__list" role="listbox">
          {results.length > 0 ? (
            results.map((c, i) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`vcp__opt${i === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c.code)}
                >
                  <span className="vcp__code">{c.code}</span>
                  <span>{c.name}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="vcp__empty">No country matches that.</li>
          )}
        </ul>
      )}
    </div>
  );
}
