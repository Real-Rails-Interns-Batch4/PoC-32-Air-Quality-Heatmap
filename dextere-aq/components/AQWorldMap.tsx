"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { EnrichedLocation } from "@/lib/aqUtils";

interface MapProps {
  locations: EnrichedLocation[];
  onSelectLocation: (loc: EnrichedLocation | null) => void;
  selectedId: number | null;
}

// Pure Equirectangular projection maps lat/lng consistently to a 1000×500 grid space
function lx(lng: number) { return ((lng + 180) / 360) * 1000; }
function ly(lat: number) { return ((90 - lat) / 180) * 500; }

// ── Fixed TopoJSON → SVG path converter ──────────────────────
function topoToSVGPaths(topo: any): string[] {
  const land = topo.objects.countries;
  const arcs = topo.arcs as number[][][];
  const { scale, translate } = topo.transform;
  const paths: string[] = [];

  // Decode arc: delta → absolute coords → lng/lat → SVG x/y
  const decodeArc = (arcIdx: number): [number, number][] => {
    const reversed = arcIdx < 0;
    const idx = reversed ? ~arcIdx : arcIdx;
    const raw = arcs[idx];
    let x = 0, y = 0;
    
    const pts = raw.map(([dx, dy]) => {
      x += dx; y += dy;
      const lng = x * scale[0] + translate[0];
      const lat = y * scale[1] + translate[1];
      return [lx(lng), ly(lat)] as [number, number];
    });
    return reversed ? pts.reverse() : pts;
  };

  const geomToPath = (geom: any): string => {
    const buildRing = (arcIdxList: number[]) => {
      const pts = arcIdxList.flatMap(decodeArc);
      if (pts.length === 0) return "";
      
      let pathStr = "";
      let lastX = -1;
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (i === 0 || Math.abs(x - lastX) > 500) {
          pathStr += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
        } else {
          pathStr += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        lastX = x;
      }
      return pathStr + " Z";
    };

    if (geom.type === "Polygon") {
      return geom.arcs.map(buildRing).join(" ");
    }
    if (geom.type === "MultiPolygon") {
      return geom.arcs.map((poly: number[][]) => poly.map(buildRing).join(" ")).join(" ");
    }
    return "";
  };

  for (const geom of land.geometries) {
    const d = geomToPath(geom);
    if (d) paths.push(d);
  }
  return paths;
}

export default function AQWorldMap({ locations, onSelectLocation, selectedId }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 420 }); // Set optimized baseline safety height metrics
  const landPathsRef = useRef<string[]>([]);
  const [landPathsLoaded, setLandPathsLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; loc: EnrichedLocation } | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 500 });
  const isDragging = useRef(false);
  const lastPt = useRef({ x: 0, y: 0 });

  // Load Natural Earth TopoJSON from CDN securely using cached layout checks
  useEffect(() => {
    if (landPathsRef.current.length > 0) {
      setMapLoading(false);
      setLandPathsLoaded(true);
      return;
    }
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        landPathsRef.current = topoToSVGPaths(topo);
        setLandPathsLoaded(true);
        setMapLoading(false);
      })
      .catch(() => {
        setMapLoading(false);
      });
  }, []);

  // Rigid structural resize listener to isolate chart components from size oscillation feedback
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setDims({
        w: el.clientWidth || 800,
        h: el.clientHeight || 420
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const screenToSVG = (cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM()?.inverse();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.82 : 1.22;
    const { x: mx, y: my } = screenToSVG(e.clientX, e.clientY);
    setViewBox((v) => {
      const nw = Math.max(120, Math.min(1000, v.w * factor));
      const nh = nw * 0.5;
      return {
        x: mx - (mx - v.x) * (nw / v.w),
        y: my - (my - v.y) * (nh / v.h),
        w: nw, h: nh,
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).tagName === "circle") return;
    isDragging.current = true;
    lastPt.current = screenToSVG(e.clientX, e.clientY);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const cur = screenToSVG(e.clientX, e.clientY);
    setViewBox((v) => ({
      ...v,
      x: v.x - (cur.x - lastPt.current.x),
      y: v.y - (cur.y - lastPt.current.y),
    }));
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const stations = locations
    .filter((l) => l.coordinates?.latitude != null && l.coordinates?.longitude != null)
    .map((loc) => ({
      loc,
      x: lx(loc.coordinates.longitude),
      y: ly(loc.coordinates.latitude),
    }));

  const zoomFactor = 1000 / viewBox.w;
  const baseR = Math.max(1.5, Math.min(5, 2.5 / Math.sqrt(zoomFactor)));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#020C16", cursor: isDragging.current ? "grabbing" : "grab" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={() => onSelectLocation(null)}
    >
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{ display: "block" }}
      >
        <rect x="-500" y="-250" width="2000" height="1000" fill="#020C16" />

        {[-60, -30, 0, 30, 60].map((lat) => (
          <line key={`lat${lat}`}
            x1={-500} y1={ly(lat)} x2={1500} y2={ly(lat)}
            stroke={lat === 0 ? "#112233" : "#0A1A26"}
            strokeWidth={lat === 0 ? 0.8 : 0.4}
            strokeDasharray={lat === 0 ? "" : "4 10"}
          />
        ))}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => (
          <line key={`lng${lng}`}
            x1={lx(lng)} y1={-250} x2={lx(lng)} y2={750}
            stroke={lng === 0 ? "#112233" : "#0A1A26"}
            strokeWidth={lng === 0 ? 0.8 : 0.4}
            strokeDasharray={lng === 0 ? "" : "4 10"}
          />
        ))}

        {!mapLoading && landPathsLoaded && (
          <g>
            {landPathsRef.current.map((d, i) => (
              <path key={`land-${i}`} d={d}
                fill="#0D2235"
                stroke="#1B3D58"
                strokeWidth={0.5}
                strokeLinejoin="round"
                fillRule="evenodd"
              />
            ))}
          </g>
        )}

        {stations
          .sort((a, b) => a.loc.riskScore - b.loc.riskScore)
          .map(({ loc, x, y }) => {
            const sel = loc.id === selectedId;
            const r = sel ? baseR * 2.2 : loc.isMonitor ? baseR * 1.4 : baseR;
            const color = loc.staleness === "live" ? "#38BDF8"
              : loc.staleness === "recent" ? "#818CF8" : "#2D4060";

            return (
              <g key={`station-node-${loc.id}`}>
                {loc.staleness === "live" && (
                  <circle cx={x} cy={y} r={r * 2.5}
                    fill="none" stroke="#38BDF8" strokeWidth={0.3} opacity={0.2} />
                )}
                {sel && (
                  <circle cx={x} cy={y} r={r * 4}
                    fill="none" stroke="#38BDF8" strokeWidth={0.8}
                    opacity={0.6} strokeDasharray="3 2" />
                )}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  fillOpacity={sel ? 1 : loc.staleness === "live" ? 0.9 : 0.5}
                  stroke={sel ? "#38BDF8" : loc.staleness === "live" ? "rgba(56,189,248,0.5)" : "transparent"}
                  strokeWidth={sel ? 1 : 0.5}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, loc });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLocation(sel ? null : loc);
                  }}
                />
              </g>
            );
          })}

        {[-60, -30, 0, 30, 60].map((lat) => (
          <text key={`lbl${lat}`}
            x={viewBox.x + viewBox.w * 0.005}
            y={ly(lat) - viewBox.h * 0.01}
            fill="rgba(255,255,255,0.2)"
            fontSize={viewBox.w * 0.013}
            fontFamily="monospace"
          >
            {lat}°
          </text>
        ))}
      </svg>

      {tooltip && (
        <div className="absolute z-20 pointer-events-none rounded-lg p-3 w-52"
          style={{
            left: Math.min(tooltip.x + 14, dims.w - 220),
            top: Math.max(tooltip.y - 95, 8),
            border: "1px solid rgba(56,189,248,0.3)",
            background: "rgba(11,17,23,0.97)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-xs font-semibold truncate mb-0.5" style={{ color: "#38BDF8" }}>
            {tooltip.loc.name}
          </p>
          <p className="text-xs opacity-40 mb-2">{tooltip.loc.country?.code} · {tooltip.loc.locality || "—"}</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>
              <p className="opacity-40">Risk</p>
              <p className="font-mono font-bold" style={{ color: tooltip.loc.riskColor }}>{tooltip.loc.riskScore}/100</p>
            </div>
            <div>
              <p className="opacity-40">Status</p>
              <p className="font-bold" style={{
                color: tooltip.loc.staleness === "live" ? "#22C55E"
                  : tooltip.loc.staleness === "recent" ? "#FACC15" : "#EF4444"
              }}>{tooltip.loc.staleness.toUpperCase()}</p>
            </div>
            <div>
              <p className="opacity-40">Sensors</p>
              <p className="font-mono" style={{ color: "#818CF8" }}>{tooltip.loc.parameterCount}</p>
            </div>
            <div>
              <p className="opacity-40">Type</p>
              <p className="opacity-70">{tooltip.loc.isMonitor ? "Monitor" : "Sensor"}</p>
            </div>
          </div>
          <p className="text-xs opacity-25 mt-2">Click to inspect</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 rounded-lg p-3"
        style={{ background: "rgba(11,17,23,0.92)", border: "1px solid #1F2937" }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#38BDF8" }}>
          Station Status
        </p>
        {[
          { color: "#38BDF8", label: "Live (< 1hr)" },
          { color: "#818CF8", label: "Recent (< 24hr)" },
          { color: "#2D4060", label: "Stale (> 24hr)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-xs opacity-60">{item.label}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 text-xs opacity-25" style={{ borderTop: "1px solid #1F2937" }}>
          Scroll to zoom · Drag to pan
        </div>
      </div>

      <div className="absolute top-3 right-3 font-mono text-xs px-2 py-1 rounded"
        style={{ background: "rgba(11,17,23,0.8)", border: "1px solid #1F2937", color: "rgba(255,255,255,0.3)" }}>
        {stations.length} stations plotted
      </div>
    </div>
  );
}