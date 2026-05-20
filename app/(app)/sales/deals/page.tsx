import { BadgeCheck, Calculator, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDeal,
  createDealApproval,
  createDealProduct,
  createFinanceApplication,
  createInsuranceProduct,
  createLender,
  createLenderSubmission,
  createWarrantyProduct,
  decideDealApproval,
} from "@/features/deals/actions";
import { getDealDeskData, getDealPermissions } from "@/features/deals/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMoney } from "@/lib/vehicles/format";
import { DealActionForm } from "./deal-action-forms";

type Relation = { name?: string | null };
type VehicleRelation = { stock_number?: string | null; brand?: string | null; model?: string | null; year?: number | null };

function relationName(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  return (row as Relation | null)?.name ?? null;
}

function vehicleLabel(value: unknown) {
  const row = (Array.isArray(value) ? value[0] : value) as VehicleRelation | null;
  return row ? `${row.stock_number ?? "Stock"} / ${row.year ?? ""} ${row.brand ?? ""} ${row.model ?? ""}` : "Vehicle";
}

function statusClass(status: string) {
  if (["approved", "funded", "accepted"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["rejected", "declined", "error", "cancelled"].includes(status)) return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

type DealDeskPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DealDeskPage({ searchParams }: DealDeskPageProps) {
  const params = await searchParams;
  const notice = firstParam(params.notice);
  const workspace = await getCurrentWorkspace();
  const [permissions, data] = await Promise.all([
    getDealPermissions(workspace.companyId),
    getDealDeskData(workspace.companyId),
  ]);
  const defaultBranch = data.branches[0];
  const defaultQuotation = data.quotations[0];
  const defaultVehicle = defaultQuotation?.vehicles ? null : data.vehicles[0];
  const defaultDeal = data.deals[0];
  const defaultLender = data.lenders[0];
  const defaultApplication = data.applications[0];
  const pendingApproval = data.approvals.find((approval) => approval.status === "pending") ?? data.approvals[0];
  const quotedValue = data.deals.reduce((sum, deal) => sum + Number(deal.finance_amount), 0);
  const monthlyValue = data.deals.reduce((sum, deal) => sum + Number(deal.monthly_payment), 0);

  if (!permissions.canViewDeals) {
    return (
      <Card className="border-red-100 bg-red-50/30">
        <CardHeader>
          <CardTitle>Deal Desk access required</CardTitle>
          <CardDescription>Ask an administrator for `view_deals` or `manage_deals` permission.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const defaultVehicleId = defaultQuotation?.vehicle_id ?? defaultVehicle?.id ?? "";
  const defaultBranchId = defaultQuotation?.branch_id ?? defaultVehicle?.branch_id ?? defaultBranch?.id ?? "";
  const defaultVehiclePrice = Number(defaultQuotation?.total ?? defaultVehicle?.selling_price ?? 0);
  const defaultCurrencyCode = defaultQuotation?.currency_code ?? defaultVehicle?.currency_code ?? "AED";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">F&I Deal Desk</h2>
        <p className="text-sm text-slate-500">Structure cash, finance, and lease deals with products, lender submissions, and approvals.</p>
      </div>

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Deals" value={String(data.deals.length)} hint="Active deal structures" />
        <KpiCard title="Finance amount" value={formatMoney(quotedValue, defaultCurrencyCode)} hint="Total amount requested" />
        <KpiCard title="Monthly payment" value={formatMoney(monthlyValue, defaultCurrencyCode)} hint="Combined monthly payments" />
        <KpiCard title="Applications" value={String(data.applications.length)} hint="Finance applications" />
        <KpiCard title="Approvals" value={String(data.approvals.length)} hint="Manager approval records" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-blue-600" /> Create deal structure</CardTitle>
          <CardDescription>Build the deal from an existing quotation or vehicle and calculate the finance terms.</CardDescription>
        </CardHeader>
        <CardContent>
          {!permissions.canManageDeals ? (
            <p className="text-sm text-slate-500">You do not have permission to manage deals.</p>
          ) : !defaultBranchId || !defaultVehicleId ? (
            <p className="text-sm text-slate-500">Create a branch, vehicle, and quotation before structuring a deal.</p>
          ) : (
            <DealActionForm action={createDeal} buttonLabel="Create deal">
              <input type="hidden" name="companyId" value={workspace.companyId} />
              <input type="hidden" name="branchId" value={defaultBranchId} />
              <input type="hidden" name="vehicleId" value={defaultVehicleId} />
              <input type="hidden" name="quotationId" value={defaultQuotation?.id ?? ""} />
              <input type="hidden" name="customerId" value={defaultQuotation?.customer_id ?? ""} />
              <input type="hidden" name="leadId" value={defaultQuotation?.lead_id ?? ""} />
              <div className="grid gap-2">
                <Label htmlFor="dealType">Deal type</Label>
                <select id="dealType" name="dealType" defaultValue="finance" className="h-9 rounded-md border bg-white px-3 text-sm">
                  <option value="cash">Cash</option>
                  <option value="finance">Finance</option>
                  <option value="lease">Lease</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehiclePrice">Vehicle price</Label>
                <Input id="vehiclePrice" name="vehiclePrice" type="number" min="0" defaultValue={defaultVehiclePrice} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productTotal">Product total</Label>
                <Input id="productTotal" name="productTotal" type="number" min="0" defaultValue="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="downPayment">Down payment</Label>
                <Input id="downPayment" name="downPayment" type="number" min="0" defaultValue="30000" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tradeInValue">Trade-in value</Label>
                <Input id="tradeInValue" name="tradeInValue" type="number" min="0" defaultValue="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="termMonths">Term months</Label>
                <Input id="termMonths" name="termMonths" type="number" min="1" defaultValue="60" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="annualInterestRate">Interest rate</Label>
                <Input id="annualInterestRate" name="annualInterestRate" type="number" min="0" step="0.01" defaultValue={defaultLender?.base_rate ?? 4.5} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="balloonPayment">Balloon</Label>
                <Input id="balloonPayment" name="balloonPayment" type="number" min="0" defaultValue="0" />
              </div>
              <input type="hidden" name="currencyCode" value={defaultCurrencyCode} />
              <div className="grid gap-2 md:col-span-4">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Manager review required before contract." />
              </div>
            </DealActionForm>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Deal pipeline</CardTitle>
            <CardDescription>{data.deals.length} deal structures in this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.deals.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">No deals yet.</div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Deal</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deals.map((deal) => (
                      <tr key={deal.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{deal.deal_number}</td>
                        <td className="px-4 py-3">{relationName(deal.customers) ?? relationName(deal.leads) ?? "Buyer"}</td>
                        <td className="px-4 py-3">{vehicleLabel(deal.vehicles)}</td>
                        <td className="px-4 py-3"><Badge className={statusClass(deal.status)}>{deal.status}</Badge></td>
                        <td className="px-4 py-3 text-right">{formatMoney(Number(deal.monthly_payment), deal.currency_code)}</td>
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
            <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-orange-600" /> Lenders</CardTitle>
            <CardDescription>Manual now, API-ready later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {data.lenders.slice(0, 4).map((lender) => (
                <div key={lender.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{lender.name}</p>
                  <p className="text-xs text-slate-500">{lender.country_code} / {lender.base_rate}% base</p>
                </div>
              ))}
            </div>
            {permissions.canManageDeals ? (
              <DealActionForm action={createLender} buttonLabel="Save lender" className="grid gap-3">
                <input type="hidden" name="companyId" value={workspace.companyId} />
                <input type="hidden" name="branchId" value={defaultBranch?.id ?? ""} />
                <Input id="name" name="name" placeholder="Lender name" defaultValue="GCC Auto Finance" />
                <input type="hidden" name="lenderType" value="bank" />
                <input type="hidden" name="countryCode" value="AE" />
                <Input id="baseRate" name="baseRate" type="number" step="0.01" defaultValue="4.5" />
              </DealActionForm>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> F&I products</CardTitle>
            <CardDescription>Insurance and warranty products available for deal gross.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <DealActionForm action={createInsuranceProduct} buttonLabel="Save insurance" className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="companyId" value={workspace.companyId} />
              <Input id="insuranceName" name="insuranceName" defaultValue="Comprehensive Insurance" />
              <Input id="insuranceProviderName" name="insuranceProviderName" defaultValue="Gulf Shield" />
              <Input id="premiumAmount" name="premiumAmount" type="number" defaultValue="3500" />
              <Input id="insuranceCostAmount" name="insuranceCostAmount" type="number" defaultValue="2800" />
              <Input id="insuranceCommissionAmount" name="insuranceCommissionAmount" type="number" defaultValue="350" />
              <input type="hidden" name="currencyCode" value={defaultCurrencyCode} />
            </DealActionForm>
            <DealActionForm action={createWarrantyProduct} buttonLabel="Save warranty" className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="companyId" value={workspace.companyId} />
              <Input id="warrantyName" name="warrantyName" defaultValue="Extended Warranty" />
              <Input id="warrantyProviderName" name="warrantyProviderName" defaultValue="AutoSphere Warranty" />
              <Input id="coverageMonths" name="coverageMonths" type="number" defaultValue="24" />
              <Input id="coverageKm" name="coverageKm" type="number" defaultValue="60000" />
              <Input id="retailAmount" name="retailAmount" type="number" defaultValue="4500" />
              <Input id="warrantyCostAmount" name="warrantyCostAmount" type="number" defaultValue="3000" />
              <Input id="warrantyCommissionAmount" name="warrantyCommissionAmount" type="number" defaultValue="500" />
              <input type="hidden" name="currencyCode" value={defaultCurrencyCode} />
            </DealActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-orange-600" /> Applications and approvals</CardTitle>
            <CardDescription>Submit to lenders and request manager decision.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {defaultDeal ? (
              <>
                <DealActionForm action={createDealProduct} buttonLabel="Add deal product" className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="dealId" value={defaultDeal.id} />
                  <input type="hidden" name="productType" value="warranty" />
                  <Input id="productName" name="productName" defaultValue="Extended Warranty 24M" />
                  <Input id="sellingPrice" name="sellingPrice" type="number" defaultValue="4500" />
                  <Input id="costAmount" name="costAmount" type="number" defaultValue="3000" />
                </DealActionForm>
                <DealActionForm action={createFinanceApplication} buttonLabel="Submit finance application" className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="dealId" value={defaultDeal.id} />
                  <input type="hidden" name="lenderId" value={defaultLender?.id ?? ""} />
                  <Input id="applicantName" name="applicantName" defaultValue="Finance Buyer" />
                  <Input id="applicantEmail" name="applicantEmail" defaultValue="buyer@example.test" />
                  <Input id="applicantPhone" name="applicantPhone" defaultValue="+971500000001" />
                  <Input id="employmentStatus" name="employmentStatus" defaultValue="employed" />
                  <Input id="annualIncome" name="annualIncome" type="number" defaultValue="360000" />
                </DealActionForm>
                {defaultApplication && defaultLender ? (
                  <DealActionForm action={createLenderSubmission} buttonLabel="Send lender submission" className="grid gap-3">
                    <input type="hidden" name="companyId" value={workspace.companyId} />
                    <input type="hidden" name="financeApplicationId" value={defaultApplication.id} />
                    <input type="hidden" name="lenderId" value={defaultLender.id} />
                  </DealActionForm>
                ) : null}
                <DealActionForm action={createDealApproval} buttonLabel="Request approval" className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="dealId" value={defaultDeal.id} />
                  <input type="hidden" name="approvalType" value="manager" />
                  <Input id="approvalNotes" name="approvalNotes" defaultValue="Approve finance structure and products." />
                </DealActionForm>
                {pendingApproval && permissions.canApproveDeals ? (
                  <DealActionForm action={decideDealApproval} buttonLabel="Approve pending deal" className="grid gap-3">
                    <input type="hidden" name="companyId" value={workspace.companyId} />
                    <input type="hidden" name="approvalId" value={pendingApproval.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <Input id="decisionNotes" name="decisionNotes" defaultValue="Approved for contract." />
                  </DealActionForm>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">Create a deal before adding applications or approvals.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-emerald-600" /> Submission history</CardTitle>
          <CardDescription>Lender responses stay linked to finance applications.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {data.submissions.length === 0 ? (
            <p className="text-sm text-slate-500">No lender submissions yet.</p>
          ) : (
            data.submissions.map((submission) => (
              <div key={submission.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{submission.submission_number}</p>
                <p className="text-xs text-slate-500">{relationName(submission.lenders) ?? "Lender"}</p>
                <Badge className={statusClass(submission.status)}>{submission.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
