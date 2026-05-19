"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CountryStats } from "@/lib/aqUtils";

interface Props {
  data: CountryStats[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CountryStats;
  return (
    <div
      className="glass-card rounded-lg p-3 text-xs"
      style={{ border: "1px solid rgba(56,189,248,0.2)" }}
    >
      <p className="font-semibold mb-1" style={{ color: "#38BDF8" }}>
        {d.name} ({d.code})
      </p>
      <p className="opacity-60">Stations: <span className="font-mono text-white">{d.stationCount}</span></p>
      <p className="opacity-60">Live: <span className="font-mono" style={{ color: "#22C55E" }}>{d.liveStations}</span></p>
      <p className="opacity-60">Monitors: <span className="font-mono" style={{ color: "#818CF8" }}>{d.monitorCount}</span></p>
    </div>
  );
};

export default function CountryChart({ data }: Props) {
  const top10 = data.slice(0, 10);

  return (
    <div
      className="glass-card rounded-lg p-4"
      style={{ border: "1px solid #1F2937" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "#818CF8" }}
        >
          Station Distribution by Country
        </p>
        <span className="text-xs opacity-30 font-mono">Top 10</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={top10} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
          <XAxis
            dataKey="code"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={{ stroke: "#1F2937" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(56,189,248,0.04)" }} />
          <Bar dataKey="stationCount" radius={[2, 2, 0, 0]}>
            {top10.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? "#38BDF8" : i < 3 ? "#818CF8" : "#1F2937"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
