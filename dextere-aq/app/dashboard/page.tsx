"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import DextereHeader from "@/components/DextereHeader";
import IntelligenceSidebar from "@/components/IntelligenceSidebar";
import AQWorldMap from "@/components/AQWorldMap";
import FilterBar from "@/components/FilterBar";
import CountryChart from "@/components/CountryChart";
import {
  enrichLocation,
  aggregateByCountry,
  type EnrichedLocation,
  type CountryStats,
} from "@/lib/aqUtils";

interface OpenAQMeta {
  found: number;
  page: number;
  limit: number;
}

interface DropdownCountry {
  id: number;
  code: string;
  name: string;
}

export default function DashboardPage() {
  const [allLocations, setAllLocations] = useState<EnrichedLocation[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [globalCountryStats, setGlobalCountryStats] = useState<CountryStats[]>([]); // Permanent master chart tracker
  const [countries, setCountries] = useState<DropdownCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<EnrichedLocation | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "monitor">("all");
  const [country, setCountry] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [meta, setMeta] = useState<OpenAQMeta | null>(null);

  // Fetch countries index on load
  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => {
        if (data.results) {
          setCountries(
            data.results.map((c: any) => ({
              id: c.id,
              code: c.code,
              name: c.name,
            }))
          );

          // Build fake mock instances that match aggregateByCountry signatures 
          // to perfectly calculate normalized charts weights
          const mockLocations = data.results.flatMap((c: any) => {
            const count = c.locations || c.sensors || 0;
            // Generate basic tracking objects for aqUtils to count up natively
            return Array.from({ length: Math.min(count, 500) }, () => ({
              country: { code: c.code, name: c.name }
            }));
          });

          // Run your standard chart pipeline generator over the full set
          const parsedMasterStats = aggregateByCountry(mockLocations as any);
          setGlobalCountryStats(parsedMasterStats);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch locations matching filter specifications
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200", page: "1" });
      if (country) {
        params.set("country", country);
      }

      const res = await fetch(`/api/locations?${params}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      if (data.results) {
        const enriched = data.results.map(enrichLocation);
        setAllLocations(enriched);
        setCountryStats(aggregateByCountry(enriched));
        setMeta(data.meta);
        setLastRefresh(new Date().toUTCString().slice(17, 25) + " UTC");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Filtered locations calculation block
  const filteredLocations = useMemo(() => {
    return allLocations.filter((loc) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          loc.name?.toLowerCase().includes(q) ||
          loc.country?.name?.toLowerCase().includes(q) ||
          loc.country?.code?.toLowerCase().includes(q) ||
          loc.locality?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filter === "live" && loc.staleness !== "live") return false;
      if (filter === "monitor" && !loc.isMonitor) return false;
      return true;
    });
  }, [allLocations, search, filter]);

  const liveCount = useMemo(
    () => allLocations.filter((l) => l.staleness === "live").length,
    [allLocations]
  );

  return (
    <div
      className="flex flex-col h-screen noise-overlay"
      style={{ background: "#030712" }}
    >
      {/* Header */}
      <DextereHeader
        stationCount={allLocations.length}
        liveCount={liveCount}
        lastRefresh={lastRefresh || "—"}
      />

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={setFilter}
        country={country}
        onCountry={setCountry}
        countries={countries}
        onRefresh={fetchLocations}
        loading={loading}
      />

      {/* Main Split Interface Layout */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0" style={{ width: "70%" }}>
          {/* Map canvas frame wrapper */}
          <div className="flex-1 relative">
            {loading && allLocations.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                    style={{ borderColor: "#38BDF8", borderTopColor: "transparent" }}
                  />
                  <p className="text-sm opacity-50">
                    Connecting to OpenAQ v3…
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
                    API Connection Error
                  </p>
                  <p className="text-xs opacity-50 mb-4">{error}</p>
                  <button
                    onClick={fetchLocations}
                    className="text-xs px-4 py-2 rounded"
                    style={{
                      background: "rgba(56,189,248,0.1)",
                      border: "1px solid rgba(56,189,248,0.3)",
                      color: "#38BDF8",
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <AQWorldMap
                locations={filteredLocations}
                onSelectLocation={setSelectedLocation}
                selectedId={selectedLocation?.id ?? null}
              />
            )}
          </div>

          {/* Bottom Metagrouping metrics & graphics panels */}
          <div
            className="px-4 py-3 border-t shrink-0"
            style={{ borderColor: "#1F2937", background: "rgba(11,17,23,0.9)" }}
          >
            <div className="flex items-center gap-4 mb-2">
              {meta && (
                <span className="text-xs opacity-30 font-mono">
                  OpenAQ reports {meta.found?.toLocaleString()} total stations globally
                </span>
              )}
              <span className="text-xs opacity-30 font-mono ml-auto">
                Showing {filteredLocations.length.toLocaleString()} ·{" "}
                {filter !== "all"
                  ? filter === "live"
                    ? "Live filter active"
                    : "Reference monitors only"
                  : "No filter"}
              </span>
            </div>
            
            {/* The normalized stats dataset */}
            {globalCountryStats.length > 0 && (
              <CountryChart data={globalCountryStats} />
            )}
          </div>
        </main>

        <IntelligenceSidebar
          selectedLocation={selectedLocation}
          countryStats={countryStats}
          totalStations={allLocations.length}
          liveStations={liveCount}
          loading={loading}
          allLocations={allLocations}
        />
      </div>
    </div>
  );
}