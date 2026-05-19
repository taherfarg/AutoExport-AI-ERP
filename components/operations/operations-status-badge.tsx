import { formatOperationsStatus } from "@/lib/operations/format";

const STATUS_CLASS: Record<string, string> = {
  open: "border-orange-200 bg-orange-50 text-orange-700",
  assigned: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  queued: "border-blue-200 bg-blue-50 text-blue-700",
  snoozed: "border-slate-200 bg-slate-50 text-slate-600",
  blocked: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function OperationsStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {formatOperationsStatus(status)}
    </span>
  );
}
