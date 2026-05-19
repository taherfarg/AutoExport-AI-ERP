import { ShieldCheck } from "lucide-react";
import { OperationsStatusBadge } from "@/components/operations/operations-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditLogData, getOperationsPermissions } from "@/features/operations/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatOperationsStatus } from "@/lib/operations/format";

export default async function AuditLogsPage() {
  const workspace = await getCurrentWorkspace();
  const [logs, permissions] = await Promise.all([
    getAuditLogData(workspace.companyId),
    getOperationsPermissions(workspace.companyId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Audit Logs</h2>
        <p className="text-sm text-slate-500">Security and sensitive action history for the current workspace.</p>
      </div>

      {!permissions.canViewAuditLogs ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Your role cannot view audit logs.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Recent activity
            </CardTitle>
            <CardDescription>Latest tenant-scoped audit events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-slate-950">{formatOperationsStatus(log.action)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatOperationsStatus(log.entity_type)}</td>
                      <td className="px-4 py-3 text-slate-600">{log.actor?.full_name ?? log.actor?.email ?? "System"}</td>
                      <td className="px-4 py-3"><OperationsStatusBadge status={log.severity} /></td>
                      <td className="px-4 py-3 text-slate-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.created_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
