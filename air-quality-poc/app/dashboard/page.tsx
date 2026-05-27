"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import IntelligenceSidebar from "@/components/IntelligenceSidebar";
import AQWorldMap from "@/components/AQWorldMap";
import FilterBar from "@/components/FilterBar";
import CountryChart from "@/components/CountryChart";

const BACKEND_BASE = "http://127.0.0.1:8000";
const LOCATION_PAGE_SIZE = 500;

interface OpenAQMeta {
  found: number | null;
  foundLabel: number | string;
  page: number;
  limit: number;
  returned: number;
  hasMore: boolean;
}

interface DropdownCountry {
  id: number;
  code: string;
  name: string;
}

export default function DashboardPage() {
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [countryStats, setCountryStats] = useState<any[]>([]);
  const [globalCountryStats, setGlobalCountryStats] = useState<any[]>([]);
  const [countries, setCountries] = useState<DropdownCountry[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "monitor">("all");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalLocations, setTotalLocations] = useState<number | null>(null);
  
  const [lastRefresh, setLastRefresh] = useState("");
  const [meta, setMeta] = useState<OpenAQMeta | null>(null);

  // Initialize master lookup fields from backend on component mount
  useEffect(() => {
    fetch(`${BACKEND_BASE}/api/bootstrap`)
      .then((r) => r.json())
      .then((data) => {
        if (data.countries) {
          setCountries(
            data.countries.map((c: any) => ({
              id: c.id,
              code: c.code,
              name: c.name,
            }))
          );
        }
        if (data.countryStats) {
          setGlobalCountryStats(data.countryStats);
        }
        if (typeof data.totalLocations === "number" && data.totalLocations > 0) {
          setTotalLocations(data.totalLocations);
        }
      })
      .catch((err) => console.error("Backend bootstrap sync failure:", err));
  }, []);

  // Central Core Location Query Function: Merges progressive streaming data chunks
  const fetchLocations = useCallback(async (targetPage: number, appendMode: boolean = false) => {
    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: LOCATION_PAGE_SIZE.toString(),
        page: targetPage.toString(),
        filter_type: filter,
      });
      
      if (country && country !== "") {
        params.set("country_id", country);
      }
      if (search) {
        params.set("search", search);
      }

      const res = await fetch(`${BACKEND_BASE}/api/locations?${params.toString()}`);
      if (!res.ok) throw new Error(`FastAPI server transmission error [${res.status}]`);
      const data = await res.json();

      if (data.results) {
        const structuredResults = data.results.map((loc: any) => ({
          ...loc,
          country: { code: loc.country_code, name: loc.country_name },
          provider: { name: loc.provider_name },
          owner: { name: loc.owner_name },
          coordinates: { latitude: loc.latitude, longitude: loc.longitude },
          datetimeLast: { utc: loc.last_updated },
          isMonitor: loc.is_monitor,
          isMobile: loc.is_mobile,
          riskScore: loc.risk_score,
          riskLabel: loc.risk_label,
          riskColor: loc.risk_color,
          parameterCount: loc.sensor_count,
        }));

        setAllLocations((prev) => (appendMode ? [...prev, ...structuredResults] : structuredResults));
        setCountryStats(data.countryStats || []);
        setMeta(data.meta);
        setLastRefresh(new Date().toUTCString().slice(17, 25) + " UTC");

        if (data.meta) {
          setHasMore(Boolean(data.meta.hasMore));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Internal interface synchronization fault");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [country, filter, search]);

  useEffect(() => {
    setPage(1);
    fetchLocations(1, false);
  }, [country, filter, search, fetchLocations]);

  const loadNextChunk = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLocations(nextPage, true);
    }
  }, [page, hasMore, loadingMore, fetchLocations]);

  const liveCount = useMemo(
    () => allLocations.filter((l) => l.staleness === "live").length,
    [allLocations]
  );
  const displayedStationTotal = meta?.found ?? totalLocations ?? allLocations.length;
  const chartStats = countryStats.length > 0 ? countryStats : globalCountryStats;
  const registryLabel = meta?.found
    ? `${displayedStationTotal.toLocaleString()} total locations globally`
    : `${allLocations.length.toLocaleString()} locations loaded${hasMore ? " with more available" : ""}`;

  return (
    <div 
      key={allLocations.length > 0 ? "loaded" : "loading"} // Force-trigger a re-render on data change
      className="flex flex-col noise-overlay" 
      style={{ background: "#030712", width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      {/* Header Panel */}
      <AppHeader
        stationCount={displayedStationTotal}
        liveCount={liveCount}
        lastRefresh={lastRefresh || "—"}
      />

      {/* Filter Control Bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={setFilter}
        country={country}
        onCountry={setCountry}
        countries={countries}
        onRefresh={() => fetchLocations(1, false)}
        loading={loading}
      />

      {/* Main Split Interface Layout Workspace */}
      <div className="flex flex-row w-full" style={{ height: "calc(100vh - 110px)", overflow: "hidden" }}>
        
        {/* Left Workspace Column: Explicitly bounded via Viewport calculation math */}
        <main 
  className="relative bg-[#030712]" 
  style={{ width: "72%", height: "calc(100vh - 110px)", position: "relative", overflow: "hidden" }}
>
  
  {/* MAP ELEMENT BOX: Hard-clamped using absolute positioning top coordinates */}
  <div 
    className="absolute top-0 left-0 w-full bg-[#020C16]" 
    style={{ bottom: "200px", position: "absolute", overflow: "hidden" }}
  >
    {loading && allLocations.length === 0 ? (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "#38BDF8", borderTopColor: "transparent" }}
          />
          <p className="text-sm opacity-50 font-mono">
            Streaming Integrated FastAPI Blocks...
          </p>
        </div>
      </div>
    ) : error ? (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="glass-card rounded-xl p-6 max-w-md text-center"
          style={{ border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: "#EF4444" }}>
            API Pipeline Disconnected
          </p>
          <p className="text-xs opacity-50 mb-4">{error}</p>
          <button
            onClick={() => fetchLocations(1, false)}
            className="text-xs px-4 py-2 rounded"
            style={{
              background: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.3)",
              color: "#38BDF8",
            }}
          >
            Reconnect Terminal Link
          </button>
        </div>
      </div>
    ) : (
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        <AQWorldMap
          locations={allLocations}
          onSelectLocation={setSelectedLocation}
          selectedId={selectedLocation?.id ?? null}
        />
        
        {/* Floating Progressive Chunk Ingestion Button Layer */}
        {hasMore && (
          <button
            onClick={loadNextChunk}
            disabled={loadingMore}
            className="font-mono text-[10px] px-4 py-2 rounded uppercase tracking-wider text-cyan transition-all border border-cyan/30 bg-[#0B1117] hover:border-cyan hover:bg-cyan/10 cursor-pointer shadow-2xl"
            style={{ position: "absolute", bottom: "16px", right: "16px", zIndex: 9999 }}
          >
            {loadingMore ? "Streaming Array Segment..." : "Fetch Next Chunk Layer"}
          </button>
        )}
      </div>
    )}
  </div>

  {/* FIXED METRICS PANEL: Hardcoded to slide directly into the bottom viewport lane */}
  <div
    className="px-4 py-2 border-t"
    style={{ 
      borderColor: "#1F2937", 
      background: "#0B1117", 
      position: "absolute",
      bottom: "0px",
      left: "0px",
      width: "100%",
      height: "200px", 
      boxSizing: "border-box",
      zIndex: 40
    }}
  >
    <div className="flex items-center gap-4 mb-1">
      {meta && (
        <span className="text-[10px] opacity-30 font-mono">
          OpenAQ registry tracks {registryLabel}
        </span>
      )}
      <span className="text-[10px] opacity-30 font-mono ml-auto">
        Buffer memory layer handling {allLocations.length.toLocaleString()} items
      </span>
    </div>
    
    {/* Bounded Chart container wrapper anchor box */}
    <div className="w-full h-[155px]" style={{ height: "155px", position: "relative" }}>
      {chartStats.length > 0 && (
        <CountryChart data={chartStats} />
      )}
    </div>
  </div>
</main>

        {/* Real-time Cyber Intelligence Telemetry Panel Sidebar */}
        <IntelligenceSidebar
          selectedLocation={selectedLocation}
          countryStats={countryStats.length > 0 ? countryStats : globalCountryStats}
          totalStations={displayedStationTotal}
          liveStations={liveCount}
          loading={loading}
          allLocations={allLocations}
        />
      </div>
    </div>
  );
}
