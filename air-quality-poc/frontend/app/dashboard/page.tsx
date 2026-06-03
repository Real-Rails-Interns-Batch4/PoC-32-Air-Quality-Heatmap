"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import IntelligenceSidebar from "@/components/IntelligenceSidebar";
import AQWorldMap from "@/components/AQWorldMap";
import FilterBar from "@/components/FilterBar";

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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
  const registryLabel = meta?.found
    ? `${displayedStationTotal.toLocaleString()} total locations globally`
    : `${allLocations.length.toLocaleString()} locations loaded${hasMore ? " with more available" : ""}`;
  const panelStats = countryStats.length > 0 ? countryStats : globalCountryStats;

  return (
    <div className="relative h-screen w-screen overflow-hidden noise-overlay" style={{ background: "#041512" }}>
      <AQWorldMap
        locations={allLocations}
        onSelectLocation={setSelectedLocation}
        selectedId={selectedLocation?.id ?? null}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
        <div className="pointer-events-auto">
          <AppHeader
            stationCount={displayedStationTotal}
            liveCount={liveCount}
            lastRefresh={lastRefresh || "-"}
          />
        </div>

        <div className="pointer-events-auto mx-4 mt-3 max-w-[1040px]">
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
        </div>
      </div>

      {loading && allLocations.length === 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#22C55E", borderTopColor: "transparent" }}
            />
            <p className="font-mono text-sm opacity-60">Streaming FastAPI intelligence blocks...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <div
            className="glass-card max-w-md rounded-lg p-6 text-center"
            style={{ border: "1px solid rgba(239,68,68,0.28)" }}
          >
            <p className="mb-2 text-sm font-semibold" style={{ color: "#EF4444" }}>
              API Pipeline Disconnected
            </p>
            <p className="mb-4 text-xs opacity-50">{error}</p>
            <button
              onClick={() => fetchLocations(1, false)}
              className="rounded px-4 py-2 text-xs"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#22C55E",
              }}
            >
              Reconnect Terminal Link
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-5 left-5 z-40 flex items-end gap-3">
        <div
          className="rounded-lg px-3 py-2 font-mono text-[10px]"
          style={{ background: "rgba(7,27,26,0.82)", border: "1px solid rgba(125,211,182,0.18)" }}
        >
          <span className="opacity-40">OpenAQ registry tracks </span>
          <span style={{ color: "#7DD3B6" }}>{registryLabel}</span>
        </div>
        <div
          className="rounded-lg px-3 py-2 font-mono text-[10px]"
          style={{ background: "rgba(7,27,26,0.82)", border: "1px solid rgba(125,211,182,0.18)" }}
        >
          <span className="opacity-40">Buffer </span>
          <span style={{ color: "#FACC15" }}>{allLocations.length.toLocaleString()} items</span>
        </div>
      </div>

      {hasMore && !error && allLocations.length > 0 && (
        <button
          onClick={loadNextChunk}
          disabled={loadingMore}
          className="absolute bottom-5 right-5 z-40 rounded px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
          style={{
            background: "rgba(7,27,26,0.9)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#22C55E",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          {loadingMore ? "Streaming Array Segment..." : "Fetch Next Chunk Layer"}
        </button>
      )}

      {selectedLocation && (
        <div className="absolute inset-y-0 right-0 z-50 flex w-full justify-end bg-black/20 backdrop-blur-[1px]">
          <div className="relative h-full w-full max-w-[430px] animate-slide-in">
            <button
              onClick={() => setSelectedLocation(null)}
              className="absolute right-4 top-4 z-10 rounded-full px-2 py-1 text-xs"
              style={{ background: "rgba(4,21,18,0.92)", border: "1px solid rgba(125,211,182,0.22)", color: "#D8FFF0" }}
              aria-label="Close intelligence panel"
            >
              Close
            </button>
            <IntelligenceSidebar
              selectedLocation={selectedLocation}
              countryStats={panelStats}
              totalStations={displayedStationTotal}
              liveStations={liveCount}
              loading={loading}
              allLocations={allLocations}
            />
          </div>
        </div>
      )}
    </div>
  );
}
