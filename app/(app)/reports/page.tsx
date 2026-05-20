import { BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OperationsStatusBadge } from "@/components/operations/operations-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranches } from "@/features/branches/queries";
import { getOperationsPermissions, getReportsDashboardData } from "@/features/operations/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatOperationsStatus } from "@/lib/operations/format";
import { formatMoney } from "@/lib/vehicles/format";
import { ReportExportForm, ReportScheduleForm } from "./report-action-forms";

export default async function ReportsPage() {
  const workspace = await getCurrentWorkspace();
  const [data, branches, permissions] = await Promise.all([
    getReportsDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getOperationsPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const defaultReport = data.savedReports[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Reports</h2>
        <p className="text-sm text-slate-500">Operational reports, analytics snapshots, exports, and schedules.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Vehicles" value={String(data.summary.totalVehicles)} hint={`${data.summary.availableVehicles} available`} />
        <KpiCard title="Sales" value={formatMoney(data.summary.salesTotal, "AED")} hint="Invoice total" />
        <KpiCard title="Pending payments" value={formatMoney(data.summary.pendingPayments, "AED")} hint="Open invoice balances" />
        <KpiCard title="Expected profit" value={formatMoney(data.summary.expectedProfit, "AED")} hint="Stock margin snapshot" />
        <KpiCard title="Delayed exports" value={String(data.summary.delayedExports)} hint="Export orders needing attention" />
        <KpiCard title="Cost per lead" value={formatMoney(data.summary.marketingCostPerLead, "AED")} hint="Marketing spend / leads" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved reports</CardTitle>
              <CardDescription>Reusable tenant-scoped report definitions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Report</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.savedReports.map((report) => (
                      <tr key={report.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{report.name}</p>
                          <p className="text-xs text-slate-500">{report.report_number}</p>
                        </td>
                        <td className="px-4 py-3">{formatOperationsStatus(report.report_type)}</td>
                        <td className="px-4 py-3 text-slate-600">{report.description ?? "Custom report"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report exports</CardTitle>
              <CardDescription>CSV exports are active now; PDF and Excel records are integration-ready.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.reportExports.map((reportExport) => (
                <div key={reportExport.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{reportExport.export_number}</p>
                      <p className="text-xs text-slate-500">{formatOperationsStatus(reportExport.report_type)} - {reportExport.export_format.toUpperCase()}</p>
                    </div>
                    <OperationsStatusBadge status={reportExport.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{reportExport.result_summary ?? "Queued for processing."}</p>
                </div>
              ))}
              {data.reportExports.length === 0 ? <p className="text-sm text-slate-500">No report exports yet.</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canManageReports ? (
            <Card>
              <CardHeader>
                <CardTitle>Create export</CardTitle>
                <CardDescription>Save a report export request with filters and audit trail.</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportExportForm branchId={defaultBranchId} companyId={workspace.companyId} savedReportId={defaultReport?.id} />
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageReports && defaultReport ? (
            <Card>
              <CardHeader>
                <CardTitle>Schedule report</CardTitle>
                <CardDescription>Create recurring report delivery metadata.</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportScheduleForm
                  branchId={defaultBranchId}
                  companyId={workspace.companyId}
                  email={workspace.email}
                  savedReportId={defaultReport.id}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Schedules</CardTitle>
              <CardDescription>Active recurring report definitions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.reportSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium text-slate-950">{schedule.name}</p>
                  <p className="text-xs text-slate-500">{schedule.schedule_number} - {formatOperationsStatus(schedule.frequency)} at {schedule.run_time}</p>
                </div>
              ))}
              {data.reportSchedules.length === 0 ? <p className="text-sm text-slate-500">No schedules yet.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics scope</CardTitle>
              <CardDescription>Current operational report inputs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-orange-500" /> Inventory, sales, profit, export, marketing, and branch metrics.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
