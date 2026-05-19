import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { getVehicles } from "@/features/vehicles/queries";
import { formatMoney, formatVehicleStatus } from "@/lib/vehicles/format";
import { Globe2, Package, Ship, MapPin, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GlobalStockCharts } from "./global-stock-charts";

export default async function GlobalStockPage() {
  const workspace = await getCurrentWorkspace();
  const vehicles = await getVehicles(workspace.companyId);

  const currency = vehicles[0]?.currency_code ?? "AED";

  // Exclude sold/cancelled/delivered for active stock views
  const activeVehicles = vehicles.filter(
    (v) => !["sold", "cancelled", "delivered"].includes(v.status),
  );

  // KPIs
  const totalActive = activeVehicles.length;
  const totalValue = activeVehicles.reduce((s, v) => s + Number(v.selling_price), 0);
  const exportReady = activeVehicles.filter((v) => v.export_available).length;
  const inTransit = activeVehicles.filter((v) => v.status === "in_transit").length;

  // Country aggregation
  const countryMap = new Map<string, { count: number; value: number }>();
  for (const v of activeVehicles) {
    const country = v.current_country_code || "Unknown";
    const existing = countryMap.get(country) ?? { count: 0, value: 0 };
    existing.count++;
    existing.value += Number(v.selling_price);
    countryMap.set(country, existing);
  }
  const byCountry = Array.from(countryMap.entries())
    .map(([country, data]) => ({ country, ...data }))
    .sort((a, b) => b.count - a.count);

  // Branch aggregation
  const branchMap = new Map<string, { count: number; value: number; country: string }>();
  for (const v of activeVehicles) {
    const branchName = v.branches?.name ?? "Unknown";
    const existing = branchMap.get(branchName) ?? { count: 0, value: 0, country: v.branches?.country_code ?? "" };
    existing.count++;
    existing.value += Number(v.selling_price);
    branchMap.set(branchName, existing);
  }
  const byBranch = Array.from(branchMap.entries())
    .map(([branch, data]) => ({ branch, ...data }))
    .sort((a, b) => b.count - a.count);

  // Brand aggregation
  const brandMap = new Map<string, number>();
  for (const v of activeVehicles) {
    brandMap.set(v.brand, (brandMap.get(v.brand) ?? 0) + 1);
  }
  const byBrand = Array.from(brandMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status aggregation
  const statusMap = new Map<string, number>();
  for (const v of vehicles) {
    statusMap.set(v.status, (statusMap.get(v.status) ?? 0) + 1);
  }
  const byStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status: formatVehicleStatus(status), count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Global Stock View
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-branch, cross-region inventory intelligence
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 stagger-children">
        <KpiCard
          title="Active Stock"
          value={String(totalActive)}
          hint="Across all branches"
          icon={Package}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-50"
        />
        <KpiCard
          title="Stock Value"
          value={formatMoney(totalValue, currency)}
          hint="At selling price"
          icon={BarChart3}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-50"
        />
        <KpiCard
          title="Export Ready"
          value={String(exportReady)}
          hint="Available for export"
          icon={Globe2}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-50"
        />
        <KpiCard
          title="In Transit"
          value={String(inTransit)}
          hint="Currently shipping"
          icon={Ship}
          iconColor="text-cyan-500"
          iconBgColor="bg-cyan-50"
        />
      </div>

      {/* Charts */}
      <GlobalStockCharts
        byBrand={byBrand}
        byStatus={byStatus}
      />

      {/* Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* By Country */}
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-orange-500" />
            Stock by Country
          </h3>
          <div className="space-y-2">
            {byCountry.length === 0 && (
              <p className="text-xs text-muted-foreground">No stock data</p>
            )}
            {byCountry.map((row) => (
              <div
                key={row.country}
                className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{countryFlag(row.country)}</span>
                  <span className="text-xs font-medium text-foreground">
                    {row.country}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(row.value, currency)}
                  </span>
                  <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-orange-100 px-2 text-[11px] font-semibold text-orange-700">
                    {row.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Branch */}
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            Stock by Branch
          </h3>
          <div className="space-y-2">
            {byBranch.length === 0 && (
              <p className="text-xs text-muted-foreground">No branch data</p>
            )}
            {byBranch.map((row) => (
              <div
                key={row.branch}
                className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{countryFlag(row.country)}</span>
                  <span className="text-xs font-medium text-foreground">
                    {row.branch}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(row.value, currency)}
                  </span>
                  <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-blue-100 px-2 text-[11px] font-semibold text-blue-700">
                    {row.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Convert country code to emoji flag */
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
