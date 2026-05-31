"use client";
import { Activity, Info, Layers, Wifi } from "lucide-react";
import { useState } from "react";

export default function AppHeader({
  stationCount,
  liveCount,
  lastRefresh,
}: {
  stationCount: number;
  liveCount: number;
  lastRefresh: string;
}) {
  const [showMeta, setShowMeta] = useState(false);
  const stack = "Next.js 14, TypeScript, Tailwind CSS, FastAPI, Pandas, OpenAQ v3";

  return (
    <header
      className="mx-4 mt-4 flex h-12 items-center justify-between rounded-lg px-4 text-white"
      style={{
        background: "rgba(4,21,18,0.82)",
        border: "1px solid rgba(125,211,182,0.18)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)" }}
        >
          <Layers className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#D8FFF0" }}>
            Air Quality Intelligence
          </p>
          <p className="font-mono text-[10px] opacity-45">OpenAQ v3 - {lastRefresh}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-xs sm:flex">
          <Activity className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
          <span className="opacity-55">Stations</span>
          <span className="font-mono font-semibold" style={{ color: "#D8FFF0" }}>
            {stationCount.toLocaleString()}
          </span>
        </div>
        <div className="hidden items-center gap-2 text-xs sm:flex">
          <Wifi className="h-3.5 w-3.5" style={{ color: "#FACC15" }} />
          <span className="opacity-55">Live</span>
          <span className="font-mono font-semibold" style={{ color: "#FACC15" }}>
            {liveCount.toLocaleString()}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMeta((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              background: showMeta ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(125,211,182,0.2)",
              color: "#D8FFF0",
            }}
            aria-label="Show project metadata"
          >
            <Info className="h-4 w-4" />
          </button>

          {showMeta && (
            <div
              className="absolute right-0 top-10 w-72 rounded-lg p-3 text-xs"
              style={{
                background: "rgba(4,21,18,0.96)",
                border: "1px solid rgba(125,211,182,0.22)",
                boxShadow: "0 22px 50px rgba(0,0,0,0.45)",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold uppercase tracking-widest" style={{ color: "#22C55E" }}>
                  Metadata
                </span>
                <span className="font-mono opacity-35">Batch 4</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <p><span className="opacity-40">git user:</span> Eternal66-6</p>
                <p><span className="opacity-40">name:</span> Ananthakrishnan A H</p>
                <p><span className="opacity-40">stack:</span> {stack}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
