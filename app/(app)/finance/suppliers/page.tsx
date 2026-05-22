import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Clock3, Landmark, PackageCheck, ReceiptText } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FinanceStatusBadge } from "@/components/finance/finance-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranches } from "@/features/branches/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMoney } from "@/lib/vehicles/format";
import { getSupplierDashboardData, getSupplierPermissions } from "@/features/suppliers/queries";
import { formatSupplierCategory, formatSupplierRisk } from "@/lib/suppliers/format";
import { SupplierForm, SupplierPayableForm } from "./supplier-action-forms";

export const metadata: Metadata = {
  title: "Suppliers | AutoSphere ERP",
  description: "Supplier and vendor master data linked to finance, accounting, parts, and purchase workflows.",
};

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function riskClass(risk: string) {
  if (risk === "high") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function SuppliersPage() {
  const workspace = await getCurrentWorkspace();
  const [supplierData, branches, permissions] = await Promise.all([
    getSupplierDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getSupplierPermissions(workspace.companyId),
  ]);
  const currencyCode = supplierData.suppliers[0]?.currency_code ?? branches[0]?.currency_code ?? "AED";

  if (!permissions.canViewSuppliers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier access required</CardTitle>
          <CardDescription>Ask an administrator for finance, accounting, parts, or supplier access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link href="/finance/accounting" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Accounting
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Suppliers & Vendors</h2>
          <p className="text-sm text-slate-500">
            Shared supplier master data for AP, expenses, parts purchasing, supplier invoices, and accounting review.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:flex">
          <span className="rounded-full border bg-white px-3 py-1">Finance linked</span>
          <span className="rounded-full border bg-white px-3 py-1">Parts purchasing</span>
          <span className="rounded-full border bg-white px-3 py-1">OCR-ready</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Suppliers" value={String(supplierData.summary.totalSuppliers)} hint={`${supplierData.summary.activeSuppliers} active`} />
        <KpiCard title="Open AP" value={formatMoney(supplierData.summary.openBalance, currencyCode)} hint="Supplier balances due" />
        <KpiCard title="Open PO value" value={formatMoney(supplierData.summary.openPurchaseOrderValue, currencyCode)} hint="Parts orders not received" />
        <KpiCard title="61+ days" value={formatMoney(supplierData.summary.aging.days61Plus, currencyCode)} hint="Highest priority AP aging" />
        <KpiCard title="High risk" value={String(supplierData.summary.highRiskSuppliers)} hint="Suppliers needing action" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.48fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-500" />
                Supplier master
              </CardTitle>
              <CardDescription>One supplier record links payables, expenses, parts POs, and future documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-right">Open AP</th>
                      <th className="px-4 py-3 text-right">PO value</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierData.suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-t align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{supplier.supplier_name}</p>
                          <p className="text-xs text-slate-500">{supplier.supplier_code ?? "No code"} - {supplier.country_code ?? "Global"}</p>
                        </td>
                        <td className="px-4 py-3">{formatSupplierCategory(supplier.category)}</td>
                        <td className="px-4 py-3">
                          <p>{supplier.contact_name ?? "Accounts team"}</p>
                          <p className="text-xs text-slate-500">{supplier.email ?? supplier.phone ?? "No contact"}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(supplier.financials.openBalance, supplier.currency_code)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(supplier.financials.openPurchaseOrderValue, supplier.currency_code)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${riskClass(supplier.riskLevel)}`}>
                            {formatSupplierRisk(supplier.riskLevel)}
                          </span>
                        </td>
                        <td className="px-4 py-3"><FinanceStatusBadge status={supplier.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {supplierData.suppliers.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No suppliers yet. Create the first shared supplier to link payables and purchase orders.</p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-orange-500" />AP aging</CardTitle>
                <CardDescription>Supplier balance buckets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Current</span><strong>{formatMoney(supplierData.summary.aging.current, currencyCode)}</strong></div>
                <div className="flex justify-between"><span>1-30 days</span><strong>{formatMoney(supplierData.summary.aging.days1To30, currencyCode)}</strong></div>
                <div className="flex justify-between"><span>31-60 days</span><strong>{formatMoney(supplierData.summary.aging.days31To60, currencyCode)}</strong></div>
                <div className="flex justify-between"><span>61+ days</span><strong>{formatMoney(supplierData.summary.aging.days61Plus, currencyCode)}</strong></div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-orange-500" />Recent supplier payables</CardTitle>
                <CardDescription>Open and recent vendor obligations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplierData.payables.slice(0, 6).map((payable) => (
                  <div key={payable.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">{payable.payable_number}</p>
                      <p className="text-xs text-slate-500">{payable.supplier_name} - {payable.description}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-medium">{formatMoney(payable.balance_due, payable.currency_code)}</p>
                      <FinanceStatusBadge status={payable.status} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-orange-500" />Parts purchase links</CardTitle>
              <CardDescription>Supplier master records are linked to parts purchase orders.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {supplierData.purchaseOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{order.purchase_order_number}</p>
                      <p className="text-xs text-slate-500">Supplier-linked parts purchasing</p>
                    </div>
                    <FinanceStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-right font-medium">{formatMoney(order.total_amount, order.currency_code)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {permissions.canManageSuppliers ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create supplier</CardTitle>
                  <CardDescription>Add supplier master data once, then reuse it across the ERP.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SupplierForm companyId={workspace.companyId} currencyCode={currencyCode} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create supplier payable</CardTitle>
                  <CardDescription>Record an AP obligation linked directly to supplier master data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SupplierPayableForm
                    companyId={workspace.companyId}
                    branches={branches}
                    suppliers={supplierData.suppliers}
                    currencyCode={currencyCode}
                    dueDate={dateIn(14)}
                  />
                </CardContent>
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4 text-orange-500" />Accounting links</CardTitle>
              <CardDescription>Supplier data now feeds AP aging, accounting review, finance payables, and purchase workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Payables and expenses can be traced to a supplier record instead of loose text.</p>
              <p>Parts purchase orders reuse the same supplier IDs for cleaner AP and purchasing reports.</p>
              <p>OCR supplier invoices can commit into controlled supplier and payable workflows.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
