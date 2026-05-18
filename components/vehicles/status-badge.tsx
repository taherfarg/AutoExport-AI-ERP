import { Badge } from "@/components/ui/badge";
import { formatVehicleStatus } from "@/lib/vehicles/format";

const STATUS_CLASS_NAMES: Record<string, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  reserved: "border-amber-200 bg-amber-50 text-amber-700",
  sold: "border-slate-200 bg-slate-100 text-slate-700",
  in_transit: "border-blue-200 bg-blue-50 text-blue-700",
  under_customs_clearance: "border-violet-200 bg-violet-50 text-violet-700",
  under_preparation: "border-orange-200 bg-orange-50 text-orange-700",
  ready_for_export: "border-cyan-200 bg-cyan-50 text-cyan-700",
  delivered: "border-zinc-200 bg-zinc-100 text-zinc-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

export function VehicleStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS_NAMES[status] ?? ""}>
      {formatVehicleStatus(status)}
    </Badge>
  );
}

