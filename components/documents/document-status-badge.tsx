import { Badge } from "@/components/ui/badge";
import { formatDocumentStatus } from "@/lib/documents/format";

const STATUS_CLASS: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  uploaded: "border-blue-200 bg-blue-50 text-blue-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  signed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sent: "border-blue-200 bg-blue-50 text-blue-700",
  viewed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  expired: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  archived: "border-slate-200 bg-slate-50 text-slate-700",
  missing: "border-red-200 bg-red-50 text-red-700",
  expiring_soon: "border-orange-200 bg-orange-50 text-orange-700",
  no_expiry: "border-slate-200 bg-slate-50 text-slate-700",
};

export function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50"}>
      {formatDocumentStatus(status)}
    </Badge>
  );
}
