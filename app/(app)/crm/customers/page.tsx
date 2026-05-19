import Link from "next/link";
import { Building2, Globe2, Plus, Search, Users } from "lucide-react";
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
import { createCustomer } from "@/features/crm/actions";
import {
  getCrmPermissions,
  getCustomerFilterOptions,
  getCustomerStats,
  getCustomers,
} from "@/features/crm/queries";
import { getBranches } from "@/features/branches/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";

const CUSTOMER_TYPES = ["individual", "dealer", "company", "export_buyer"] as const;

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function label(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const filters = {
    search: firstParam(params.search),
    type: firstParam(params.type),
    branchId: firstParam(params.branchId),
    countryCode: firstParam(params.countryCode),
  };

  const [customers, branches, permissions] = await Promise.all([
    getCustomers(workspace.companyId, filters),
    getBranches(workspace.companyId),
    getCrmPermissions(workspace.companyId),
  ]);
  const stats = getCustomerStats(customers);
  const options = getCustomerFilterOptions(customers);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Manage buyers, dealers, fleet customers, and export accounts.
          </p>
        </div>
        <Button asChild>
          <a href="#add-customer">
            <Plus className="h-4 w-4" />
            Add customer
          </a>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Customers" value={String(stats.total)} hint="Visible customer records" icon={Users} />
        <KpiCard title="Export Buyers" value={String(stats.exportBuyers)} hint="Cross-border buyers" icon={Globe2} iconColor="text-emerald-500" iconBgColor="bg-emerald-50" />
        <KpiCard title="Dealer/Company" value={String(stats.companies)} hint="B2B accounts" icon={Building2} iconColor="text-blue-500" iconBgColor="bg-blue-50" />
        <KpiCard title="Countries" value={String(stats.countries)} hint="Customer market coverage" icon={Globe2} iconColor="text-violet-500" iconBgColor="bg-violet-50" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search and filter</CardTitle>
          <CardDescription>Find customers by identity, market, branch, or account type.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  name="search"
                  defaultValue={filters.search}
                  className="pl-9"
                  placeholder="Name, phone, email, city"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" defaultValue={filters.type ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All types</option>
                {CUSTOMER_TYPES.map((type) => (
                  <option key={type} value={type}>{label(type)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch</Label>
              <select id="branchId" name="branchId" defaultValue={filters.branchId ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="countryCode">Country</Label>
              <select id="countryCode" name="countryCode" defaultValue={filters.countryCode ?? "all"} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All countries</option>
                {options.countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-5">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/crm/customers">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer list</CardTitle>
          <CardDescription>{customers.length} customers match the current view</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium text-foreground">No customers found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a customer or clear the filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Language</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-t hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{label(customer.customer_type)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{customer.phone ?? customer.whatsapp ?? "No phone"}</p>
                        <p className="text-xs text-muted-foreground">{customer.email ?? "No email"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{customer.city ?? "Unspecified"}</p>
                        <p className="text-xs text-muted-foreground">{customer.country_code ?? "No country"}</p>
                      </td>
                      <td className="px-4 py-3">{customer.branches?.name ?? "All branches"}</td>
                      <td className="px-4 py-3 uppercase">{customer.preferred_language}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="add-customer">
        <CardHeader>
          <CardTitle>Add customer</CardTitle>
          <CardDescription>Create a reusable buyer record for CRM, sales, export, and documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {!permissions.canCreateCustomer ? (
            <p className="text-sm text-muted-foreground">You do not have permission to create customers.</p>
          ) : (
            <form action={createCustomer} className="grid gap-4 md:grid-cols-4">
              <input type="hidden" name="companyId" value={workspace.companyId} />
              <div className="grid gap-2">
                <Label htmlFor="customerType">Type</Label>
                <select id="customerType" name="customerType" defaultValue="individual" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {CUSTOMER_TYPES.map((type) => (
                    <option key={type} value={type}>{label(type)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branchIdCreate">Branch</Label>
                <select id="branchIdCreate" name="branchId" defaultValue="" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preferredLanguage">Language</Label>
                <select id="preferredLanguage" name="preferredLanguage" defaultValue="en" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="fr">French</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="countryCodeCreate">Country</Label>
                <Input id="countryCodeCreate" name="countryCode" maxLength={2} placeholder="AE" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <div className="flex items-end md:col-span-4">
                <Button type="submit">Create customer</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
