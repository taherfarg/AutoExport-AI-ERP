"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";

const BRAND_COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
];

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="h-56">{children}</div>
    </div>
  );
}

/* ---------- Sales By Month (Area Chart) ---------- */

type SalesByMonthData = { label: string; revenue: number; profit: number }[];

export function SalesByMonthChart({ data }: { data: SalesByMonthData }) {
  return (
    <ChartCard title="Sales Revenue" subtitle="Last 6 months">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={compactNum} />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(214 31.8% 91.4%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [compactNum(value), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#f97316"
            strokeWidth={2.5}
            fill="url(#gradRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Stock By Brand (Bar Chart) ---------- */

type StockByBrandData = { brand: string; count: number }[];

export function StockByBrandChart({ data }: { data: StockByBrandData }) {
  return (
    <ChartCard title="Stock by Brand" subtitle="Active inventory">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            {data.map((_, idx) => (
              <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Cars By Status (Pie Chart) ---------- */

type CarsByStatusData = { status: string; count: number }[];

export function CarsByStatusChart({ data }: { data: CarsByStatusData }) {
  return (
    <ChartCard title="Cars by Status" subtitle="All vehicles">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={45}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
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
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Leads By Source (Bar Chart) ---------- */

type LeadsBySourceData = { source: string; count: number }[];

export function LeadsBySourceChart({ data }: { data: LeadsBySourceData }) {
  return (
    <ChartCard title="Leads by Source" subtitle="All time">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
          <YAxis dataKey="source" type="category" width={90} tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(214 31.8% 91.4%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Export Destinations (Bar Chart) ---------- */

type ExportDestData = { country: string; count: number }[];

export function ExportDestinationsChart({ data }: { data: ExportDestData }) {
  return (
    <ChartCard title="Export Destinations" subtitle="Orders by country">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
          <XAxis dataKey="country" tick={{ fontSize: 10, fill: "#94a3b8" }} />
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
            {data.map((_, idx) => (
              <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Stock Aging (Bar Chart) ---------- */

type StockAgingData = { range: string; count: number }[];

const AGING_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

export function StockAgingChart({ data }: { data: StockAgingData }) {
  return (
    <ChartCard title="Stock Aging" subtitle="Days in inventory">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} />
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
            {data.map((_, idx) => (
              <Cell key={idx} fill={AGING_COLORS[idx % AGING_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Stock By Branch (Bar Chart) ---------- */

type StockByBranchData = { branch: string; count: number }[];

export function StockByBranchChart({ data }: { data: StockByBranchData }) {
  return (
    <ChartCard title="Stock by Branch" subtitle="Active stock distribution">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
          <XAxis dataKey="branch" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(214 31.8% 91.4%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Profit By Branch (Bar Chart) ---------- */

type ProfitByBranchData = { branch: string; profit: number }[];

export function ProfitByBranchChart({ data }: { data: ProfitByBranchData }) {
  return (
    <ChartCard title="Profit by Branch" subtitle="Sold vehicles">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 31.8% 91.4%)" />
          <XAxis dataKey="branch" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={compactNum} />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(214 31.8% 91.4%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [compactNum(value), "Profit"]}
          />
          <Bar dataKey="profit" radius={[6, 6, 0, 0]} fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Inventory Value By Branch (Pie) ---------- */

type InventoryValueByBranchData = { branch: string; value: number }[];

export function InventoryValueChart({ data }: { data: InventoryValueByBranchData }) {
  return (
    <ChartCard title="Inventory Value" subtitle="By branch (selling price)">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="branch"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={45}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(214 31.8% 91.4%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [compactNum(value), "Value"]}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------- Helpers ---------- */

function compactNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
