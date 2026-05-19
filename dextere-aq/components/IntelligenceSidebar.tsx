"use client";
import { useState, useEffect } from "react"; // Added hooks
import {
  Download,
  TrendingUp,
  Zap,
  ShieldAlert,
  Database,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { EnrichedLocation, CountryStats } from "@/lib/aqUtils";
import { exportToCSV } from "@/lib/aqUtils";

interface SidebarProps {
  selectedLocation: EnrichedLocation | null;
  countryStats: CountryStats[];
  totalStations: number;
  liveStations: number;
  loading: boolean;
  allLocations: EnrichedLocation[];
}

export default function IntelligenceSidebar({
  selectedLocation,
  countryStats,
  totalStations,
  liveStations,
  loading,
  allLocations,
}: SidebarProps) {
  // 1. Initialize mounting flag to bypass Server-Side mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDownload = () => {
    const csv = exportToCSV(allLocations);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dextere-aq-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const staleCount = allLocations.filter((l) => l.staleness === "stale").length;
  const coverageRate =
    totalStations > 0
      ? Math.round((liveStations / totalStations) * 100)
      : 0;

  const topCountries = countryStats.slice(0, 8);

  return (
    <aside
      className="w-[30%] flex flex-col border-l sidebar-scroll"
      style={{
        background: "rgba(11,17,23,0.97)",
        borderColor: "#1F2937",
      }}
    >
      {/* ── Section A: Title & Key Metric ── */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "#1F2937" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-px h-4"
            style={{ background: "#38BDF8" }}
          />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#38BDF8" }}
          >
            Intelligence Panel
          </span>
        </div>
        <h2
          className="text-lg font-bold tracking-tight leading-tight"
          style={{ letterSpacing: "-0.03em" }}
        >
          Global Air Quality
          <br />
          <span style={{ color: "#38BDF8" }}>Monitor Network</span>
        </h2>
        
        {/* 2. Conditionally display the timestamp text safely */}
        <p className="text-xs opacity-40 mt-1">
          OpenAQ v3 · {isMounted ? new Date().toUTCString().slice(0, 25) : "Loading..."}
        </p>

        {/* Key Metric */}
        <div
          className="mt-3 p-3 rounded-lg"
          style={{
            background: "rgba(56,189,248,0.06)",
            border: "1px solid rgba(56,189,248,0.15)",
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs opacity-50 mb-0.5">Active Stations</p>
              <p
                className="text-3xl font-black font-mono"
                style={{ color: "#38BDF8", letterSpacing: "-0.05em" }}
              >
                {loading ? "—" : totalStations.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-50 mb-0.5">Live Coverage</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{
                  color: coverageRate > 60 ? "#22C55E" : "#FACC15",
                }}
              >
                {loading ? "—" : `${coverageRate}%`}
              </p>
            </div>
          </div>

          <div
            className="mt-2 h-1 rounded-full overflow-hidden"
            style={{ background: "#1F2937" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${coverageRate}%`,
                background:
                  "linear-gradient(90deg, #38BDF8, #818CF8)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Section B: Why This Matters ── */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "#1F2937" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: "#818CF8" }} />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#818CF8" }}
          >
            Why This Matters
          </span>
        </div>

        {selectedLocation ? (
          <div className="animate-fade-in">
            <div
              className="p-3 rounded-lg mb-3"
              style={{
                background: "rgba(129,140,248,0.06)",
                border: "1px solid rgba(129,140,248,0.15)",
              }}
            >
              <p className="text-sm font-semibold mb-1 leading-tight">
                {selectedLocation.name}
              </p>
              <p className="text-xs opacity-50">
                {selectedLocation.country?.name} ·{" "}
                {selectedLocation.locality || "Unknown locality"}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedLocation.sensors.slice(0, 6).map((s) => (
                  <span
                    key={s.id}
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{
                      background: "rgba(56,189,248,0.08)",
                      border: "1px solid rgba(56,189,248,0.2)",
                      color: "#38BDF8",
                    }}
                  >
                    {s.parameter.displayName || s.parameter.name}
                  </span>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs opacity-40">Risk Score</span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: selectedLocation.riskColor }}
                >
                  {selectedLocation.riskScore}/100 ·{" "}
                  {selectedLocation.riskLabel}
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed opacity-60">
              Air quality monitoring coverage directly correlates with
              population health outcomes. Stations like this enable
              real-time regulatory enforcement and early-warning
              systems — a strategic asset in climate-risk underwriting.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs leading-relaxed opacity-60 mb-3">
              Air pollution causes{" "}
              <span style={{ color: "#EF4444" }}>7 million premature deaths</span>{" "}
              annually. Monitoring network density is a leading indicator of
              governance quality and healthcare infrastructure investment —
              critical inputs for sovereign risk assessment.
            </p>
            <p className="text-xs leading-relaxed opacity-60">
              Data gaps in emerging markets represent both a health crisis and
              an intelligence blind spot for capital deployment decisions.
            </p>
            <div
              className="mt-3 p-2 rounded text-xs"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#EF4444",
              }}
            >
              <AlertCircle className="w-3 h-3 inline mr-1.5" />
              {staleCount.toLocaleString()} stations reporting stale data
            </div>
          </div>
        )}
      </div>

      {/* ── Section C: Who Controls the Rail ── */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "#1F2937" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-3.5 h-3.5" style={{ color: "#F97316" }} />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#F97316" }}
          >
            Who Controls the Rail
          </span>
        </div>

        {selectedLocation ? (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-start justify-between text-xs">
              <span className="opacity-50">Provider</span>
              <span className="text-right max-w-[60%] font-medium" style={{ color: "#38BDF8" }}>
                {selectedLocation.provider?.name || "Unknown"}
              </span>
            </div>
            <div className="flex items-start justify-between text-xs">
              <span className="opacity-50">Owner</span>
              <span className="text-right max-w-[60%] font-medium opacity-80">
                {selectedLocation.owner?.name || "Unknown"}
              </span>
            </div>
            <div className="flex items-start justify-between text-xs">
              <span className="opacity-50">Type</span>
              <span className="font-medium opacity-80">
                {selectedLocation.isMonitor ? "Reference Monitor" : "Low-cost Sensor"}
              </span>
            </div>
            <div className="flex items-start justify-between text-xs">
              <span className="opacity-50">Mobile</span>
              <span className="font-medium opacity-80">
                {selectedLocation.isMobile ? "Yes" : "No (Fixed)"}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs opacity-50 mb-2">Top countries by station density:</p>
            {loading ? (
              <div className="space-y-1.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-7 rounded animate-pulse"
                    style={{ background: "#1F2937" }}
                  />
                ))}
              </div>
            ) : (
              topCountries.slice(0, 6).map((c) => (
                <div
                  key={c.code}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="font-mono text-xs opacity-50 w-6 shrink-0"
                  >
                    {c.code}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="opacity-70 truncate">{c.name}</span>
                      <span
                        className="font-mono shrink-0 ml-1"
                        style={{ color: "#38BDF8" }}
                      >
                        {c.stationCount}
                      </span>
                    </div>
                    <div
                      className="h-0.5 rounded-full"
                      style={{ background: "#1F2937" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((c.stationCount / (topCountries[0]?.stationCount || 1)) * 100, 100)}%`,
                          background: "linear-gradient(90deg, #38BDF8, #818CF8)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Section D: Data Source Status ── */}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-3.5 h-3.5" style={{ color: "#38BDF8" }} />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#38BDF8" }}
          >
            Data Source Status
          </span>
        </div>

        <div className="space-y-2">
          {[
            {
              label: "OpenAQ v3 API",
              status: "live",
              detail: "api.openaq.org",
            },
            {
              label: "Locations Endpoint",
              status: "live",
              detail: `/v3/locations`,
            },
            {
              label: "Latest Readings",
              status: "live",
              detail: `/v3/locations/:id/latest`,
            },
            {
              label: "Countries Index",
              status: "live",
              detail: `/v3/countries`,
            },
            {
              label: "Synthetic Data",
              status: "none",
              detail: "Not used",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-xs"
            >
              {item.status === "live" ? (
                <CheckCircle2
                  className="w-3 h-3 shrink-0"
                  style={{ color: "#22C55E" }}
                />
              ) : (
                <Clock className="w-3 h-3 shrink-0 opacity-30" />
              )}
              <div className="flex-1 min-w-0">
                <span className={item.status === "none" ? "opacity-30" : "opacity-80"}>
                  {item.label}
                </span>
                <span className="opacity-30 ml-1 font-mono text-xs truncate block">
                  {item.detail}
                </span>
              </div>
              <span
                className="text-xs font-mono shrink-0"
                style={{
                  color:
                    item.status === "live"
                      ? "#22C55E"
                      : "rgba(255,255,255,0.2)",
                }}
              >
                {item.status === "live" ? "LIVE" : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Download CTA ── */}
      <div
        className="p-4 border-t mt-auto"
        style={{ borderColor: "#1F2937" }}
      >
        <button
          onClick={handleDownload}
          disabled={allLocations.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.3)",
            color: "#38BDF8",
          }}
          onMouseEnter={(e) => {
            if (allLocations.length > 0) {
              e.currentTarget.style.background = "rgba(56,189,248,0.18)";
              e.currentTarget.style.boxShadow =
                "0 0 12px rgba(56,189,248,0.2)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(56,189,248,0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <Download className="w-4 h-4" />
          Download Sample Data (.csv)
          <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
        </button>
        <p className="text-xs opacity-30 text-center mt-2">
          {allLocations.length.toLocaleString()} records · OpenAQ Open License
        </p>
      </div>
    </aside>
  );
}