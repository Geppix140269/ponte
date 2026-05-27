"use client";

import { useState, useCallback, useEffect } from "react";
import { Search } from "lucide-react";
import type { HSSchedule, HSSearchResult } from "@/lib/hs/types";
import { SCHEDULE_LABELS } from "@/lib/hs/types";
import HSResult from "./HSResult";
import HSSaved from "./HSSaved";

const SCHEDULES: Array<{ value: HSSchedule | ""; label: string }> = [
  { value: "", label: "All Tariff Schedules" },
  { value: "WCO", label: "Generic HS-6 (WCO)" },
  { value: "US_HTS", label: "United States (HTS)" },
  { value: "EU_TARIC", label: "European Union (TARIC)" },
  { value: "UK_GTT", label: "United Kingdom (GTT)" },
];

const EXAMPLES = [
  "fresh salmon fillets",
  "cotton t-shirts",
  "lithium batteries",
  "olive oil",
  "steel pipes",
  "laptop computers",
];

export default function HSCodeSearch() {
  const [query, setQuery] = useState("");
  const [schedule, setSchedule] = useState<HSSchedule | "">("");
  const [results, setResults] = useState<HSSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedGPT, setUsedGPT] = useState(false);
  const [searched, setSearched] = useState(false);
  const [savedCodes, setSavedCodes] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");

  // Load the user's existing saved code IDs on mount so result cards
  // correctly reflect prior saves without switching to the Saved tab.
  useEffect(() => {
    fetch("/api/hs/save")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.saved) return;
        setSavedCodes(
          new Set((d.saved as Array<{ hs_code_id: number }>).map((s) => s.hs_code_id)),
        );
      })
      .catch(() => {
        // Unauthenticated or network error — saved state stays empty, non-fatal.
      });
  }, []);

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim();
      if (!q || q.length < 2) return;

      setLoading(true);
      setError(null);
      setResults([]);
      setSearched(false);

      try {
        const res = await fetch("/api/hs/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, schedule: schedule || null, limit: 5 }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Search failed");
        }
        const data = await res.json();
        setResults(data.results ?? []);
        setUsedGPT(data.used_gpt ?? false);
        setSearched(true);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [query, schedule],
  );

  const handleSave = useCallback(
    async (result: HSSearchResult) => {
      const isSaved = savedCodes.has(result.id);
      const res = await fetch("/api/hs/save", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hs_code_id: result.id }),
      });
      if (!res.ok) return; // Don't update UI if the API call failed.
      setSavedCodes((prev) => {
        const next = new Set(prev);
        isSaved ? next.delete(result.id) : next.add(result.id);
        return next;
      });
    },
    [savedCodes],
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 mb-6">
        {(["search", "saved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {tab === "search" ? "HS Code Search" : "Saved Codes"}
          </button>
        ))}
      </div>

      {activeTab === "saved" ? (
        <HSSaved
          savedCodeIds={savedCodes}
          onUnsave={(id) =>
            setSavedCodes((prev) => {
              const n = new Set(prev);
              n.delete(id);
              return n;
            })
          }
        />
      ) : (
        <>
          {/* Search form */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Describe your product… e.g. frozen mango chunks"
                  className="w-full pl-9 pr-4 py-3 border border-zinc-300 rounded-xl text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400"
                  autoComplete="off"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={loading || query.trim().length < 2}
                className="px-5 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {loading ? "Searching…" : "Find Code"}
              </button>
            </div>

            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as HSSchedule | "")}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {SCHEDULES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* GPT badge */}
          {searched && usedGPT && (
            <div className="mt-4 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
              <span className="font-medium">AI-assisted</span>
              <span className="text-purple-300">—</span>
              <span>Results reviewed by GPT-4o for accuracy</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && searched && results.length === 0 && (
            <div className="mt-6 text-center py-8 text-zinc-400 text-sm">
              No HS codes found for &ldquo;{query}&rdquo;. Try a more descriptive product name.
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-400">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                {schedule ? ` in ${SCHEDULE_LABELS[schedule as HSSchedule]}` : ""}
              </p>
              {results.map((result, idx) => (
                <HSResult
                  key={`${result.id}-${idx}`}
                  result={result}
                  isSaved={savedCodes.has(result.id)}
                  onSave={() => handleSave(result)}
                  isTop={idx === 0}
                />
              ))}
            </div>
          )}

          {/* Example searches */}
          {!searched && !loading && (
            <div className="mt-8">
              <p className="text-xs text-zinc-400 mb-3">Try searching for:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setQuery(ex);
                      handleSearch(ex);
                    }}
                    className="px-3 py-1.5 text-xs text-zinc-600 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
