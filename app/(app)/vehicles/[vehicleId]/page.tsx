import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, FileText, ImageIcon, MoveRight, Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  addVehicleDocument,
  addVehiclePhoto,
  archiveVehicle,
  moveVehicleBranch,
  updateVehicleStatus,
} from "@/features/vehicles/actions";
import {
  getVehicleBranchMovements,
  getVehicleDocumentChecklist,
  getVehicleDocuments,
  getVehicleDetail,
  getVehiclePhotos,
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

const DOCUMENT_TYPES = [
  ["vehicle_title", "Vehicle title"],
  ["purchase_invoice", "Purchase invoice"],
  ["inspection_report", "Inspection report"],
  ["insurance", "Insurance"],
  ["export_certificate", "Export certificate"],
  ["certificate_of_origin", "Certificate of origin"],
  ["bill_of_lading", "Bill of lading"],
  ["customs_certificate", "Customs certificate"],
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

  const [
    permissions,
    branches,
    statusHistory,
    branchMovements,
    photos,
    documents,
    documentChecklist,
  ] = await Promise.all([
    getVehiclePermissions(workspace.companyId),
    getBranches(workspace.companyId),
    getVehicleStatusHistory(workspace.companyId, vehicleId),
    getVehicleBranchMovements(workspace.companyId, vehicleId),
    getVehiclePhotos(workspace.companyId, vehicleId),
    getVehicleDocuments(workspace.companyId, vehicleId),
    getVehicleDocumentChecklist(workspace.companyId, vehicleId),
  ]);
  const requiredDocuments = documentChecklist.filter((item) => item.is_required);
  const completeRequiredDocuments = requiredDocuments.filter((item) =>
    ["complete", "verified"].includes(item.status),
  );
  const documentReadiness = requiredDocuments.length
    ? Math.round((completeRequiredDocuments.length / requiredDocuments.length) * 100)
    : vehicle.documents_status === "verified" || vehicle.documents_status === "complete" ? 100 : vehicle.documents_status === "partial" ? 50 : 0;
  const exportReadiness = vehicle.export_available && documentReadiness === 100 && vehicle.photos_status === "complete" ? 100 : vehicle.export_available ? 60 : 20;

  async function updateStatusFromForm(formData: FormData) {
    "use server";

    await updateVehicleStatus(formData);
  }

  async function moveBranchFromForm(formData: FormData) {
    "use server";

    await moveVehicleBranch(formData);
  }

  async function addPhotoFromForm(formData: FormData) {
    "use server";

    await addVehiclePhoto(formData);
  }

  async function addDocumentFromForm(formData: FormData) {
    "use server";

    await addVehicleDocument(formData);
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

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>{photos.length} private vehicle media records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {photos.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">
                  No photos uploaded yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.signed_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-slate-50"
                    >
                      <ImageIcon className="h-5 w-5 text-orange-500" />
                      <span className="min-w-0 flex-1 truncate">
                        {photo.alt_text ?? photo.storage_path.split("/").at(-1)}
                      </span>
                      {photo.is_primary ? <span className="text-xs font-medium text-orange-600">Primary</span> : null}
                    </a>
                  ))}
                </div>
              )}

              {permissions.canUploadDocuments ? (
                <form action={addPhotoFromForm} className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="photo">Photo file</Label>
                    <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="altText">Alt text</Label>
                    <Input id="altText" name="altText" placeholder="Front exterior" />
                  </div>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input name="isPrimary" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Primary
                  </label>
                  <div className="md:col-span-3">
                    <Button type="submit" variant="outline">
                      <Upload className="h-4 w-4" />
                      Upload photo
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document checklist</CardTitle>
              <CardDescription>
                {completeRequiredDocuments.length} of {requiredDocuments.length} required documents complete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Export</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentChecklist.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{item.title}</td>
                        <td className="px-4 py-3">{item.is_required ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{item.is_export_required ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{formatVehicleStatus(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                {documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.signed_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-slate-50"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="min-w-0 flex-1 truncate">{document.title}</span>
                    <span className="text-xs text-slate-500">{formatVehicleStatus(document.status)}</span>
                  </a>
                ))}
              </div>

              {permissions.canUploadDocuments ? (
                <form action={addDocumentFromForm} className="grid gap-3 rounded-md border p-4 md:grid-cols-3">
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="documentType">Document type</Label>
                    <select id="documentType" name="documentType" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {DOCUMENT_TYPES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentTitle">Title</Label>
                    <Input id="documentTitle" name="title" defaultValue="Vehicle title" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentStatus">Status</Label>
                    <select id="documentStatus" name="status" defaultValue="complete" className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="missing">Missing</option>
                      <option value="partial">Partial</option>
                      <option value="complete">Complete</option>
                      <option value="verified">Verified</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="document">Document file</Label>
                    <Input id="document" name="document" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiresAt">Expiry date</Label>
                    <Input id="expiresAt" name="expiresAt" type="date" />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="outline">
                      <Upload className="h-4 w-4" />
                      Save document
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
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
