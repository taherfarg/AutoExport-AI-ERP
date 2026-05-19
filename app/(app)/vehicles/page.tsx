import Link from "next/link";
import { Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleCreateForm } from "./vehicle-create-form";
import {
  getInventoryStats,
  getVehicleFilterOptions,
  getVehiclePermissions,
  getVehicles,
} from "@/features/vehicles/queries";
import { getBranches } from "@/features/branches/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMoney } from "@/lib/vehicles/format";

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

type VehiclesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const filters = {
    search: firstParam(params.search),
    status: firstParam(params.status),
    branchId: firstParam(params.branchId),
    brand: firstParam(params.brand),
    exportAvailable: firstParam(params.exportAvailable),
  };
  const showCreateForm = firstParam(params.create) === "1";
  const createError = firstParam(params.error);
  const [vehicles, branches, permissions] = await Promise.all([
    getVehicles(workspace.companyId, filters),
    getBranches(workspace.companyId),
    getVehiclePermissions(workspace.companyId),
  ]);
  const stats = getInventoryStats(vehicles);
  const filterOptions = getVehicleFilterOptions(vehicles);
  const defaultBranchId = branches[0]?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Vehicle Inventory</h2>
          <p className="text-sm text-slate-500">
            Manage showroom stock, export-ready vehicles, costs, and branch location.
          </p>
        </div>
        <Button asChild>
          <Link href="/vehicles?create=1#add-vehicle">
            <Plus className="h-4 w-4" />
            Add vehicle
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Total stock" value={String(stats.total)} hint="Visible inventory rows" />
        <KpiCard title="Available" value={String(stats.available)} hint="Ready to sell" />
        <KpiCard title="Reserved" value={String(stats.reserved)} hint="Hold or deposit flow" />
        <KpiCard title="In transit" value={String(stats.inTransit)} hint="Shipping or transfer" />
        <KpiCard
          title="Stock value"
          value={formatMoney(stats.inventoryValue, vehicles[0]?.currency_code ?? "AED")}
          hint="Selling value of filtered rows"
        />
      </div>

      {showCreateForm ? (
        <Card id="add-vehicle">
          <CardHeader>
            <CardTitle>Add vehicle</CardTitle>
            <CardDescription>Create an inventory record with landed cost and selling price.</CardDescription>
          </CardHeader>
          <CardContent>
            {!permissions.canCreate ? (
              <p className="text-sm text-slate-500">You do not have permission to create vehicles.</p>
            ) : !defaultBranchId ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Create a branch before adding vehicles.</p>
                <Button asChild>
                  <Link href="/settings/branches">Create branch</Link>
                </Button>
              </div>
            ) : (
              <VehicleCreateForm
                branches={branches}
                companyId={workspace.companyId}
                initialError={createError}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Search and filter</CardTitle>
          <CardDescription>Find stock by vehicle identity, branch, status, brand, or export flag.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  name="search"
                  defaultValue={filters.search}
                  className="pl-9"
                  placeholder="VIN, stock, brand, model"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={filters.status ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All statuses</option>
                {VEHICLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch</Label>
              <select id="branchId" name="branchId" defaultValue={filters.branchId ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filterBrand">Brand</Label>
              <select id="filterBrand" name="brand" defaultValue={filters.brand ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All brands</option>
                {filterOptions.brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-5">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/vehicles">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock list</CardTitle>
          <CardDescription>{vehicles.length} vehicles match the current view</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium text-slate-900">No vehicles found</p>
              <p className="mt-1 text-sm text-slate-500">Add a vehicle or clear the filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Stock / VIN</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Selling price</th>
                    {permissions.canViewProfit ? <th className="px-4 py-3 text-right">Margin</th> : null}
                    <th className="px-4 py-3">Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/vehicles/${vehicle.id}`} className="font-medium text-slate-950 hover:text-orange-600">
                          {vehicle.year} {vehicle.brand} {vehicle.model}
                        </Link>
                        <p className="text-xs text-slate-500">{vehicle.trim ?? vehicle.condition}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{vehicle.stock_number}</p>
                        <p className="text-xs text-slate-500">{vehicle.vin}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{vehicle.branches?.name ?? "Unassigned"}</p>
                        <p className="text-xs text-slate-500">{vehicle.current_country_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <VehicleStatusBadge status={vehicle.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(vehicle.selling_price, vehicle.currency_code)}
                      </td>
                      {permissions.canViewProfit ? (
                        <td className="px-4 py-3 text-right">
                          {Number(vehicle.profit_margin).toFixed(1)}%
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600">Docs: {vehicle.documents_status}</p>
                        <p className="text-xs text-slate-600">Photos: {vehicle.photos_status}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
