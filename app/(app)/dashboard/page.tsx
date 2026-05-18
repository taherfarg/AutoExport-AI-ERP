import { KpiCard } from "@/components/dashboard/kpi-card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Dashboard</h2>
        <p className="text-sm text-slate-500">
          Phase 1 foundation is connected to your secured workspace.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Tenant Isolation"
          value="RLS"
          hint="Company data is protected by database policies."
        />
        <KpiCard title="Subscription" value="Starter" hint="Module access is package-gated." />
        <KpiCard title="Branches" value="Ready" hint="Branch setup is available in settings." />
        <KpiCard
          title="Users"
          value="RBAC"
          hint="Roles and permissions are part of the foundation."
        />
      </div>
    </div>
  );
}
