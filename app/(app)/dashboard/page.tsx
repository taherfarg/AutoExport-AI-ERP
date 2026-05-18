import { KpiCard } from "@/components/dashboard/kpi-card";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMoney } from "@/lib/vehicles/format";
import { getInventoryStats, getVehicles } from "@/features/vehicles/queries";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  const vehicles = await getVehicles(workspace.companyId);
  const stats = getInventoryStats(vehicles);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Dashboard</h2>
        <p className="text-sm text-slate-500">
          Live workspace overview powered by tenant-secure Supabase data.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total cars"
          value={String(stats.total)}
          hint="Vehicles visible to your permissions."
        />
        <KpiCard
          title="Available"
          value={String(stats.available)}
          hint="Cars ready for showroom or export sale."
        />
        <KpiCard title="Reserved" value={String(stats.reserved)} hint="Cars currently on hold." />
        <KpiCard
          title="Stock value"
          value={formatMoney(stats.inventoryValue, vehicles[0]?.currency_code ?? "AED")}
          hint="Selling value of visible stock."
        />
      </div>
    </div>
  );
}
