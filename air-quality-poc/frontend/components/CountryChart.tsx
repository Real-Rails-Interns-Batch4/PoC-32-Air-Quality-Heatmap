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
      style={{ border: "1px solid rgba(34,197,94,0.2)", background: "#071B1A" }}
    >
      <p className="font-semibold mb-1" style={{ color: "#22C55E" }}>
        {d.name} ({d.code})
      </p>
      <p className="opacity-60">
        Stations: <span className="font-mono text-white">{d.stationCount}</span>
      </p>
      <p className="opacity-60">
        Live: <span className="font-mono" style={{ color: "#22C55E" }}>{d.liveStations}</span>
      </p>
      <p className="opacity-60">
        Monitors: <span className="font-mono" style={{ color: "#FACC15" }}>{d.monitorCount}</span>
      </p>
    </div>
  );
};

export default function CountryChart({ data }: Props) {
  // Take only the top 10 countries to keep the chart clean and legible
  const top10 = data.slice(0, 10);

  return (
    <div
      className="glass-card rounded-lg p-3 w-full"
      style={{ border: "1px solid #17302E", background: "rgba(3, 7, 18, 0.4)", height: "150px" }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: "#FACC15" }}
        >
          Station Distribution by Country
        </p>
        <span className="text-[10px] opacity-30 font-mono">Top 10 Nodes</span>
      </div>

      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={top10} margin={{ top: 4, right: 4, bottom: 4, left: -25 }}>
          <XAxis
            dataKey="code"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
            axisLine={{ stroke: "#17302E" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: "rgba(34,197,94,0.04)" }} 
          />
          <Bar dataKey="stationCount" radius={[2, 2, 0, 0]}>
            {top10.map((_, i) => (
              <Cell
                key={`cell-${i}`}
                fill={i === 0 ? "#22C55E" : i < 3 ? "#FACC15" : "#374151"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
