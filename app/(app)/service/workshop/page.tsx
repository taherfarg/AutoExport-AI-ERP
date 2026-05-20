import { KpiCard } from "@/components/dashboard/kpi-card";
import { FinanceStatusBadge } from "@/components/finance/finance-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranches } from "@/features/branches/queries";
import { getServicePermissions, getServiceWorkshopData } from "@/features/service/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatServiceStatus } from "@/lib/service/format";
import { formatMoney } from "@/lib/vehicles/format";
import {
  InspectionResultForm,
  LaborLineForm,
  ServiceAppointmentForm,
  ServiceJobForm,
  ServiceOrderForm,
  TechnicianForm,
  WarrantyClaimForm,
} from "./service-action-forms";

function nextAppointmentIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export default async function ServiceWorkshopPage() {
  const workspace = await getCurrentWorkspace();
  const [service, branches, permissions] = await Promise.all([
    getServiceWorkshopData(workspace.companyId),
    getBranches(workspace.companyId),
    getServicePermissions(workspace.companyId),
  ]);

  const currencyCode = service.vehicles[0]?.currency_code ?? branches[0]?.currency_code ?? "AED";

  if (!permissions.canViewService) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service access required</CardTitle>
          <CardDescription>Ask an administrator for `view_service` or `manage_service` permission.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Service Workshop</h2>
        <p className="text-sm text-slate-500">Repair orders, job cards, labor, inspections, warranty claims, and service appointments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Open orders" value={String(service.summary.openOrders)} hint="Not completed or cancelled" />
        <KpiCard title="Active jobs" value={String(service.summary.activeJobs)} hint="Assigned or in progress" />
        <KpiCard title="Labor total" value={formatMoney(service.summary.laborTotal, currencyCode)} hint="Recorded labor value" />
        <KpiCard title="Warranty balance" value={formatMoney(service.summary.warrantyBalance, currencyCode)} hint="Approved unpaid claims" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service orders</CardTitle>
              <CardDescription>Vehicle and customer repair order history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.serviceOrders.map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{order.order_number}</p>
                          <p className="text-xs text-slate-500">{order.title}</p>
                        </td>
                        <td className="px-4 py-3">{order.vehicles?.stock_number ?? "No vehicle"}</td>
                        <td className="px-4 py-3">{order.customers?.name ?? "Walk-in"}</td>
                        <td className="px-4 py-3"><FinanceStatusBadge status={order.status} /></td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(order.total_amount, order.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Job cards</CardTitle>
                <CardDescription>Technician work items and labor estimates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.serviceJobs.slice(0, 8).map((job) => (
                  <div key={job.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{job.job_number}</p>
                        <p className="text-xs text-slate-500">{job.title} · {job.technicians?.display_name ?? "Unassigned"}</p>
                      </div>
                      <FinanceStatusBadge status={job.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{formatMoney(job.labor_amount, currencyCode)}</p>
                  </div>
                ))}
                {service.serviceJobs.length === 0 ? <p className="text-sm text-slate-500">No service jobs yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technicians</CardTitle>
                <CardDescription>Workshop team and current hourly rates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.technicians.slice(0, 8).map((technician) => (
                  <div key={technician.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{technician.display_name}</p>
                        <p className="text-xs text-slate-500">{technician.specialization ?? "General"} · {technician.branches?.name ?? "Company"}</p>
                      </div>
                      <FinanceStatusBadge status={technician.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{formatMoney(technician.hourly_rate, technician.currency_code)} / hr</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inspection results</CardTitle>
                <CardDescription>Vehicle health checks and quality inspection outcomes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.inspectionResults.slice(0, 6).map((result) => (
                  <div key={result.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{result.result_number}</p>
                        <p className="text-xs text-slate-500">{result.service_orders?.order_number ?? "Service order"} · {result.technicians?.display_name ?? "Technician"}</p>
                      </div>
                      <FinanceStatusBadge status={result.overall_status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{Number(result.score_percent).toFixed(0)}%</p>
                  </div>
                ))}
                {service.inspectionResults.length === 0 ? <p className="text-sm text-slate-500">No inspection results yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warranty claims</CardTitle>
                <CardDescription>Claim amounts, approvals, and unpaid balances.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.warrantyClaims.slice(0, 6).map((claim) => (
                  <div key={claim.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{claim.claim_number}</p>
                        <p className="text-xs text-slate-500">{claim.provider_name} · {claim.service_orders?.order_number ?? "Service"}</p>
                      </div>
                      <FinanceStatusBadge status={claim.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{formatMoney(Math.max(Number(claim.approved_amount) - Number(claim.paid_amount), 0), claim.currency_code)} balance</p>
                  </div>
                ))}
                {service.warrantyClaims.length === 0 ? <p className="text-sm text-slate-500">No warranty claims yet.</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Appointments and labor ledger</CardTitle>
              <CardDescription>Upcoming workshop visits and recorded labor lines.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {service.appointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{appointment.appointment_number}</p>
                    <p className="text-xs text-slate-500">{appointment.title}</p>
                    <p className="mt-2">{formatServiceStatus(appointment.status)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {service.laborLines.slice(0, 5).map((line) => (
                  <div key={line.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{line.line_number}</p>
                    <p className="text-xs text-slate-500">{line.description}</p>
                    <p className="mt-2 text-right font-medium">{formatMoney(line.amount, currencyCode)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canManageService ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create service order</CardTitle>
                  <CardDescription>Open a repair order against a vehicle and customer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ServiceOrderForm companyId={workspace.companyId} branches={branches} vehicles={service.vehicles} customers={service.customers} currencyCode={currencyCode} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create technician</CardTitle>
                  <CardDescription>Add a workshop technician to the roster.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TechnicianForm companyId={workspace.companyId} branches={branches} currencyCode={currencyCode} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Book appointment</CardTitle>
                  <CardDescription>Schedule a service visit.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ServiceAppointmentForm companyId={workspace.companyId} branches={branches} vehicles={service.vehicles} customers={service.customers} startIso={nextAppointmentIso()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workshop execution</CardTitle>
                  <CardDescription>Create job cards, labor lines, and inspections.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ServiceJobForm companyId={workspace.companyId} orders={service.serviceOrders} technicians={service.technicians} />
                  <LaborLineForm companyId={workspace.companyId} orders={service.serviceOrders} jobs={service.serviceJobs} technicians={service.technicians} />
                  <InspectionResultForm companyId={workspace.companyId} orders={service.serviceOrders} technicians={service.technicians} checklists={service.checklists} />
                </CardContent>
              </Card>
            </>
          ) : null}

          {permissions.canManageWarrantyClaims ? (
            <Card>
              <CardHeader>
                <CardTitle>Warranty claim</CardTitle>
                <CardDescription>Submit or track warranty claim recovery.</CardDescription>
              </CardHeader>
              <CardContent>
                <WarrantyClaimForm companyId={workspace.companyId} orders={service.serviceOrders} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
