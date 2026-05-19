import { Badge } from "@/components/ui/badge";
import { formatAiStatus } from "@/lib/ai/format";

const STATUS_CLASS: Record<string, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  queued: "border-amber-200 bg-amber-50 text-amber-700",
  processing: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  executed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approval_required: "border-orange-200 bg-orange-50 text-orange-700",
  proposed: "border-blue-200 bg-blue-50 text-blue-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  archived: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AiStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50"}>
      {formatAiStatus(status)}
    </Badge>
  );
}
