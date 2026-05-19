import { Badge } from "@/components/ui/badge";
import { formatMarketingStatus } from "@/lib/marketing/format";

const STATUS_CLASS: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  active: "border-blue-200 bg-blue-50 text-blue-700",
  scheduled: "border-indigo-200 bg-indigo-50 text-indigo-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  planned: "border-amber-200 bg-amber-50 text-amber-700",
  sold: "border-violet-200 bg-violet-50 text-violet-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  archived: "border-slate-200 bg-slate-50 text-slate-700",
};

export function MarketingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50"}>
      {formatMarketingStatus(status)}
    </Badge>
  );
}
