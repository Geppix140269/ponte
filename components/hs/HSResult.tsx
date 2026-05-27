"use client";

import { useState } from "react";
import { Copy, Check, Bookmark, BookmarkCheck, ChevronDown } from "lucide-react";
import type { HSSearchResult } from "@/lib/hs/types";
import { SCHEDULE_LABELS } from "@/lib/hs/types";

interface Props {
  result: HSSearchResult;
  isSaved: boolean;
  onSave: () => void;
  isTop: boolean;
}

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

export default function HSResult({ result, isSaved, onSave, isTop }: Props) {
  const [expanded, setExpanded] = useState(isTop);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isTop ? "border-blue-300 shadow-sm" : "border-zinc-200"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
          isTop ? "bg-blue-50" : "bg-white"
        }`}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-sm font-semibold text-zinc-900 shrink-0 bg-white border border-zinc-200 rounded px-2 py-0.5">
            {result.code}
          </span>
          <span className="text-sm text-zinc-700 truncate">{result.description}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
              CONFIDENCE_STYLES[result.confidence]
            }`}
          >
            {result.confidence}
          </span>
          <span className="text-xs text-zinc-400 hidden sm:block">
            {SCHEDULE_LABELS[result.schedule]}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Detail */}
      {expanded && (
        <div className="px-4 py-4 border-t border-zinc-100 bg-white space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-zinc-500 flex-wrap">
            <span className="font-medium text-zinc-700">
              Ch. {result.chapter}
            </span>
            {result.chapter_desc && (
              <span className="text-zinc-400"> — {result.chapter_desc}</span>
            )}
            <span className="text-zinc-300 mx-1">›</span>
            <span className="font-medium text-zinc-700">{result.heading}</span>
            {result.heading_desc && (
              <span className="text-zinc-400"> — {result.heading_desc}</span>
            )}
          </div>

          <p className="text-sm text-zinc-800">{result.description}</p>

          {result.gpt_explanation && (
            <div className="flex gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg p-2.5">
              <span className="shrink-0 font-medium">AI note:</span>
              <span>{result.gpt_explanation}</span>
            </div>
          )}

          {result.notes && (
            <p className="text-xs text-zinc-400 italic">{result.notes}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>HS {result.hs_version}</span>
            <span>{SCHEDULE_LABELS[result.schedule]}</span>
            {result.unit && <span>Unit: {result.unit}</span>}
            <span>Match: {Math.round(result.similarity * 100)}%</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied!" : "Copy code"}
            </button>

            <button
              onClick={onSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isSaved
                  ? "text-blue-700 bg-blue-100 hover:bg-blue-200"
                  : "text-zinc-600 bg-zinc-100 hover:bg-zinc-200"
              }`}
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              {isSaved ? "Saved" : "Save code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
