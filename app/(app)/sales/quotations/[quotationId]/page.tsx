import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Receipt, WalletCards } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInvoiceFromQuotation,
  createProformaFromQuotation,
  createReservationFromQuotation,
  recordPayment,
} from "@/features/sales/actions";
import {
  getPaymentsForInvoices,
  getQuotationDetail,
  getQuotationInvoices,
  getQuotationProformas,
  getQuotationReservations,
  getSalesPermissions,
} from "@/features/sales/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatSalesStatus } from "@/lib/sales/format";
import { formatMoney } from "@/lib/vehicles/format";
import { paymentMethods, paymentTypes } from "@/lib/validations/sales";

type QuotationDetailPageProps = {
  params: Promise<{ quotationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function quotationMessageUrl(quotationId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/sales/quotations/${quotationId}?${searchParams.toString()}`;
}

export default async function QuotationDetailPage({ params, searchParams }: QuotationDetailPageProps) {
  const { quotationId } = await params;
  const pageParams = await searchParams;
  const actionError = firstParam(pageParams.error);
  const actionSuccess = firstParam(pageParams.success);
  const workspace = await getCurrentWorkspace();

  let quotation;
  try {
    quotation = await getQuotationDetail(workspace.companyId, quotationId);
  } catch {
    notFound();
  }

  const [permissions, reservations, proformas, invoices] = await Promise.all([
    getSalesPermissions(workspace.companyId),
    getQuotationReservations(workspace.companyId, quotationId),
    getQuotationProformas(workspace.companyId, quotationId),
    getQuotationInvoices(workspace.companyId, quotationId),
  ]);
  const payments = await getPaymentsForInvoices(workspace.companyId, invoices.map((invoice) => invoice.id));
  const latestInvoice = invoices[0];
  const buyerName = quotation.customers?.name ?? quotation.leads?.name ?? "Walk-in buyer";

  async function reserveFromForm(formData: FormData) {
    "use server";

    const result = await createReservationFromQuotation(formData);
    if (result?.error) {
      redirect(quotationMessageUrl(String(formData.get("quotationId")), { error: result.error }));
    }
    redirect(quotationMessageUrl(String(formData.get("quotationId")), { success: "Reservation created." }));
  }

  async function proformaFromForm(formData: FormData) {
    "use server";

    const result = await createProformaFromQuotation(formData);
    if (result?.error) {
      redirect(quotationMessageUrl(String(formData.get("quotationId")), { error: result.error }));
    }
    redirect(quotationMessageUrl(String(formData.get("quotationId")), { success: "Proforma created." }));
  }

  async function invoiceFromForm(formData: FormData) {
    "use server";

    const result = await createInvoiceFromQuotation(formData);
    if (result?.error) {
      redirect(quotationMessageUrl(String(formData.get("quotationId")), { error: result.error }));
    }
    redirect(quotationMessageUrl(String(formData.get("quotationId")), { success: "Invoice created." }));
  }

  async function paymentFromForm(formData: FormData) {
    "use server";

    const result = await recordPayment(formData);
    if (result?.error) {
      redirect(quotationMessageUrl(quotationId, { error: result.error }));
    }
    redirect(quotationMessageUrl(quotationId, { success: "Payment recorded." }));
  }

  return (
    <div className="space-y-6">
      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/sales/quotations">
              <ArrowLeft className="h-4 w-4" />
              Back to quotations
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">{quotation.quotation_number}</h2>
              <SalesStatusBadge status={quotation.status} />
            </div>
            <p className="text-sm text-slate-500">
              {buyerName} / {quotation.vehicles ? `${quotation.vehicles.year} ${quotation.vehicles.brand} ${quotation.vehicles.model}` : "Vehicle"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/sales/invoices">
            <Receipt className="h-4 w-4" />
            Invoice monitor
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Price" value={formatMoney(quotation.price, quotation.currency_code)} hint="Before discount and tax" />
        <KpiCard title="Discount" value={formatMoney(quotation.discount, quotation.currency_code)} hint="Approved discount amount" />
        <KpiCard title="Total" value={formatMoney(quotation.total, quotation.currency_code)} hint="Customer-facing total" />
        <KpiCard title="Reservations" value={String(reservations.length)} hint="Vehicle holds from this quotation" />
        <KpiCard title="Invoices" value={String(invoices.length)} hint="Final invoices from this quotation" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation preview</CardTitle>
              <CardDescription>Clean HTML document template for customer review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white p-6">
                <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-500">AutoSphere ERP quotation</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">{quotation.quotation_number}</h3>
                    <p className="text-sm text-slate-500">Valid until {new Date(quotation.valid_until).toLocaleDateString()}</p>
                  </div>
                  <div className="text-sm md:text-right">
                    <p className="font-medium text-slate-950">{buyerName}</p>
                    <p className="text-slate-500">{quotation.customers?.phone ?? quotation.leads?.phone ?? "No phone"}</p>
                    <p className="text-slate-500">{quotation.branches?.name ?? "Branch"}</p>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-3">
                          {quotation.vehicles ? `${quotation.vehicles.year} ${quotation.vehicles.brand} ${quotation.vehicles.model} ${quotation.vehicles.trim ?? ""}` : "Vehicle"}
                          <p className="text-xs text-slate-500">{quotation.vehicles?.stock_number}</p>
                        </td>
                        <td className="px-4 py-3 text-right">{formatMoney(quotation.price, quotation.currency_code)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-3">Discount</td>
                        <td className="px-4 py-3 text-right">-{formatMoney(quotation.discount, quotation.currency_code)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-3">Tax</td>
                        <td className="px-4 py-3 text-right">{formatMoney(quotation.tax, quotation.currency_code)}</td>
                      </tr>
                      <tr className="border-t bg-slate-50 font-semibold">
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">{formatMoney(quotation.total, quotation.currency_code)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {quotation.notes ? <p className="mt-4 text-sm text-slate-600">{quotation.notes}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related documents</CardTitle>
              <CardDescription>Reservations, proformas, final invoices, and payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {reservations.map((reservation) => (
                  <div key={reservation.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{reservation.reservation_number}</p>
                    <p className="text-xs text-slate-500">Expires {new Date(reservation.expiry_date).toLocaleDateString()}</p>
                    <div className="mt-2"><SalesStatusBadge status={reservation.status} /></div>
                    <p className="mt-2">{formatMoney(reservation.deposit_amount, reservation.currency_code)} deposit</p>
                  </div>
                ))}
                {proformas.map((proforma) => (
                  <div key={proforma.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{proforma.proforma_number}</p>
                    <p className="text-xs text-slate-500">{proforma.export_destination ?? "No destination"}</p>
                    <div className="mt-2"><SalesStatusBadge status={proforma.status} /></div>
                    <p className="mt-2">{formatMoney(proforma.total, proforma.currency_code)}</p>
                  </div>
                ))}
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-xs text-slate-500">Due {new Date(invoice.due_date).toLocaleDateString()}</p>
                    <div className="mt-2"><SalesStatusBadge status={invoice.invoice_status} /></div>
                    <p className="mt-2">{formatMoney(invoice.balance_due, invoice.currency_code)} due</p>
                  </div>
                ))}
              </div>
              {payments.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="px-4 py-3">{payment.payment_number}</td>
                          <td className="px-4 py-3">{formatSalesStatus(payment.payment_type)}</td>
                          <td className="px-4 py-3">{formatSalesStatus(payment.payment_method)}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(payment.amount, payment.currency_code)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canReserveVehicle ? (
            <Card>
              <CardHeader>
                <CardTitle>Reserve vehicle</CardTitle>
                <CardDescription>Create a hold and move vehicle status to reserved</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={reserveFromForm} className="grid gap-3">
                  <input type="hidden" name="quotationId" value={quotation.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="depositAmount">Deposit amount</Label>
                    <Input id="depositAmount" name="depositAmount" type="number" min="0" defaultValue="10000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiryDate">Expiry date</Label>
                    <Input id="expiryDate" name="expiryDate" type="date" defaultValue={dateIn(7)} required />
                  </div>
                  <Button type="submit">
                    <WalletCards className="h-4 w-4" />
                    Create reservation
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canCreateInvoice ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create proforma</CardTitle>
                  <CardDescription>Prepare an export-ready proforma invoice</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={proformaFromForm} className="grid gap-3">
                    <input type="hidden" name="quotationId" value={quotation.id} />
                    <div className="grid gap-2">
                      <Label htmlFor="exportDestination">Export destination</Label>
                      <Input id="exportDestination" name="exportDestination" defaultValue="Algeria" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="shippingEstimate">Shipping estimate</Label>
                      <Input id="shippingEstimate" name="shippingEstimate" type="number" min="0" defaultValue="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="additionalFees">Additional fees</Label>
                      <Input id="additionalFees" name="additionalFees" type="number" min="0" defaultValue="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentTerms">Payment terms</Label>
                      <Input id="paymentTerms" name="paymentTerms" defaultValue="50% deposit, balance before shipment" />
                    </div>
                    <Button type="submit" variant="outline">
                      <FileText className="h-4 w-4" />
                      Create proforma
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create final invoice</CardTitle>
                  <CardDescription>Generate payable invoice from this quotation</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={invoiceFromForm} className="grid gap-3">
                    <input type="hidden" name="quotationId" value={quotation.id} />
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due date</Label>
                      <Input id="dueDate" name="dueDate" type="date" defaultValue={dateIn(7)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="invoiceTax">Invoice tax</Label>
                      <Input id="invoiceTax" name="tax" type="number" min="0" defaultValue="0" />
                    </div>
                    <Button type="submit">
                      <Receipt className="h-4 w-4" />
                      Create invoice
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : null}

          {permissions.canRecordPayment && latestInvoice ? (
            <Card>
              <CardHeader>
                <CardTitle>Record payment</CardTitle>
                <CardDescription>Apply payment to latest invoice balance</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={paymentFromForm} className="grid gap-3">
                  <input type="hidden" name="invoiceId" value={latestInvoice.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" min="1" defaultValue={latestInvoice.balance_due || latestInvoice.total} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentType">Type</Label>
                    <select id="paymentType" name="paymentType" defaultValue="final_payment" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {paymentTypes.map((type) => (
                        <option key={type} value={type}>{formatSalesStatus(type)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethod">Method</Label>
                    <select id="paymentMethod" name="paymentMethod" defaultValue="cash" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>{formatSalesStatus(method)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentDate">Payment date</Label>
                    <Input id="paymentDate" name="paymentDate" type="date" defaultValue={dateIn(0)} required />
                  </div>
                  <Button type="submit" variant="outline">
                    <WalletCards className="h-4 w-4" />
                    Record payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

