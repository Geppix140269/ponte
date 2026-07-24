"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { buildFindHref } from "@/lib/find/query";

type Chapter = { chapter: string; chapter_title: string };
type Hit = { code: string; display: string; short_title: string | null; description: string };

export type ProductPickerLabels = {
  chaptersLabel: string;
  searchPlaceholder: string;
  back: string;
  voice: string;
  noMatch: string;
  hint: string;
};

/**
 * The Find entry's product chooser: tap a category, or speak/type a product.
 *
 * Tapping is the primary path (the 97 HS chapters as a tile grid). Voice is a
 * first-class alternative (Web Speech API, silently absent where unsupported).
 * Typing is the fallback that never blocks: it drives the same /api/hs/search
 * typeahead. Any choice navigates to /find with the product set; nothing here
 * requires a keyboard to proceed.
 */
export default function HsProductPicker({ labels }: { labels: ProductPickerLabels }) {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const debounce = useRef<number | null>(null);

  const pick = useCallback(
    (product: string) => {
      const p = product.trim();
      if (p) router.push(buildFindHref({ product: p }));
    },
    [router],
  );

  useEffect(() => {
    let live = true;
    fetch("/api/hs/search?chapters=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (live && Array.isArray(data)) setChapters(data);
      })
      .catch(() => {});
    setVoiceOk(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    debounce.current = window.setTimeout(() => {
      fetch(`/api/hs/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setHits(Array.isArray(data) ? data.slice(0, 8) : []))
        .catch(() => setHits([]));
    }, 220);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [query]);

  const startVoice = useCallback(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = document.documentElement.lang || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) pick(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }, [pick]);

  const searching = query.trim().length >= 2;

  return (
    <div className="fpick">
      <div className="fpick__bar">
        <input
          className="reqq__note"
          style={{ minHeight: "auto", padding: "10px 12px" }}
          type="text"
          inputMode="search"
          value={query}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) pick(query);
          }}
        />
        {voiceOk && (
          <button
            type="button"
            className={`fchip${listening ? " is-listening" : ""}`}
            aria-pressed={listening}
            onClick={startVoice}
          >
            🎙 {labels.voice}
          </button>
        )}
      </div>

      {searching ? (
        hits.length > 0 ? (
          <ul className="fpick__hits" role="listbox" aria-label={labels.searchPlaceholder}>
            {hits.map((h) => (
              <li key={h.code}>
                <button type="button" className="fpick__hit" onClick={() => pick(h.short_title ?? h.display)}>
                  <span className="fpick__hitname">{h.short_title ?? h.display}</span>
                  <span className="fpick__hitcode mono">{h.code}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flane__note">{labels.noMatch}</p>
        )
      ) : (
        <>
          <p className="eyebrow" style={{ marginTop: 8 }}>{labels.chaptersLabel}</p>
          <div className="fpick__tiles">
            {chapters.map((c) => (
              <button
                key={c.chapter}
                type="button"
                className="fpick__tile"
                onClick={() => pick(c.chapter_title)}
              >
                {c.chapter_title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
