"use client";
import { Search, Filter, RefreshCw, Globe } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  filter: "all" | "live" | "monitor";
  onFilter: (f: "all" | "live" | "monitor") => void;
  country: string;
  onCountry: (c: string) => void;
  // UPDATE: Expect an array of objects that include the numeric database id
  countries: Array<{ id: number; code: string; name: string }>;
  onRefresh: () => void;
  loading: boolean;
}

export default function FilterBar({
  search,
  onSearch,
  filter,
  onFilter,
  country,
  onCountry,
  countries,
  onRefresh,
  loading,
}: FilterBarProps) {
  const FILTERS: Array<{ key: "all" | "live" | "monitor"; label: string }> = [
    { key: "all", label: "All Stations" },
    { key: "live", label: "Live Only" },
    { key: "monitor", label: "Reference Monitors" },
  ];

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
      style={{ background: "rgba(11,17,23,0.9)", borderColor: "#1F2937" }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 flex-1 max-w-xs px-3 py-1.5 rounded-lg"
        style={{
          background: "rgba(31,41,55,0.5)",
          border: "1px solid #1F2937",
        }}
      >
        <Search className="w-3.5 h-3.5 opacity-40" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search stations, countries…"
          className="flex-1 bg-transparent text-xs outline-none placeholder-white/30"
        />
      </div>

      {/* Status filters */}
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ border: "1px solid #1F2937" }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className="px-3 py-1.5 text-xs font-medium transition-all duration-150"
            style={{
              background:
                filter === f.key
                  ? "rgba(56,189,248,0.12)"
                  : "transparent",
              color: filter === f.key ? "#38BDF8" : "rgba(255,255,255,0.4)",
              borderRight: "1px solid #1F2937",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Country filter */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
        style={{
          background: "rgba(31,41,55,0.5)",
          border: "1px solid #1F2937",
        }}
      >
        <Globe className="w-3.5 h-3.5 opacity-40" />
        <select
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className="bg-transparent text-xs outline-none cursor-pointer"
          style={{ color: country ? "#38BDF8" : "rgba(255,255,255,0.5)" }}
        >
          <option value="" className="bg-gray-900 text-white">All Countries</option>
          {countries.map((c) => (
            /* FIX: Pass c.id as the underlying selection value to appease OpenAQ v3 */
            <option key={c.id} value={c.id} className="bg-gray-900 text-white">
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 disabled:opacity-40"
        style={{
          background: "rgba(56,189,248,0.06)",
          border: "1px solid rgba(56,189,248,0.2)",
          color: "#38BDF8",
        }}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
        />
        {loading ? "Loading…" : "Refresh"}
      </button>
    </div>
  );
}