import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales CRM | AutoSphere ERP",
  description: "Manage leads, source tracking, assignments, follow-ups, and active pipeline work.",
};

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { LeadStatusBadge } from "@/components/crm/lead-status-badge";
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
import {
  getCrmPermissions,
  getLeadPipeline,
  getLeads,
  getLeadStats,
} from "@/features/crm/queries";
import { getCompanyUsers } from "@/features/users/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatCrmStatus, isFollowUpOverdue } from "@/lib/crm/format";
import { formatMoney } from "@/lib/vehicles/format";
import { leadSources, leadStatuses } from "@/lib/validations/crm";
import { LeadCreateForm } from "./lead-create-form";

type LeadsPageProps = {
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

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const filters = {
    search: firstParam(params.search),
    status: firstParam(params.status),
    branchId: firstParam(params.branchId),
    source: firstParam(params.source),
    assignedTo: firstParam(params.assignedTo),
  };
  const [leads, branches, users, permissions] = await Promise.all([
    getLeads(workspace.companyId, filters),
    getBranches(workspace.companyId),
    getCompanyUsers(workspace.companyId),
    getCrmPermissions(workspace.companyId),
  ]);
  const stats = getLeadStats(leads);
  const pipeline = getLeadPipeline(leads, leadStatuses);
  const defaultBranchId = branches[0]?.id;
  const userOptions = (users as unknown as CompanyUserRow[])
    .map(profileFrom)
    .filter(Boolean) as { id: string; full_name: string; email: string }[];
  const userNameById = new Map(userOptions.map((user) => [user.id, user.full_name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Sales CRM</h2>
          <p className="text-sm text-slate-500">
            Manage leads, source tracking, assignments, follow-ups, and active pipeline work.
          </p>
        </div>
        <Button asChild>
          <a href="#add-lead">
            <Plus className="h-4 w-4" />
            Add lead
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Visible leads" value={String(stats.total)} hint="Filtered CRM records" />
        <KpiCard title="Hot leads" value={String(stats.hot)} hint="Score 75 or higher" />
        <KpiCard title="Due today" value={String(stats.dueToday)} hint="Follow-ups scheduled today" />
        <KpiCard title="Overdue" value={String(stats.overdue)} hint="Open follow-ups past due" />
        <KpiCard title="Pipeline value" value={formatMoney(stats.pipelineValue, leads[0]?.currency_code ?? "AED")} hint="Open and won budgets" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search and filter</CardTitle>
          <CardDescription>Find leads by buyer, contact, preferred vehicle, branch, source, or owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  name="search"
                  defaultValue={filters.search}
                  className="pl-9"
                  placeholder="Buyer, phone, brand, model"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={filters.status ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All statuses</option>
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>{formatCrmStatus(status)}</option>
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
            <div className="grid gap-2">
              <Label htmlFor="source">Source</Label>
              <select id="source" name="source" defaultValue={filters.source ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All sources</option>
                {leadSources.map((source) => (
                  <option key={source} value={source}>{formatCrmStatus(source)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Owner</Label>
              <select id="assignedTo" name="assignedTo" defaultValue={filters.assignedTo ?? "all"} className="h-9 rounded-md border bg-white px-3 text-sm">
                <option value="all">All owners</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-6">
              <Button type="submit">Apply filters</Button>
              <Button asChild variant="outline">
                <Link href="/crm/leads">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead desk</CardTitle>
          <CardDescription>{leads.length} leads match the current view</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium text-slate-900">No leads found</p>
              <p className="mt-1 text-sm text-slate-500">Add a lead or clear the current filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Interest</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Follow-up</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/crm/leads/${lead.id}`} className="font-medium text-slate-950 hover:text-orange-600">
                          {lead.name}
                        </Link>
                        <p className="text-xs text-slate-500">{lead.phone ?? lead.email ?? "No contact yet"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{[lead.preferred_brand, lead.preferred_model].filter(Boolean).join(" ") || "Open requirement"}</p>
                        <p className="text-xs text-slate-500">{formatCrmStatus(lead.lead_source)}</p>
                      </td>
                      <td className="px-4 py-3">{lead.assigned_salesperson_id ? userNameById.get(lead.assigned_salesperson_id) ?? "Assigned user" : "Unassigned"}</td>
                      <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3">
                        {lead.next_follow_up_at ? (
                          <span className={isFollowUpOverdue(lead.next_follow_up_at, "open") ? "text-red-600" : "text-slate-700"}>
                            {new Date(lead.next_follow_up_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(lead.budget ?? 0, lead.currency_code)}</td>
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
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>Deal movement by CRM status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            {pipeline.map((column) => (
              <div key={column.status} className="rounded-md border bg-white">
                <div className="border-b px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{formatCrmStatus(column.status)}</p>
                  <p className="text-xs text-slate-500">{column.leads.length} leads</p>
                </div>
                <div className="space-y-2 p-2">
                  {column.leads.slice(0, 4).map((lead) => (
                    <Link key={lead.id} href={`/crm/leads/${lead.id}`} className="block rounded-md bg-slate-50 p-2 text-xs hover:bg-orange-50">
                      <span className="font-medium text-slate-900">{lead.name}</span>
                      <span className="mt-1 block text-slate-500">{lead.lead_score}/100 score</span>
                    </Link>
                  ))}
                  {column.leads.length === 0 ? <p className="p-2 text-xs text-slate-400">No leads</p> : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card id="add-lead">
        <CardHeader>
          <CardTitle>Add lead</CardTitle>
          <CardDescription>Create a CRM lead with source, requirements, budget, and owner.</CardDescription>
        </CardHeader>
        <CardContent>
          {!permissions.canCreateLead ? (
            <p className="text-sm text-slate-500">You do not have permission to create leads.</p>
          ) : !defaultBranchId ? (
            <p className="text-sm text-slate-500">Create a branch before adding leads.</p>
          ) : (
            <LeadCreateForm
              branches={branches}
              companyId={workspace.companyId}
              defaultBranchId={defaultBranchId}
              profileId={workspace.profileId}
              users={userOptions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
