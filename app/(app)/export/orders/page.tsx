import Link from "next/link";
import { AlertTriangle, Plus, Search, Ship } from "lucide-react";
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
import { getBranches } from "@/features/branches/queries";
import {
  getDestinationCountries,
  getExportDashboardStats,
  getExportOrders,
  getExportPermissions,
  getImportOrders,
  getLogisticsPartners,
} from "@/features/export/queries";
import { getVehicles } from "@/features/vehicles/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatExportStatus } from "@/lib/export/format";
import { formatMoney } from "@/lib/vehicles/format";
import { shippingStatuses } from "@/lib/validations/export";
import { ExportOrderCreateForm, ImportOrderCreateForm } from "./export-action-forms";

type ExportOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function ExportOrdersPage({ searchParams }: ExportOrdersPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const filters = {
    search: firstParam(params.search),
    status: firstParam(params.status),
    shippingStatus: firstParam(params.shippingStatus),
    destination: firstParam(params.destination),
    branchId: firstParam(params.branchId),
  };

  const [orders, importOrders, branches, destinations, partners, vehicles, permissions] = await Promise.all([
    getExportOrders(workspace.companyId, filters),
    getImportOrders(workspace.companyId),
    getBranches(workspace.companyId),
    getDestinationCountries(),
    getLogisticsPartners(workspace.companyId),
    getVehicles(workspace.companyId, { exportAvailable: "true" }),
    getExportPermissions(workspace.companyId),
  ]);
  const stats = getExportDashboardStats(orders);
  const defaultVehicle = vehicles.find((vehicle) => ["available", "ready_for_export", "under_preparation"].includes(vehicle.status)) ?? vehicles[0];
  const defaultBranchId = defaultVehicle?.branch_id ?? branches[0]?.id;
  const shippingPartners = partners.filter((partner) => partner.partner_type === "shipping_company" || partner.partner_type === "freight_forwarder");
  const brokerPartners = partners.filter((partner) => partner.partner_type === "customs_broker");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Import & Export Operations</h2>
          <p className="text-sm text-slate-500">
            Track export orders, shipping milestones, customs clearance, required documents, and shipment costs.
          </p>
        </div>
        <Button asChild>
          <a href="#create-export-order">
            <Plus className="h-4 w-4" />
            Create export order
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Export orders" value={String(stats.total)} hint="Visible export pipeline" />
        <KpiCard title="Import orders" value={String(importOrders.length)} hint="Inbound vehicle shipments" />
        <KpiCard title="Active" value={String(stats.active)} hint="Open export jobs" />
        <KpiCard title="In transit" value={String(stats.inTransit)} hint="Booked, loaded, or shipped" />
        <KpiCard title="Customs pending" value={String(stats.customsPending)} hint="Needs customs attention" />
        <KpiCard title="Missing docs" value={String(stats.missingDocuments)} hint="Document checklist gaps" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search and filter</CardTitle>
          <CardDescription>Find export orders by number, booking, container, BL, destination, or branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="search" name="search" defaultValue={filters.search} className="pl-9" placeholder="Order, booking, container, BL" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shippingStatus">Shipping</Label>
              <select id="shippingStatus" name="shippingStatus" defaultValue={filters.shippingStatus ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All statuses</option>
                {shippingStatuses.map((status) => (
                  <option key={status} value={status}>{formatExportStatus(status)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination</Label>
              <select id="destination" name="destination" defaultValue={filters.destination ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All countries</option>
                {destinations.map((country) => (
                  <option key={country.country_code} value={country.country_code}>{country.country_name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch</Label>
              <select id="branchId" name="branchId" defaultValue={filters.branchId ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-5">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/export/orders">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export order desk</CardTitle>
          <CardDescription>{orders.length} export orders match the current view</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <Ship className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-medium text-slate-900">No export orders found</p>
              <p className="mt-1 text-sm text-slate-500">Create an export order from an export-ready vehicle.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Shipping</th>
                    <th className="px-4 py-3">Customs</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3 text-right">Vehicle value</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/export/orders/${order.id}`} className="font-medium text-slate-950 hover:text-orange-600">
                          {order.export_order_number}
                        </Link>
                        <p className="text-xs text-slate-500">{order.branches?.name ?? "No branch"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {order.vehicles ? `${order.vehicles.year} ${order.vehicles.brand} ${order.vehicles.model}` : "Vehicle"}
                        <p className="text-xs text-slate-500">{order.vehicles?.stock_number}</p>
                      </td>
                      <td className="px-4 py-3">{order.destination_country_code} / {order.destination_port}</td>
                      <td className="px-4 py-3"><ExportStatusBadge status={order.shipping_status} /></td>
                      <td className="px-4 py-3"><ExportStatusBadge status={order.customs_status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ExportStatusBadge status={order.document_status} />
                          {["missing", "expired"].includes(order.document_status) ? <AlertTriangle className="h-4 w-4 text-red-500" /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(order.vehicles?.selling_price, order.vehicles?.currency_code ?? "AED")}</td>
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
          <CardTitle>Import order monitor</CardTitle>
          <CardDescription>Inbound vehicle purchasing and shipping workflow for multi-country stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div>
              {importOrders.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">No import orders recorded yet.</div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Route</th>
                        <th className="px-4 py-3">Shipping</th>
                        <th className="px-4 py-3">Vehicles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importOrders.slice(0, 8).map((order) => (
                        <tr key={order.id} className="border-t">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-950">{order.import_order_number}</p>
                            <p className="text-xs text-slate-500">{order.branches?.name ?? "No branch"}</p>
                          </td>
                          <td className="px-4 py-3">{order.supplier_name}</td>
                          <td className="px-4 py-3">{order.origin_country_code} to {order.destination_country_code}</td>
                          <td className="px-4 py-3"><ExportStatusBadge status={order.shipping_status} /></td>
                          <td className="px-4 py-3">{order.vehicle_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {permissions.canManageExports && defaultBranchId ? (
              <ImportOrderCreateForm companyId={workspace.companyId} defaultBranchId={defaultBranchId} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card id="create-export-order">
        <CardHeader>
          <CardTitle>Create export order</CardTitle>
          <CardDescription>Start a shipping and customs workflow for an export-available vehicle.</CardDescription>
        </CardHeader>
        <CardContent>
          {!permissions.canManageExports ? (
            <p className="text-sm text-slate-500">You do not have permission to create export orders.</p>
          ) : !defaultBranchId || !defaultVehicle ? (
            <p className="text-sm text-slate-500">Add an export-available vehicle before creating export orders.</p>
          ) : (
            <ExportOrderCreateForm
              branches={branches}
              brokerPartners={brokerPartners}
              companyId={workspace.companyId}
              defaultBranchId={defaultBranchId}
              defaultVehicleId={defaultVehicle.id}
              destinations={destinations}
              eta={dateIn(24)}
              etd={dateIn(7)}
              shippingPartners={shippingPartners}
              vehicles={vehicles}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
