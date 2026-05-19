export type SalesInvoiceStatsInput = {
  total: number;
  paid_amount: number;
  balance_due: number;
  invoice_status: string;
};

export function calculateSalesTotal({
  subtotal,
  discount = 0,
  tax = 0,
}: {
  subtotal: number;
  discount?: number;
  tax?: number;
}) {
  return Math.max(Math.round((subtotal - discount + tax) * 100) / 100, 0);
}

export function getInvoicePaymentState({
  total,
  paidAmount,
}: {
  total: number;
  paidAmount: number;
}) {
  const normalizedPaid = Math.max(paidAmount, 0);
  const balanceDue = Math.max(Math.round((total - normalizedPaid) * 100) / 100, 0);

  return {
    paidAmount: normalizedPaid,
    balanceDue,
    status: normalizedPaid <= 0 ? "sent" : balanceDue <= 0 ? "paid" : "partial_payment",
  };
}

export function getSalesStats({
  quotationsCount,
  reservationsCount,
  invoices,
}: {
  quotationsCount: number;
  reservationsCount: number;
  invoices: SalesInvoiceStatsInput[];
}) {
  return {
    quotations: quotationsCount,
    reservations: reservationsCount,
    invoices: invoices.length,
    invoicedValue: invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0),
    paidAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount), 0),
    balanceDue: invoices.reduce((sum, invoice) => sum + Number(invoice.balance_due), 0),
  };
}

