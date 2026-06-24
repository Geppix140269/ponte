"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ShipmentRecord {
  id: string;
  date: string;
  importer: string;
  exporter: string;
  hsCode: string;
  description: string;
  quantity: string;
  unitValue: string;
  totalValue: string;
  portOfLoading: string;
  portOfDischarge: string;
  coverage: "Strong" | "Partial" | "Extrapolated";
}

interface SearchForm {
  query: string;
  originCountry: string;
  destinationCountry: string;
  dateFrom: string;
  dateTo: string;
  direction: "import" | "export" | "both";
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function CoverageBadge({ level }: { level: ShipmentRecord["coverage"] }) {
  const styles: Record<ShipmentRecord["coverage"], string> = {
    Strong: "text-positive border-positive/30 bg-positive/10",
    Partial: "text-gold border-gold/30 bg-gold/10",
    Extrapolated: "text-gray-2 border-white/20 bg-white/5",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${styles[level]}`}
      style={{ letterSpacing: "0.06em" }}
    >
      {level}
    </span>
  );
}

function BlurredRow({ index }: { index: number }) {
  return (
    <tr className="border-b border-white/5" style={{ opacity: 0.5 }}>
      {[60, 80, 55, 70, 45, 55, 40, 50, 60, 45, 55].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <span
            className="block h-3 rounded"
            style={{
              width: `${w + ((index * 13 + i * 7) % 30)}%`,
              background: "rgba(255,255,255,0.10)",
              filter: "blur(4px)",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function SignupPrompt() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center gap-5 py-14 px-6"
      style={{
        background:
          "linear-gradient(to top, rgba(7,16,27,1) 30%, rgba(7,16,27,0.85) 70%, transparent)",
        zIndex: 10,
      }}
    >
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-4" style={{ background: "rgba(201,151,58,0.15)", border: "1px solid rgba(201,151,58,0.35)" }}>
          <Lock className="h-4 w-4 text-gold" />
        </div>
        <p className="text-white text-[16px] font-medium mb-2">
          Free account required to see all results
        </p>
        <p className="text-gray-2 text-[13px] leading-relaxed">
          Create a free account to browse full shipment data. CSV exports use credits.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/login" className="btn-gold px-6 py-2.5 text-[13px]">
          Create free account
        </Link>
        <Link href="/login" className="btn px-6 py-2.5 text-[13px] text-cream">
          Sign in
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export default function SearchClient({
  isAuthenticated,
  userEmail,
}: {
  isAuthenticated: boolean;
  userEmail: string | null;
}) {
  const [form, setForm] = useState<SearchForm>({
    query: "",
    originCountry: "",
    destinationCountry: "",
    dateFrom: "",
    dateTo: "",
    direction: "both",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ShipmentRecord[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!form.query.trim()) return;
      setLoading(true);
      setError(null);
      setResults(null);
      setPage(1);
      try {
        const res = await fetch("/api/tools/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, page: 1 }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${res.status}`);
        }
        const data = await res.json();
        setResults(data.records);
        setTotalCount(data.total);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Search failed. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  const visibleResults = isAuthenticated ? results : results?.slice(0, 3);
  const blurredCount = results && !isAuthenticated ? Math.min(results.length - 3, 12) : 0;

  return (
    <div className="space-y-6">
      {/* ── Search form ── */}
      <div className="glass rounded-2xl p-6 md:p-8" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <form onSubmit={handleSearch} className="space-y-5">
          {/* Main query row */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-2 pointer-events-none" />
              <input
                type="text"
                value={form.query}
                onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="field pl-11"
                placeholder="Product name or HS code — e.g. 'salmon' or '030211'"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !form.query.trim()}
              className="btn-gold px-6 py-3 text-[14px] disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* Direction toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.18em" }}>Direction</span>
            {(["both", "import", "export"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: d }))}
                className={`px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                  form.direction === d
                    ? "bg-gold/20 text-gold border border-gold/40"
                    : "text-gray-2 border border-white/10 hover:border-white/20"
                }`}
              >
                {d === "both" ? "Import & Export" : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-2 text-[12px] text-gray-2 hover:text-white transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            Advanced filters
            {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {/* Collapsible filters */}
          {filtersOpen && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <label className="field-label">Country of origin</label>
                <select
                  value={form.originCountry}
                  onChange={(e) => setForm((f) => ({ ...f, originCountry: e.target.value }))}
                  className="field"
                >
                  <option value="">Any country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Country of destination</label>
                <select
                  value={form.destinationCountry}
                  onChange={(e) => setForm((f) => ({ ...f, destinationCountry: e.target.value }))}
                  className="field"
                >
                  <option value="">Any country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Date from</label>
                <input
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="field"
                />
              </div>
              <div>
                <label className="field-label">Date to</label>
                <input
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                  className="field"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-4 text-[13px]"
          style={{ background: "rgba(224,122,95,0.10)", border: "1px solid rgba(224,122,95,0.25)", color: "#E07A5F" }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <Loader2 className="h-6 w-6 text-gold animate-spin" />
          <p className="text-gray-2 text-[14px]">Searching transaction-level records…</p>
        </div>
      )}

      {/* ── Results ── */}
      {results && !loading && (
        <div className="space-y-4">
          {/* Results header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-white text-[15px] font-medium">
                {totalCount.toLocaleString()} shipment records
              </span>
              <span className="text-gray-2 text-[13px] ml-2">
                matching &ldquo;{form.query}&rdquo;
                {form.originCountry && ` · from ${COUNTRIES.find((c) => c.code === form.originCountry)?.name ?? form.originCountry}`}
                {form.destinationCountry && ` · to ${COUNTRIES.find((c) => c.code === form.destinationCountry)?.name ?? form.destinationCountry}`}
              </span>
            </div>
            {isAuthenticated ? (
              <button
                className="btn-gold flex items-center gap-2 px-4 py-2 text-[13px]"
                title="5 credits per export"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV <span className="text-navy/60 text-[11px]">(5 credits)</span>
              </button>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-[13px] text-gold hover:text-gold/80 transition-colors">
                <Lock className="h-3.5 w-3.5" />
                Sign in to export CSV
              </Link>
            )}
          </div>

          {/* Table */}
          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Date", "Importer", "Exporter", "HS Code", "Description", "Qty", "Unit Value", "Total Value", "Port of Loading", "Port of Discharge", "Coverage"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] uppercase text-gray-2 whitespace-nowrap font-medium"
                          style={{ letterSpacing: "0.14em" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(visibleResults ?? []).map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-2 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 text-white font-medium max-w-[160px] truncate">{r.importer}</td>
                        <td className="px-4 py-3 text-white max-w-[160px] truncate">{r.exporter}</td>
                        <td className="px-4 py-3 text-gold font-mono text-[12px] whitespace-nowrap">{r.hsCode}</td>
                        <td className="px-4 py-3 text-gray-2 max-w-[200px] truncate">{r.description}</td>
                        <td className="px-4 py-3 text-gray-2 whitespace-nowrap">{r.quantity}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{r.unitValue}</td>
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.totalValue}</td>
                        <td className="px-4 py-3 text-gray-2 whitespace-nowrap">{r.portOfLoading}</td>
                        <td className="px-4 py-3 text-gray-2 whitespace-nowrap">{r.portOfDischarge}</td>
                        <td className="px-4 py-3">
                          <CoverageBadge level={r.coverage} />
                        </td>
                      </tr>
                    ))}
                    {!isAuthenticated && Array.from({ length: blurredCount }).map((_, i) => (
                      <BlurredRow key={`blur-${i}`} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Blur gate for anon users */}
            {!isAuthenticated && results.length > 3 && (
              <SignupPrompt />
            )}
          </div>

          {/* Pagination (auth only) */}
          {isAuthenticated && totalCount > PER_PAGE && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn px-4 py-2 text-[13px] text-gray-2 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-[13px] text-gray-2">
                Page {page} of {Math.ceil(totalCount / PER_PAGE)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / PER_PAGE)}
                className="btn px-4 py-2 text-[13px] text-gray-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {/* Contextual CTAs */}
          <div
            className="grid sm:grid-cols-3 gap-4 pt-4 mt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <CtaCard
              label="Market Reports"
              title="Single Country Market Report"
              body="Turn this data into a board-ready intelligence report. Senior analyst, signed off, licensed PDF."
              href="/product/single-country-market-report"
              price="$1,599"
            />
            <CtaCard
              label="Company & Supplier"
              title="Buyer/Supplier Intelligence"
              body="Ranked, contactable shortlist of importers or exporters for this product. Verified contact data."
              href="/product/buyer-supplier-intelligence"
              price="from $1,990"
            />
            <CtaCard
              label="Market Reports"
              title="Trade Corridor Report"
              body="Deep dive on a specific origin-destination pair: volumes, partners, seasonality, risk."
              href="/product/trade-corridor-report"
              price="$399"
            />
          </div>
        </div>
      )}

      {/* ── Empty state (no search yet) ── */}
      {!results && !loading && !error && (
        <div className="space-y-8">
          {/* Quick-start examples */}
          <div>
            <p className="text-[11px] uppercase text-gray-2 mb-4" style={{ letterSpacing: "0.2em" }}>
              Try a search
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "salmon · HS 030211",
                "electric vehicles · HS 870380",
                "solar panels · HS 854140",
                "lithium batteries · HS 850760",
                "avocados · HS 080440",
                "copper wire · HS 740822",
              ].map((ex) => {
                const [label] = ex.split(" · ");
                const hs = ex.split("· ")[1];
                return (
                  <button
                    key={ex}
                    onClick={() => {
                      setForm((f) => ({ ...f, query: hs ?? label }));
                    }}
                    className="px-3 py-2 rounded-lg text-[12px] text-gray-2 border border-white/10 hover:border-white/20 hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data source note */}
          <div
            className="glass-tight rounded-xl p-5 text-[13px] text-gray-2 leading-relaxed max-w-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <strong className="text-white block mb-1">What you&apos;re searching</strong>
            Transaction-level customs declarations and bills of lading from 199 countries.
            Each record shows the actual importer, exporter, HS code, quantity, and declared
            unit value — not statistical aggregates. Coverage and freshness varies by country;
            see the badges on each result.{" "}
            <Link href="/learn/trade-data" className="text-gold hover:underline">
              Learn more about our data
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// CTA card
// ──────────────────────────────────────────────

function CtaCard({
  label,
  title,
  body,
  href,
  price,
}: {
  label: string;
  title: string;
  body: string;
  href: string;
  price: string;
}) {
  return (
    <Link
      href={href}
      className="glass-tight rounded-xl p-5 flex flex-col gap-3 hover:border-gold/30 transition-colors group"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <span className="text-[10px] uppercase text-gold" style={{ letterSpacing: "0.18em" }}>{label}</span>
      <div>
        <p className="text-white text-[14px] font-medium group-hover:text-gold transition-colors mb-1">{title}</p>
        <p className="text-gray-2 text-[12px] leading-relaxed">{body}</p>
      </div>
      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-white text-[13px] font-medium">{price}</span>
        <ArrowRight className="h-4 w-4 text-gold group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
