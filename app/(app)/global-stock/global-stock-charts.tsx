"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6366f1",
];

type Props = {
  byBrand: { brand: string; count: number }[];
  byStatus: { status: string; count: number }[];
};

const CHART_HEIGHT = 224;

function MeasuredChart({
  children,
}: {
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const updateWidth = () => {
      setWidth(Math.max(0, Math.floor(frame.getBoundingClientRect().width)));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="h-full min-w-0 w-full">
      {width > 0 ? children({ width, height: CHART_HEIGHT }) : null}
    </div>
  );
}

export function GlobalStockCharts({ byBrand, byStatus }: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Brand distribution */}
      <div className="min-w-0 rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">Stock by Brand</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Top 10 brands in active inventory</p>
        <div className="h-56 min-w-0">
          <MeasuredChart>
            {({ width, height }) => (
            <BarChart width={width} height={height} data={byBrand} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
              <XAxis dataKey="brand" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(214 31.8% 91.4%)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {byBrand.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
            )}
          </MeasuredChart>
        </div>
      </div>

      {/* Status distribution */}
      <div className="min-w-0 rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">Status Distribution</h3>
        <p className="text-[11px] text-muted-foreground mb-4">All vehicles by current status</p>
        <div className="h-56 min-w-0">
          <MeasuredChart>
            {({ width, height }) => (
            <PieChart width={width} height={height}>
              <Pie
                data={byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={3}
                strokeWidth={0}
              >
                {byStatus.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(214 31.8% 91.4%)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>
                )}
              />
            </PieChart>
            )}
          </MeasuredChart>
        </div>
      </div>
    </div>
  );
}
