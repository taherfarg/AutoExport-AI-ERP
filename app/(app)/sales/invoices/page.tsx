import Link from "next/link";
import { Receipt } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesStatusBadge } from "@/components/sales/sales-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getInvoices,
  getPaymentsForInvoices,
  getSalesDashboardStats,
} from "@/features/sales/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatSalesStatus } from "@/lib/sales/format";
import { formatMoney } from "@/lib/vehicles/format";

export default async function SalesInvoicesPage() {
  const workspace = await getCurrentWorkspace();
  const invoices = await getInvoices(workspace.companyId);
  const payments = await getPaymentsForInvoices(workspace.companyId, invoices.map((invoice) => invoice.id));
  const stats = getSalesDashboardStats([], [], invoices);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Sales Invoices</h2>
          <p className="text-sm text-slate-500">Monitor final invoices, paid amount, and customer balances.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/sales/quotations">
            <Receipt className="h-4 w-4" />
            Quotations
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Invoices" value={String(stats.invoices)} hint="Final sales invoices" />
        <KpiCard title="Invoiced value" value={formatMoney(stats.invoicedValue, invoices[0]?.currency_code ?? "AED")} hint="Total customer charges" />
        <KpiCard title="Paid amount" value={formatMoney(stats.paidAmount, invoices[0]?.currency_code ?? "AED")} hint="Completed payments" />
        <KpiCard title="Balance due" value={formatMoney(stats.balanceDue, invoices[0]?.currency_code ?? "AED")} hint="Open receivables" />
        <KpiCard title="Payments" value={String(payments.length)} hint="Recorded payment rows" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice monitor</CardTitle>
          <CardDescription>{invoices.length} invoices visible through sales/payment permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium text-slate-900">No invoices found</p>
              <p className="mt-1 text-sm text-slate-500">Create a final invoice from a quotation detail page.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{invoice.invoice_number}</p>
                        <p className="text-xs text-slate-500">Due {new Date(invoice.due_date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3">{invoice.customers?.name ?? "Customer"}</td>
                      <td className="px-4 py-3">
                        {invoice.vehicles ? `${invoice.vehicles.year} ${invoice.vehicles.brand} ${invoice.vehicles.model}` : "Vehicle"}
                      </td>
                      <td className="px-4 py-3"><SalesStatusBadge status={invoice.invoice_status} /></td>
                      <td className="px-4 py-3 text-right">{formatMoney(invoice.paid_amount, invoice.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(invoice.balance_due, invoice.currency_code)}</td>
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
          <CardTitle>Payment history</CardTitle>
          <CardDescription>{payments.length} completed or pending payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-sm text-slate-500">No payment records yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{payment.payment_number}</td>
                      <td className="px-4 py-3">{formatSalesStatus(payment.payment_type)}</td>
                      <td className="px-4 py-3">{formatSalesStatus(payment.payment_method)}</td>
                      <td className="px-4 py-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(payment.amount, payment.currency_code)}</td>
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

