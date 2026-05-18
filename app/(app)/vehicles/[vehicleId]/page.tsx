import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, MoveRight } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { VehicleStatusBadge } from "@/components/vehicles/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { archiveVehicle, moveVehicleBranch, updateVehicleStatus } from "@/features/vehicles/actions";
import {
  getVehicleBranchMovements,
  getVehicleDetail,
  getVehiclePermissions,
  getVehicleStatusHistory,
} from "@/features/vehicles/queries";
import { getBranches } from "@/features/branches/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { daysBetween, formatMoney, formatVehicleStatus } from "@/lib/vehicles/format";

const VEHICLE_STATUSES = [
  "available",
  "reserved",
  "sold",
  "in_transit",
  "under_customs_clearance",
  "under_preparation",
  "ready_for_export",
  "delivered",
  "cancelled",
];

type VehicleDetailPageProps = {
  params: Promise<{ vehicleId: string }>;
};

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { vehicleId } = await params;
  const workspace = await getCurrentWorkspace();

  let vehicle;
  try {
    vehicle = await getVehicleDetail(workspace.companyId, vehicleId);
  } catch {
    notFound();
  }

  const [permissions, branches, statusHistory, branchMovements] = await Promise.all([
    getVehiclePermissions(workspace.companyId),
    getBranches(workspace.companyId),
    getVehicleStatusHistory(workspace.companyId, vehicleId),
    getVehicleBranchMovements(workspace.companyId, vehicleId),
  ]);
  const documentReadiness = vehicle.documents_status === "verified" || vehicle.documents_status === "complete" ? 100 : vehicle.documents_status === "partial" ? 50 : 0;
  const exportReadiness = vehicle.export_available && documentReadiness === 100 && vehicle.photos_status === "complete" ? 100 : vehicle.export_available ? 60 : 20;

  async function updateStatusFromForm(formData: FormData) {
    "use server";

    await updateVehicleStatus(formData);
  }

  async function moveBranchFromForm(formData: FormData) {
    "use server";

    await moveVehicleBranch(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/vehicles">
              <ArrowLeft className="h-4 w-4" />
              Back to inventory
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">
                {vehicle.year} {vehicle.brand} {vehicle.model}
              </h2>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
            <p className="text-sm text-slate-500">
              {vehicle.stock_number} / {vehicle.vin}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canUpdate ? (
            <form action={updateStatusFromForm} className="flex gap-2">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <select name="status" defaultValue={vehicle.status} className="h-9 rounded-md border bg-white px-3 text-sm">
                {VEHICLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatVehicleStatus(status)}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">Update status</Button>
            </form>
          ) : null}
          {permissions.canDelete ? (
            <form action={archiveVehicle}>
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <Button type="submit" variant="destructive">
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {permissions.canViewCost ? (
          <KpiCard
            title="Total landed cost"
            value={formatMoney(vehicle.total_landed_cost, vehicle.currency_code)}
            hint="Purchase, shipping, customs, prep, marketing"
          />
        ) : null}
        <KpiCard
          title="Selling price"
          value={formatMoney(vehicle.selling_price, vehicle.currency_code)}
          hint="Customer-facing price"
        />
        {permissions.canViewProfit ? (
          <>
            <KpiCard
              title="Expected profit"
              value={formatMoney(vehicle.expected_profit, vehicle.currency_code)}
              hint="Selling price minus landed cost"
            />
            <KpiCard
              title="Margin"
              value={`${Number(vehicle.profit_margin).toFixed(1)}%`}
              hint="Expected profit over selling price"
            />
          </>
        ) : null}
        <KpiCard title="Days in stock" value={String(daysBetween(vehicle.acquired_at))} hint="Since acquisition date" />
        <KpiCard title="Documents" value={`${documentReadiness}%`} hint={vehicle.documents_status} />
        <KpiCard title="Export readiness" value={`${exportReadiness}%`} hint={vehicle.export_available ? "Export available" : "Local sale only"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>Vehicle identity and customer-facing details</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm md:grid-cols-3">
                {[
                  ["Brand", vehicle.brand],
                  ["Model", vehicle.model],
                  ["Trim", vehicle.trim ?? "-"],
                  ["Condition", formatVehicleStatus(vehicle.condition)],
                  ["Mileage", `${vehicle.mileage.toLocaleString()} km`],
                  ["Exterior", vehicle.exterior_color ?? "-"],
                  ["Interior", vehicle.interior_color ?? "-"],
                  ["Engine", vehicle.engine ?? "-"],
                  ["Transmission", vehicle.transmission ?? "-"],
                  ["Drivetrain", vehicle.drivetrain ?? "-"],
                  ["Fuel", vehicle.fuel_type ?? "-"],
                  ["Body", vehicle.body_type ?? "-"],
                  ["Seats", vehicle.seats?.toString() ?? "-"],
                  ["Doors", vehicle.doors?.toString() ?? "-"],
                  ["Origin", vehicle.origin_country_code],
                  ["Current country", vehicle.current_country_code],
                  ["Location", vehicle.current_location ?? vehicle.branches?.name ?? "-"],
                  ["Export", vehicle.export_available ? "Available" : "Not available"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {permissions.canViewCost ? (
            <Card>
              <CardHeader>
                <CardTitle>Cost breakdown</CardTitle>
                <CardDescription>Permission-controlled landed cost calculation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  {[
                    ["Purchase price", vehicle.purchase_price],
                    ["Shipping", vehicle.shipping_cost],
                    ["Customs", vehicle.customs_cost],
                    ["Preparation", vehicle.preparation_cost],
                    ["Marketing", vehicle.marketing_cost],
                    ["Other expenses", vehicle.other_expenses],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-md border px-4 py-3">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-medium">{formatMoney(Number(value), vehicle.currency_code)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {permissions.canUpdate ? (
            <Card>
              <CardHeader>
                <CardTitle>Move branch</CardTitle>
                <CardDescription>Transfer this vehicle between company branches</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={moveBranchFromForm} className="grid gap-3">
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <Label htmlFor="branchId">Destination branch</Label>
                  <select id="branchId" name="branchId" defaultValue={vehicle.branch_id} className="h-9 rounded-md border bg-white px-3 text-sm">
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit">
                    <MoveRight className="h-4 w-4" />
                    Move vehicle
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Listing readiness</CardTitle>
              <CardDescription>Marketing and document metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Website</span>
                  <span className="font-medium">{formatVehicleStatus(vehicle.website_listing_status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Social media</span>
                  <span className="font-medium">{formatVehicleStatus(vehicle.social_media_status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documents</span>
                  <span className="font-medium">{formatVehicleStatus(vehicle.documents_status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Photos</span>
                  <span className="font-medium">{formatVehicleStatus(vehicle.photos_status)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status timeline</CardTitle>
              <CardDescription>{statusHistory.length} status events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusHistory.map((event) => (
                  <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{formatVehicleStatus(event.new_status)}</p>
                    <p className="text-xs text-slate-500">{new Date(event.changed_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch movements</CardTitle>
              <CardDescription>{branchMovements.length} transfer records</CardDescription>
            </CardHeader>
            <CardContent>
              {branchMovements.length === 0 ? (
                <p className="text-sm text-slate-500">No branch movements recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {branchMovements.map((movement) => (
                    <div key={movement.id} className="rounded-md border px-3 py-2 text-sm">
                      <p className="font-medium">Moved to branch</p>
                      <p className="text-xs text-slate-500">{new Date(movement.moved_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
