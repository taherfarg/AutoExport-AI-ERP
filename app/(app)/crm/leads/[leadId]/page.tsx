import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MessageSquare, Search } from "lucide-react";
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
import {
  createFollowUp,
  logLeadMessage,
  updateLeadStatus,
} from "@/features/crm/actions";
import {
  getCrmPermissions,
  getLeadDetail,
  getLeadFollowUps,
  getLeadMessages,
  getMatchingVehicles,
} from "@/features/crm/queries";
import { getCompanyUsers } from "@/features/users/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatCrmStatus, isFollowUpOverdue } from "@/lib/crm/format";
import { formatMoney } from "@/lib/vehicles/format";
import { followUpPriorities, leadStatuses, messageChannels, messageDirections } from "@/lib/validations/crm";

type LeadDetailPageProps = {
  params: Promise<{ leadId: string }>;
};

type CompanyUserRow = {
  profiles: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
};

function profileFrom(row: CompanyUserRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function defaultDueAt() {
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return due.toISOString().slice(0, 16);
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params;
  const workspace = await getCurrentWorkspace();

  let lead;
  try {
    lead = await getLeadDetail(workspace.companyId, leadId);
  } catch {
    notFound();
  }

  const [permissions, followUps, messages, matchingVehicles, users] = await Promise.all([
    getCrmPermissions(workspace.companyId),
    getLeadFollowUps(workspace.companyId, leadId),
    getLeadMessages(workspace.companyId, leadId),
    getMatchingVehicles(workspace.companyId, lead),
    getCompanyUsers(workspace.companyId),
  ]);
  const userOptions = (users as unknown as CompanyUserRow[])
    .map(profileFrom)
    .filter(Boolean) as { id: string; full_name: string; email: string }[];
  const userNameById = new Map(userOptions.map((user) => [user.id, user.full_name]));
  const openFollowUps = followUps.filter((followUp) => followUp.status === "open");
  const overdueFollowUps = openFollowUps.filter((followUp) => isFollowUpOverdue(followUp.due_at, followUp.status));

  async function updateStatusFromForm(formData: FormData) {
    "use server";

    await updateLeadStatus(formData);
  }

  async function createFollowUpFromForm(formData: FormData) {
    "use server";

    await createFollowUp(formData);
  }

  async function logMessageFromForm(formData: FormData) {
    "use server";

    await logLeadMessage(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/crm/leads">
              <ArrowLeft className="h-4 w-4" />
              Back to leads
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">{lead.name}</h2>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-slate-500">
              {formatCrmStatus(lead.customer_type)} / {lead.branches?.name ?? "No branch"}
            </p>
          </div>
        </div>
        {permissions.canUpdateLead ? (
          <form action={updateStatusFromForm} className="flex gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <select name="status" defaultValue={lead.status} className="h-9 rounded-md border bg-white px-3 text-sm">
              {leadStatuses.map((status) => (
                <option key={status} value={status}>{formatCrmStatus(status)}</option>
              ))}
            </select>
            <Button type="submit" variant="outline">Update status</Button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Lead score" value={`${lead.lead_score}/100`} hint="Stored CRM score" />
        <KpiCard title="Budget" value={formatMoney(lead.budget ?? 0, lead.currency_code)} hint="Buyer target" />
        <KpiCard title="Open follow-ups" value={String(openFollowUps.length)} hint="Active tasks" />
        <KpiCard title="Overdue" value={String(overdueFollowUps.length)} hint="Needs attention" />
        <KpiCard title="Matches" value={String(matchingVehicles.length)} hint="Available stock suggestions" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead profile</CardTitle>
              <CardDescription>Customer requirements, source, and assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm md:grid-cols-3">
                {[
                  ["Phone", lead.phone ?? "-"],
                  ["WhatsApp", lead.whatsapp ?? "-"],
                  ["Email", lead.email ?? "-"],
                  ["Country", lead.country_code ?? "-"],
                  ["City", lead.city ?? "-"],
                  ["Language", lead.language],
                  ["Source", formatCrmStatus(lead.lead_source)],
                  ["Owner", lead.assigned_salesperson_id ? userNameById.get(lead.assigned_salesperson_id) ?? "Assigned user" : "Unassigned"],
                  ["Last contact", lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleString() : "-"],
                  ["Next follow-up", lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : "-"],
                  ["Preferred brand", lead.preferred_brand ?? "-"],
                  ["Preferred model", lead.preferred_model ?? "-"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {lead.notes ? <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700">{lead.notes}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matching vehicles</CardTitle>
              <CardDescription>Available stock filtered by lead preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {matchingVehicles.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">
                  No current stock matches this lead preference.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingVehicles.map((vehicle) => (
                        <tr key={vehicle.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link href={`/vehicles/${vehicle.id}`} className="font-medium hover:text-orange-600">
                              {vehicle.year} {vehicle.brand} {vehicle.model}
                            </Link>
                            <p className="text-xs text-slate-500">{vehicle.trim ?? (vehicle.export_available ? "Export available" : "Local sale")}</p>
                          </td>
                          <td className="px-4 py-3">{vehicle.stock_number}</td>
                          <td className="px-4 py-3">{formatCrmStatus(vehicle.status)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatMoney(vehicle.selling_price, vehicle.currency_code)}</td>
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
              <CardTitle>Messages</CardTitle>
              <CardDescription>{messages.length} logged communication records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-sm text-slate-500">No messages logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <p className="font-medium">{message.subject ?? formatCrmStatus(message.channel)}</p>
                        <span className="text-xs text-slate-500">{formatCrmStatus(message.direction)} / {new Date(message.message_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-slate-700">{message.body}</p>
                    </div>
                  ))}
                </div>
              )}
              {permissions.canUpdateLead ? (
                <form action={logMessageFromForm} className="grid gap-3 rounded-md border p-4 md:grid-cols-3">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="direction">Direction</Label>
                    <select id="direction" name="direction" defaultValue="internal" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {messageDirections.map((direction) => (
                        <option key={direction} value={direction}>{formatCrmStatus(direction)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="channel">Channel</Label>
                    <select id="channel" name="channel" defaultValue="whatsapp" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {messageChannels.map((channel) => (
                        <option key={channel} value={channel}>{formatCrmStatus(channel)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" />
                  </div>
                  <div className="grid gap-2 md:col-span-3">
                    <Label htmlFor="body">Message</Label>
                    <textarea id="body" name="body" required className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-3">
                    <Button type="submit" variant="outline">
                      <MessageSquare className="h-4 w-4" />
                      Log message
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Follow-ups</CardTitle>
              <CardDescription>{followUps.length} scheduled CRM actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {followUps.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-sm text-slate-500">No follow-ups scheduled yet.</p>
              ) : (
                <div className="space-y-3">
                  {followUps.map((followUp) => (
                    <div key={followUp.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <CalendarClock className={isFollowUpOverdue(followUp.due_at, followUp.status) ? "mt-0.5 h-4 w-4 text-red-600" : "mt-0.5 h-4 w-4 text-orange-500"} />
                        <div>
                          <p className="font-medium">{followUp.title}</p>
                          <p className="text-xs text-slate-500">
                            {formatCrmStatus(followUp.priority)} / {new Date(followUp.due_at).toLocaleString()}
                          </p>
                          {followUp.notes ? <p className="mt-2 text-slate-600">{followUp.notes}</p> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {permissions.canCreateFollowUp ? (
                <form action={createFollowUpFromForm} className="grid gap-3 rounded-md border p-4">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" defaultValue="Call buyer" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueAt">Due date</Label>
                    <Input id="dueAt" name="dueAt" type="datetime-local" defaultValue={defaultDueAt()} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select id="priority" name="priority" defaultValue="normal" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {followUpPriorities.map((priority) => (
                        <option key={priority} value={priority}>{formatCrmStatus(priority)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assignedTo">Owner</Label>
                    <select id="assignedTo" name="assignedTo" defaultValue={lead.assigned_salesperson_id ?? workspace.profileId} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {userOptions.map((user) => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="followUpNotes">Notes</Label>
                    <textarea id="followUpNotes" name="notes" className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm" />
                  </div>
                  <Button type="submit">
                    <CalendarClock className="h-4 w-4" />
                    Create follow-up
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI-ready context</CardTitle>
              <CardDescription>Structured CRM data prepared for later AI tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requirement</span>
                  <span className="font-medium">{[lead.preferred_brand, lead.preferred_model].filter(Boolean).join(" ") || "Open"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source</span>
                  <span className="font-medium">{formatCrmStatus(lead.lead_source)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Suggested stock</span>
                  <span className="font-medium">{matchingVehicles.length}</span>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/vehicles?search=${encodeURIComponent([lead.preferred_brand, lead.preferred_model].filter(Boolean).join(" "))}`}>
                    <Search className="h-4 w-4" />
                    Search inventory
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

