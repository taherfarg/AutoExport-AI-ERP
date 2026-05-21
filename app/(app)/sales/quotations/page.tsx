import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { SalesStatusBadge } from "@/components/sales/sales-status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
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
import { getLeads } from "@/features/crm/queries";
import {
  getQuotationReservations,
  getQuotations,
  getSalesDashboardStats,
  getSalesPermissions,
} from "@/features/sales/queries";
import { getCompanyUsers } from "@/features/users/queries";
import { getVehicles } from "@/features/vehicles/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatSalesStatus } from "@/lib/sales/format";
import { formatMoney } from "@/lib/vehicles/format";
import { quotationStatuses } from "@/lib/validations/sales";
import { QuotationCreateForm } from "./quotation-create-form";

type QuotationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CompanyUserRow = {
  profiles: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function profileFrom(row: CompanyUserRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function defaultValidUntil() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const filters = {
    search: firstParam(params.search),
    status: firstParam(params.status),
    branchId: firstParam(params.branchId),
  };
  const [quotations, branches, leads, vehicles, users, permissions] = await Promise.all([
    getQuotations(workspace.companyId, filters),
    getBranches(workspace.companyId),
    getLeads(workspace.companyId),
    getVehicles(workspace.companyId, { status: "available" }),
    getCompanyUsers(workspace.companyId),
    getSalesPermissions(workspace.companyId),
  ]);
  const reservationLists = await Promise.all(
    quotations.slice(0, 25).map((quotation) => getQuotationReservations(workspace.companyId, quotation.id)),
  );
  const reservations = reservationLists.flat();
  const stats = getSalesDashboardStats(quotations, reservations, []);
  const defaultBranchId = branches[0]?.id;
  const defaultVehicle = vehicles[0];
  const userOptions = (users as unknown as CompanyUserRow[])
    .map(profileFrom)
    .filter(Boolean) as { id: string; full_name: string; email: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Sales Quotations</h2>
          <p className="text-sm text-slate-500">
            Create customer offers, reserve vehicles, and move deals toward invoice and payment.
          </p>
        </div>
        <Button asChild>
          <a href="#add-quotation">
            <Plus className="h-4 w-4" />
            Add quotation
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Quotations" value={String(stats.quotations)} hint="Visible sales offers" />
        <KpiCard title="Reservations" value={String(stats.reservations)} hint="Vehicle holds created" />
        <KpiCard title="Invoices" value={String(stats.invoices)} hint="Final invoices in this view" />
        <KpiCard title="Quoted value" value={formatMoney(quotations.reduce((sum, q) => sum + Number(q.total), 0), quotations[0]?.currency_code ?? "AED")} hint="Total quoted amount" />
        <KpiCard title="Reserved value" value={formatMoney(reservations.reduce((sum, r) => sum + Number(r.deposit_amount), 0), reservations[0]?.currency_code ?? "AED")} hint="Deposits requested" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search and filter</CardTitle>
          <CardDescription>Find quotations by number, status, or branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="search" name="search" defaultValue={filters.search} className="pl-9" placeholder="Quotation number or notes" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={filters.status ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All statuses</option>
                {quotationStatuses.map((status) => (
                  <option key={status} value={status}>{formatSalesStatus(status)}</option>
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
            <div className="flex items-end gap-2 md:col-span-4">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/sales/quotations">Reset</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sales/invoices">Invoices</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotation desk</CardTitle>
          <CardDescription>{quotations.length} quotations match the current view</CardDescription>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium text-slate-900">No quotations found</p>
              <p className="mt-1 text-sm text-slate-500">Create a quotation from a lead and available vehicle.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Valid until</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/sales/quotations/${quotation.id}`} className="font-medium text-slate-950 hover:text-orange-600">
                          {quotation.quotation_number}
                        </Link>
                        <p className="text-xs text-slate-500">{quotation.branches?.name ?? "No branch"}</p>
                      </td>
                      <td className="px-4 py-3">{quotation.customers?.name ?? quotation.leads?.name ?? "Walk-in buyer"}</td>
                      <td className="px-4 py-3">
                        {quotation.vehicles ? `${quotation.vehicles.year} ${quotation.vehicles.brand} ${quotation.vehicles.model}` : "Vehicle"}
                      </td>
                      <td className="px-4 py-3"><SalesStatusBadge status={quotation.status} /></td>
                      <td className="px-4 py-3">{new Date(quotation.valid_until).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(quotation.total, quotation.currency_code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="add-quotation">
        <CardHeader>
          <CardTitle>Add quotation</CardTitle>
          <CardDescription>Create an offer tied to a lead/customer and available vehicle.</CardDescription>
        </CardHeader>
        <CardContent>
          {!permissions.canCreateQuotation ? (
            <p className="text-sm text-slate-500">You do not have permission to create quotations.</p>
          ) : !defaultBranchId || !defaultVehicle ? (
            <p className="text-sm text-slate-500">Create a branch and an available vehicle before adding quotations.</p>
          ) : (
            <QuotationCreateForm
              branches={branches}
              companyId={workspace.companyId}
              defaultBranchId={defaultBranchId}
              defaultValidUntil={defaultValidUntil()}
              defaultVehicle={defaultVehicle}
              leads={leads}
              profileId={workspace.profileId}
              users={userOptions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
