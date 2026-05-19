// ============================================================
// DEXTERE Air Quality Intelligence — Core Logic Layer
// Mirrors Python/Pandas risk-score pipeline in TypeScript
// ============================================================

export interface OpenAQLocation {
  id: number;
  name: string;
  locality: string | null;
  timezone: string;
  country: { id: number; code: string; name: string };
  owner: { id: number; name: string };
  provider: { id: number; name: string };
  coordinates: { latitude: number; longitude: number };
  sensors: Array<{
    id: number;
    name: string;
    parameter: {
      id: number;
      name: string;
      units: string;
      displayName: string;
    };
  }>;
  lastUpdated: string;
  datetimeFirst: { utc: string; local: string };
  datetimeLast: { utc: string; local: string };
  bounds: number[];
  distance: number | null;
  isMobile: boolean;
  isMonitor: boolean;
}

export interface LatestReading {
  datetime: { utc: string; local: string };
  value: number;
  coordinates: { latitude: number; longitude: number };
  sensorsId: number;
  locationsId: number;
  parameter?: string;
  unit?: string;
}

export interface EnrichedLocation extends OpenAQLocation {
  riskScore: number;
  riskLabel: string;
  riskColor: string;
  aqiCategory: string;
  pm25Value: number | null;
  pm10Value: number | null;
  staleness: "live" | "recent" | "stale" | "unknown";
  parameterCount: number;
}

// ─── AQI Breakpoints (US EPA PM2.5) ───────────────────────
const PM25_BREAKPOINTS = [
  { min: 0,     max: 12,   aqi_min: 0,   aqi_max: 50,  label: "Good",            color: "#22C55E" },
  { min: 12.1,  max: 35.4, aqi_min: 51,  aqi_max: 100, label: "Moderate",        color: "#FACC15" },
  { min: 35.5,  max: 55.4, aqi_min: 101, aqi_max: 150, label: "Unhealthy (SG)",  color: "#F97316" },
  { min: 55.5,  max: 150.4,aqi_min: 151, aqi_max: 200, label: "Unhealthy",       color: "#EF4444" },
  { min: 150.5, max: 250.4,aqi_min: 201, aqi_max: 300, label: "Very Unhealthy",  color: "#A855F7" },
  { min: 250.5, max: 500,  aqi_min: 301, aqi_max: 500, label: "Hazardous",       color: "#991B1B" },
];

export function calculateAQI(pm25: number): {
  aqi: number;
  label: string;
  color: string;
} {
  const bp = PM25_BREAKPOINTS.find(
    (b) => pm25 >= b.min && pm25 <= b.max
  ) || PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1];

  const aqi = Math.round(
    ((bp.aqi_max - bp.aqi_min) / (bp.max - bp.min)) * (pm25 - bp.min) +
      bp.aqi_min
  );

  return { aqi: Math.min(aqi, 500), label: bp.label, color: bp.color };
}

// ─── Staleness Check ───────────────────────────────────────
export function getStaleness(
  lastUpdated: string
): "live" | "recent" | "stale" | "unknown" {
  if (!lastUpdated) return "unknown";
  const diffMs = Date.now() - new Date(lastUpdated).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return "live";
  if (diffHours < 24) return "recent";
  return "stale";
}

// ─── Risk Score (0–100) ────────────────────────────────────
// Composite: parameter diversity (40%) + recency (30%) + coverage (30%)
export function calculateRiskScore(loc: OpenAQLocation): number {
  const paramScore = Math.min(loc.sensors.length / 8, 1) * 40;
  const staleness = getStaleness(loc.datetimeLast?.utc || "");
  const recencyScore =
    staleness === "live" ? 30 : staleness === "recent" ? 20 : 5;
  const coverageScore = loc.isMonitor ? 30 : 15;
  return Math.round(paramScore + recencyScore + coverageScore);
}

// ─── Enrich Location ──────────────────────────────────────
export function enrichLocation(loc: OpenAQLocation): EnrichedLocation {
  const riskScore = calculateRiskScore(loc);
  const staleness = getStaleness(loc.datetimeLast?.utc || "");

  const hasPM25 = loc.sensors.some(
    (s) =>
      s.parameter.name.toLowerCase().includes("pm25") ||
      s.parameter.name.toLowerCase().includes("pm2.5")
  );

  const riskLabel =
    riskScore >= 80
      ? "High Coverage"
      : riskScore >= 55
      ? "Moderate Coverage"
      : riskScore >= 30
      ? "Low Coverage"
      : "Sparse";

  const riskColor =
    riskScore >= 80
      ? "#38BDF8"
      : riskScore >= 55
      ? "#818CF8"
      : riskScore >= 30
      ? "#FACC15"
      : "#EF4444";

  return {
    ...loc,
    riskScore,
    riskLabel,
    riskColor,
    aqiCategory: hasPM25 ? "PM2.5 Enabled" : "Partial",
    pm25Value: null,
    pm10Value: null,
    staleness,
    parameterCount: loc.sensors.length,
  };
}

// ─── Country-level aggregation ────────────────────────────
export interface CountryStats {
  code: string;
  name: string;
  stationCount: number;
  avgRiskScore: number;
  liveStations: number;
  monitorCount: number;
}

export function aggregateByCountry(
  locations: EnrichedLocation[]
): CountryStats[] {
  const map = new Map<string, EnrichedLocation[]>();
  for (const loc of locations) {
    const code = loc.country?.code || "XX";
    if (!map.has(code)) map.set(code, []);
    map.get(code)!.push(loc);
  }

  return Array.from(map.entries())
    .map(([code, locs]) => ({
      code,
      name: locs[0]?.country?.name || code,
      stationCount: locs.length,
      avgRiskScore: Math.round(
        locs.reduce((a, b) => a + b.riskScore, 0) / locs.length
      ),
      liveStations: locs.filter((l) => l.staleness === "live").length,
      monitorCount: locs.filter((l) => l.isMonitor).length,
    }))
    .sort((a, b) => b.stationCount - a.stationCount);
}

// ─── CSV Export ───────────────────────────────────────────
export function exportToCSV(locations: EnrichedLocation[]): string {
  const headers = [
    "ID",
    "Name",
    "Country",
    "Latitude",
    "Longitude",
    "Risk Score",
    "Risk Label",
    "Staleness",
    "Parameters",
    "Is Monitor",
    "Last Updated",
  ];

  const rows = locations.map((loc) => [
    loc.id,
    `"${loc.name?.replace(/"/g, "'") || ""}"`,
    loc.country?.code || "",
    loc.coordinates?.latitude || "",
    loc.coordinates?.longitude || "",
    loc.riskScore,
    loc.riskLabel,
    loc.staleness,
    loc.parameterCount,
    loc.isMonitor,
    loc.datetimeLast?.utc || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// ─── Parameter Display Name map ───────────────────────────
export const PARAM_DISPLAY: Record<string, string> = {
  pm25: "PM2.5",
  "pm2.5": "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  o3: "O₃",
  co: "CO",
  so2: "SO₂",
  bc: "BC",
  no: "NO",
  nox: "NOₓ",
  voc: "VOC",
  humidity: "RH",
  temperature: "Temp",
  pressure: "Pressure",
};

export function formatParamName(name: string): string {
  return PARAM_DISPLAY[name.toLowerCase()] || name.toUpperCase();
}
