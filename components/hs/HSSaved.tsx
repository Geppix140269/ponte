"use client";

import { useEffect, useState } from "react";
import { Bookmark, X } from "lucide-react";
import type { HSSavedCode } from "@/lib/hs/types";
import { SCHEDULE_LABELS } from "@/lib/hs/types";

interface Props {
  savedCodeIds: Set<number>;
  onUnsave: (id: number) => void;
}

export default function HSSaved({ savedCodeIds, onUnsave }: Props) {
  const [saved, setSaved] = useState<HSSavedCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/hs/save")
      .then((r) => r.json())
      .then((d) => setSaved(d.saved ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [savedCodeIds]);

  const handleRemove = async (item: HSSavedCode) => {
    const res = await fetch("/api/hs/save", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hs_code_id: item.hs_code_id }),
    });
    if (res.ok) {
      setSaved((prev) => prev.filter((s) => s.id !== item.id));
      onUnsave(item.hs_code_id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <Bookmark className="w-9 h-9 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No saved codes yet.</p>
        <p className="text-xs mt-1">
          Search for a product and save the codes you use frequently.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 mb-4">
        {saved.length} saved code{saved.length !== 1 ? "s" : ""}
      </p>
      {saved.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 border border-zinc-200 rounded-xl bg-white hover:border-zinc-300 transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-zinc-900">
                {item.hs_codes?.code}
              </span>
              <span className="text-xs text-zinc-400">
                {SCHEDULE_LABELS[item.hs_codes?.schedule]}
              </span>
              {item.label && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {item.label}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5 truncate">
              {item.hs_codes?.description}
            </p>
          </div>
          <button
            onClick={() => handleRemove(item)}
            className="ml-3 shrink-0 text-zinc-300 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
