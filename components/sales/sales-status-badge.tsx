import { Badge } from "@/components/ui/badge";
import { formatSalesStatus } from "@/lib/sales/format";

const STATUS_CLASS: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  sent: "border-blue-200 bg-blue-50 text-blue-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  converted: "border-orange-200 bg-orange-50 text-orange-700",
  active: "border-orange-200 bg-orange-50 text-orange-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial_payment: "border-amber-200 bg-amber-50 text-amber-700",
  unpaid: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
};

export function SalesStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50"}>
      {formatSalesStatus(status)}
    </Badge>
  );
}

