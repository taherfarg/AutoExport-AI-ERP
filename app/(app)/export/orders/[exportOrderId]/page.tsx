import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2, Landmark, PackageCheck, Plus, Ship, WalletCards } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ExportStatusBadge } from "@/components/export/export-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCustomsClearance,
  addShipmentCost,
  addShippingEvent,
  upsertExportDocument,
} from "@/features/export/actions";
import {
  getExportOrderDetail,
  getExportOrderOperationalSummary,
  getExportOrderTracking,
  getExportPermissions,
  getLogisticsPartners,
} from "@/features/export/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatExportStatus } from "@/lib/export/format";
import { formatMoney } from "@/lib/vehicles/format";
import {
  customsStatuses,
  exportDocumentStatuses,
  shipmentCostTypes,
  shippingStatuses,
} from "@/lib/validations/export";

type ExportOrderDetailPageProps = {
  params: Promise<{ exportOrderId: string }>;
};

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function nowInput() {
  return new Date().toISOString().slice(0, 16);
}

export default async function ExportOrderDetailPage({ params }: ExportOrderDetailPageProps) {
  const { exportOrderId } = await params;
  const workspace = await getCurrentWorkspace();

  let order;
  try {
    order = await getExportOrderDetail(workspace.companyId, exportOrderId);
  } catch {
    notFound();
  }

  const [tracking, partners, permissions] = await Promise.all([
    getExportOrderTracking(workspace.companyId, exportOrderId),
    getLogisticsPartners(workspace.companyId),
    getExportPermissions(workspace.companyId),
  ]);
  const summary = getExportOrderOperationalSummary(order, tracking.documents, tracking.costs);
  const customsBrokers = partners.filter((partner) => partner.partner_type === "customs_broker");
  const totalCostLabel = summary.costs.totalsByCurrency.length > 0
    ? summary.costs.totalsByCurrency.map((total) => formatMoney(total.amount, total.currencyCode)).join(" / ")
    : formatMoney(0, order.vehicles?.currency_code ?? "AED");

  async function shippingEventFromForm(formData: FormData) {
    "use server";

    await addShippingEvent(formData);
  }

  async function customsFromForm(formData: FormData) {
    "use server";

    await addCustomsClearance(formData);
  }

  async function documentFromForm(formData: FormData) {
    "use server";

    await upsertExportDocument(formData);
  }

  async function shipmentCostFromForm(formData: FormData) {
    "use server";

    await addShipmentCost(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/export/orders">
              <ArrowLeft className="h-4 w-4" />
              Back to export orders
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">{order.export_order_number}</h2>
              <ExportStatusBadge status={order.status} />
              <ExportStatusBadge status={order.shipping_status} />
            </div>
            <p className="text-sm text-slate-500">
              {order.destination_country_code} / {order.destination_port} / {order.vehicles ? `${order.vehicles.year} ${order.vehicles.brand} ${order.vehicles.model}` : "Vehicle"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/vehicles/${order.vehicle_id}`}>
            <Ship className="h-4 w-4" />
            Vehicle record
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Document completion" value={`${summary.documents.completionPercentage}%`} hint={`${summary.documents.completedCount}/${summary.documents.requiredCount} required docs ready`} />
        <KpiCard title="Missing documents" value={String(summary.documents.missingCount)} hint="Required checklist gaps" />
        <KpiCard title="Shipment costs" value={totalCostLabel} hint={`${summary.costs.count} cost records`} />
        <KpiCard title="Customs status" value={formatExportStatus(order.customs_status)} hint="Latest clearance state" />
        <KpiCard title="Risk flags" value={String(summary.risks.length)} hint={summary.risks.length > 0 ? summary.risks.map(formatExportStatus).join(", ") : "No active risk flags"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export overview</CardTitle>
              <CardDescription>Core export, shipping, customs, and document status for this order.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border p-4">
                  <p className="text-xs uppercase text-slate-500">Vehicle</p>
                  <p className="mt-1 font-medium text-slate-950">
                    {order.vehicles ? `${order.vehicles.stock_number} - ${order.vehicles.brand} ${order.vehicles.model}` : "Vehicle"}
                  </p>
                  <p className="text-sm text-slate-500">{formatMoney(order.vehicles?.selling_price, order.vehicles?.currency_code ?? "AED")}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-xs uppercase text-slate-500">Destination</p>
                  <p className="mt-1 font-medium text-slate-950">{order.destination_country_code} / {order.destination_port}</p>
                  <p className="text-sm text-slate-500">{formatExportStatus(order.shipping_method)}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-xs uppercase text-slate-500">References</p>
                  <p className="mt-1 text-sm text-slate-700">Booking: {order.booking_number ?? "Pending"}</p>
                  <p className="text-sm text-slate-700">Container: {order.container_number ?? "Pending"}</p>
                  <p className="text-sm text-slate-700">BL: {order.bl_number ?? "Pending"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping tracking</CardTitle>
              <CardDescription>Milestones update the export order shipping status automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tracking.events.length === 0 ? (
                <p className="text-sm text-slate-500">No shipping events recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {tracking.events.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-md border p-3">
                      <PackageCheck className="mt-0.5 h-4 w-4 text-orange-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <ExportStatusBadge status={event.event_status} />
                          <span className="text-xs text-slate-500">{new Date(event.event_date).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{event.location ?? "No location"}</p>
                        {event.notes ? <p className="text-sm text-slate-500">{event.notes}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customs clearance</CardTitle>
              <CardDescription>Status history and broker updates for export clearance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tracking.customs.length === 0 ? (
                <p className="text-sm text-slate-500">No customs clearance record yet.</p>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Broker</th>
                        <th className="px-4 py-3">Declaration</th>
                        <th className="px-4 py-3 text-right">Duties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracking.customs.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-3"><ExportStatusBadge status={item.customs_status} /></td>
                          <td className="px-4 py-3">{item.logistics_partners?.name ?? "No broker"}</td>
                          <td className="px-4 py-3">{item.declaration_number ?? "Pending"}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(item.duties_amount, item.currency_code)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export documents</CardTitle>
              <CardDescription>Document checklist with missing-document alert signals.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracking.documents.map((document) => (
                      <tr key={document.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{document.title}</p>
                          <p className="text-xs text-slate-500">{document.document_type}</p>
                        </td>
                        <td className="px-4 py-3"><ExportStatusBadge status={document.status} /></td>
                        <td className="px-4 py-3">{document.expires_at ? new Date(document.expires_at).toLocaleDateString() : "No expiry"}</td>
                        <td className="px-4 py-3">
                          {permissions.canManageExports ? (
                            <form action={documentFromForm} className="flex items-center gap-2">
                              <input type="hidden" name="exportOrderId" value={order.id} />
                              <input type="hidden" name="documentType" value={document.document_type} />
                              <input type="hidden" name="title" value={document.title} />
                              <input type="hidden" name="isRequired" value={String(document.is_required)} />
                              <select name="status" defaultValue={document.status} className="h-9 rounded-md border bg-white px-3 text-sm">
                                {exportDocumentStatuses.map((status) => (
                                  <option key={status} value={status}>{formatExportStatus(status)}</option>
                                ))}
                              </select>
                              <Button type="submit" size="sm" variant="outline">Save</Button>
                            </form>
                          ) : (
                            <span className="text-xs text-slate-500">Read only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canUpdateExportStatus ? (
            <Card>
              <CardHeader>
                <CardTitle>Add shipping event</CardTitle>
                <CardDescription>Record booking, port, loading, shipment, arrival, or delivery progress.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={shippingEventFromForm} className="grid gap-3">
                  <input type="hidden" name="exportOrderId" value={order.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="eventStatus">Event status</Label>
                    <select id="eventStatus" name="eventStatus" defaultValue="booked" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {shippingStatuses.map((status) => (
                        <option key={status} value={status}>{formatExportStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="eventDate">Event date</Label>
                    <Input id="eventDate" name="eventDate" type="datetime-local" defaultValue={nowInput()} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" defaultValue="Jebel Ali" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="eventNotes">Notes</Label>
                    <Input id="eventNotes" name="notes" placeholder="Operational update" />
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Add event
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canUpdateExportStatus ? (
            <Card>
              <CardHeader>
                <CardTitle>Update customs</CardTitle>
                <CardDescription>Record customs status, broker, declaration, and duties.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={customsFromForm} className="grid gap-3">
                  <input type="hidden" name="exportOrderId" value={order.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="customsStatus">Customs status</Label>
                    <select id="customsStatus" name="customsStatus" defaultValue={order.customs_status} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {customsStatuses.map((status) => (
                        <option key={status} value={status}>{formatExportStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="brokerId">Broker</Label>
                    <select id="brokerId" name="brokerId" defaultValue={order.logistics_partner_id ?? customsBrokers[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">No broker</option>
                      {customsBrokers.map((broker) => (
                        <option key={broker.id} value={broker.id}>{broker.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="declarationNumber">Declaration number</Label>
                    <Input id="declarationNumber" name="declarationNumber" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dutiesAmount">Duties amount</Label>
                    <Input id="dutiesAmount" name="dutiesAmount" type="number" min="0" defaultValue="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currencyCode">Currency</Label>
                    <Input id="currencyCode" name="currencyCode" defaultValue={order.vehicles?.currency_code ?? "AED"} maxLength={3} />
                  </div>
                  <Button type="submit" variant="outline">
                    <Landmark className="h-4 w-4" />
                    Save customs
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageExports ? (
            <Card>
              <CardHeader>
                <CardTitle>Add shipment cost</CardTitle>
                <CardDescription>Track freight, customs, port, insurance, handling, and storage costs.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={shipmentCostFromForm} className="grid gap-3">
                  <input type="hidden" name="exportOrderId" value={order.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="costType">Cost type</Label>
                    <select id="costType" name="costType" defaultValue="ocean_freight" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {shipmentCostTypes.map((type) => (
                        <option key={type} value={type}>{formatExportStatus(type)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" defaultValue="Freight charge" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" min="0" defaultValue="0" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="costCurrencyCode">Currency</Label>
                    <Input id="costCurrencyCode" name="currencyCode" defaultValue={order.vehicles?.currency_code ?? "AED"} maxLength={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="costDate">Cost date</Label>
                    <Input id="costDate" name="costDate" type="date" defaultValue={dateIn(0)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplierName">Supplier</Label>
                    <Input id="supplierName" name="supplierName" />
                  </div>
                  <Button type="submit" variant="outline">
                    <WalletCards className="h-4 w-4" />
                    Add cost
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Shipment costs</CardTitle>
              <CardDescription>Cost ledger linked to this export order.</CardDescription>
            </CardHeader>
            <CardContent>
              {tracking.costs.length === 0 ? (
                <p className="text-sm text-slate-500">No shipment costs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {tracking.costs.map((cost) => (
                    <div key={cost.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{cost.description}</p>
                          <p className="text-xs text-slate-500">{formatExportStatus(cost.cost_type)} / {cost.supplier_name ?? "No supplier"}</p>
                        </div>
                        <p className="font-medium">{formatMoney(cost.amount, cost.currency_code)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing document alerts</CardTitle>
              <CardDescription>Placeholder alert source for Phase 10 notification automation.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.documents.missingCount > 0 ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <FileCheck2 className="mb-2 h-4 w-4" />
                  {summary.documents.missingCount} required export documents are missing or expired. This order should generate an export_documents_missing alert when the alert engine is enabled.
                </div>
              ) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  Required export documents are uploaded or verified.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
