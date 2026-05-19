"use client";
import { Activity, Wifi } from "lucide-react";

export default function DextereHeader({
  stationCount,
  liveCount,
  lastRefresh,
}: {
  stationCount: number;
  liveCount: number;
  lastRefresh: string;
}) {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b shrink-0"
      style={{
        background: "rgba(11,17,23,0.95)",
        borderColor: "#1F2937",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left — Brand */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "#38BDF8",
              boxShadow: "0 0 8px rgba(56,189,248,0.8)",
            }}
          />
          <span
            className="font-bold tracking-tighter text-sm"
            style={{ color: "#38BDF8", letterSpacing: "-0.04em" }}
          >
            dex
          </span>
          <span
            className="font-bold tracking-tighter text-sm"
            style={{ color: "#818CF8", letterSpacing: "-0.04em" }}
          >
            TERE
          </span>
        </div>
        <div
          className="h-4 w-px mx-1"
          style={{ background: "#1F2937" }}
        />
        <span className="text-xs font-medium tracking-widest uppercase opacity-50">
          Air Quality Intelligence
        </span>
      </div>

      {/* Center — System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full status-dot-live"
            style={{ background: "#22C55E" }}
          />
          <span className="text-xs" style={{ color: "#22C55E" }}>
            LIVE
          </span>
        </div>
        <span className="text-xs opacity-40">
          OpenAQ v3 · {lastRefresh}
        </span>
      </div>

      {/* Right — Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3.5 h-3.5" style={{ color: "#38BDF8" }} />
          <span className="opacity-60">Stations:</span>
          <span style={{ color: "#38BDF8" }} className="font-mono font-semibold">
            {stationCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Wifi className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
          <span className="opacity-60">Live:</span>
          <span style={{ color: "#22C55E" }} className="font-mono font-semibold">
            {liveCount.toLocaleString()}
          </span>
        </div>
        <div
          className="px-2 py-0.5 rounded text-xs font-mono"
          style={{
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.2)",
            color: "#38BDF8",
          }}
        >
          PoC v1.0
        </div>
      </div>
    </header>
  );
}
