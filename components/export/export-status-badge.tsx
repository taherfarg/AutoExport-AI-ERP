import { Badge } from "@/components/ui/badge";
import { formatExportStatus } from "@/lib/export/format";

const STATUS_CLASS: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  active: "border-blue-200 bg-blue-50 text-blue-700",
  waiting_booking: "border-slate-200 bg-slate-50 text-slate-700",
  booked: "border-blue-200 bg-blue-50 text-blue-700",
  vehicle_delivered_to_port: "border-indigo-200 bg-indigo-50 text-indigo-700",
  loaded: "border-cyan-200 bg-cyan-50 text-cyan-700",
  shipped: "border-orange-200 bg-orange-50 text-orange-700",
  arrived: "border-violet-200 bg-violet-50 text-violet-700",
  under_clearance: "border-amber-200 bg-amber-50 text-amber-700",
  delivered_to_customer: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cleared: "border-emerald-200 bg-emerald-50 text-emerald-700",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending_documents: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  uploaded: "border-blue-200 bg-blue-50 text-blue-700",
  delayed: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  missing: "border-red-200 bg-red-50 text-red-700",
  expired: "border-red-200 bg-red-50 text-red-700",
};

export function ExportStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50"}>
      {formatExportStatus(status)}
    </Badge>
  );
}
