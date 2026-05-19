import { Badge } from "@/components/ui/badge";
import { formatCrmStatus } from "@/lib/crm/format";

const STATUS_CLASS: Record<string, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700",
  contacted: "border-slate-200 bg-slate-50 text-slate-700",
  interested: "border-orange-200 bg-orange-50 text-orange-700",
  quotation_sent: "border-indigo-200 bg-indigo-50 text-indigo-700",
  reserved: "border-amber-200 bg-amber-50 text-amber-700",
  negotiation: "border-purple-200 bg-purple-50 text-purple-700",
  won: "border-emerald-200 bg-emerald-50 text-emerald-700",
  lost: "border-red-200 bg-red-50 text-red-700",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50"}>
      {formatCrmStatus(status)}
    </Badge>
  );
}

