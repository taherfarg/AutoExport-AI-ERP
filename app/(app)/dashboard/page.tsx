import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMoney } from "@/lib/vehicles/format";
import {
  loadDashboardData,
  computeDashboardKpis,
  salesByMonth,
  stockByBrand,
  stockByBranch,
  leadsBySource,
  carsByStatus,
  exportDestinations,
  stockAging,
  profitByBranch,
  inventoryValueByBranch,
} from "@/features/dashboard/queries";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  SalesByMonthChart,
  StockByBrandChart,
  CarsByStatusChart,
  LeadsBySourceChart,
  ExportDestinationsChart,
  StockAgingChart,
  StockByBranchChart,
  ProfitByBranchChart,
  InventoryValueChart,
} from "@/components/dashboard/dashboard-charts";
import { AiInsightsCard } from "@/components/dashboard/ai-insights";
import {
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  FileWarning,
  Globe2,
  Package,
  ShieldAlert,
  Ship,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
  Wallet,
  BarChart3,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  const { vehicles, leads, invoices, exportOrders } = await loadDashboardData(workspace.companyId);
  const kpis = computeDashboardKpis(vehicles, leads, invoices, exportOrders);

  const fmt = (n: number) => formatMoney(n, kpis.currency);

  // Chart data
  const salesData = salesByMonth(invoices);
  const brandData = stockByBrand(vehicles);
  const branchStockData = stockByBranch(vehicles);
  const statusData = carsByStatus(vehicles);
  const sourceData = leadsBySource(leads);
  const exportData = exportDestinations(exportOrders);
  const agingData = stockAging(vehicles);
  const profitData = profitByBranch(vehicles);
  const inventoryData = inventoryValueByBranch(vehicles);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Command Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live business intelligence across all modules
        </p>
      </div>

      {/* KPI Row 1 — Inventory */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Inventory
        </h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5 stagger-children">
          <KpiCard
            title="Total Cars"
            value={String(kpis.totalCars)}
            hint="All vehicles in system"
            icon={Car}
            iconColor="text-orange-500"
            iconBgColor="bg-orange-50"
          />
          <KpiCard
            title="Available"
            value={String(kpis.availableCars)}
            hint="Ready for sale"
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            iconBgColor="bg-emerald-50"
            trend={kpis.availableCars > 0 ? "up" : "flat"}
            trendLabel={kpis.availableCars > 0 ? "In stock" : "None"}
          />
          <KpiCard
            title="Reserved"
            value={String(kpis.reservedCars)}
            hint="Pending deposit/delivery"
            icon={Clock}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-50"
          />
          <KpiCard
            title="Stock Value"
            value={fmt(kpis.inventoryValue)}
            hint="Active inventory at sell price"
            icon={DollarSign}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50"
          />
          <KpiCard
            title="Ready for Export"
            value={String(kpis.readyForExport)}
            hint="Export-ready vehicles"
            icon={Globe2}
            iconColor="text-cyan-500"
            iconBgColor="bg-cyan-50"
          />
        </div>
      </section>

      {/* KPI Row 2 — Sales & Finance */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sales & Finance
        </h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 stagger-children">
          <KpiCard
            title="Sold This Month"
            value={String(kpis.soldThisMonth)}
            hint="Vehicles sold this month"
            icon={TrendingUp}
            iconColor="text-emerald-500"
            iconBgColor="bg-emerald-50"
            trend="up"
            trendLabel={`${kpis.soldThisMonth} deals`}
          />
          <KpiCard
            title="Monthly Revenue"
            value={fmt(kpis.monthlySales)}
            hint="Invoiced this month"
            icon={Wallet}
            iconColor="text-violet-500"
            iconBgColor="bg-violet-50"
          />
          <KpiCard
            title="Monthly Profit"
            value={fmt(kpis.monthlyProfit)}
            hint="Estimated profit this month"
            icon={BarChart3}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-50"
          />
          <KpiCard
            title="Pending Payments"
            value={fmt(kpis.pendingPayments)}
            hint="Unpaid invoice balances"
            icon={AlertTriangle}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-50"
            trend={kpis.pendingPayments > 0 ? "down" : "flat"}
            trendLabel={kpis.pendingPayments > 0 ? "Action needed" : "Clear"}
          />
        </div>
      </section>

      {/* KPI Row 3 — CRM & Operations */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          CRM & Operations
        </h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 stagger-children">
          <KpiCard
            title="New Leads"
            value={String(kpis.newLeads)}
            hint="Last 30 days"
            icon={UserPlus}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50"
          />
          <KpiCard
            title="Hot Leads"
            value={String(kpis.hotLeads)}
            hint="Score ≥ 70"
            icon={Zap}
            iconColor="text-orange-500"
            iconBgColor="bg-orange-50"
          />
          <KpiCard
            title="Follow-ups Today"
            value={String(kpis.followUpsDueToday)}
            hint="Due today"
            icon={CalendarClock}
            iconColor="text-violet-500"
            iconBgColor="bg-violet-50"
            trend={kpis.followUpsDueToday > 0 ? "up" : "flat"}
            trendLabel={kpis.followUpsDueToday > 0 ? "Pending" : "Clear"}
          />
          <KpiCard
            title="In Transit"
            value={String(kpis.inTransit)}
            hint="Shipments en route"
            icon={Ship}
            iconColor="text-cyan-500"
            iconBgColor="bg-cyan-50"
          />
        </div>
      </section>

      {/* KPI Row 4 — Alerts */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Alerts & Warnings
        </h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 stagger-children">
          <KpiCard
            title="Missing Documents"
            value={String(kpis.missingDocuments)}
            hint="Incomplete doc checklists"
            icon={FileWarning}
            iconColor="text-rose-500"
            iconBgColor="bg-rose-50"
            trend={kpis.missingDocuments > 0 ? "down" : "flat"}
            trendLabel={kpis.missingDocuments > 0 ? "Needs attention" : "All complete"}
          />
          <KpiCard
            title="Low Margin"
            value={String(kpis.lowMarginCars)}
            hint="Profit margin < 5%"
            icon={ShieldAlert}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-50"
          />
          <KpiCard
            title="Aging Stock"
            value={String(kpis.agingStock60Days)}
            hint="In stock over 60 days"
            icon={Package}
            iconColor="text-rose-500"
            iconBgColor="bg-rose-50"
          />
          <KpiCard
            title="Under Customs"
            value={String(kpis.underCustoms)}
            hint="Pending clearance"
            icon={Users}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50"
          />
        </div>
      </section>

      {/* Charts Grid */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Analytics
        </h3>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SalesByMonthChart data={salesData} />
          </div>
          <AiInsightsCard kpis={kpis} />
          <StockByBrandChart data={brandData} />
          <CarsByStatusChart data={statusData} />
          <LeadsBySourceChart data={sourceData} />
          <StockByBranchChart data={branchStockData} />
          <ExportDestinationsChart data={exportData} />
          <StockAgingChart data={agingData} />
          <ProfitByBranchChart data={profitData} />
          <InventoryValueChart data={inventoryData} />
        </div>
      </section>
    </div>
  );
}
