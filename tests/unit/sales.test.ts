import { describe, expect, test } from "vitest";
import {
  calculateSalesTotal,
  getInvoicePaymentState,
  getSalesStats,
  type SalesInvoiceStatsInput,
} from "@/lib/sales/calculations";
import { formatSalesStatus } from "@/lib/sales/format";

describe("sales calculations", () => {
  test("calculates a sales document total from subtotal, discount, and tax", () => {
    expect(calculateSalesTotal({ subtotal: 100000, discount: 5000, tax: 2500 })).toBe(97500);
    expect(calculateSalesTotal({ subtotal: 1000, discount: 5000, tax: 0 })).toBe(0);
  });

  test("derives invoice payment state from total and paid amount", () => {
    expect(getInvoicePaymentState({ total: 150000, paidAmount: 0 })).toEqual({
      paidAmount: 0,
      balanceDue: 150000,
      status: "sent",
    });
    expect(getInvoicePaymentState({ total: 150000, paidAmount: 50000 })).toEqual({
      paidAmount: 50000,
      balanceDue: 100000,
      status: "partial_payment",
    });
    expect(getInvoicePaymentState({ total: 150000, paidAmount: 150000 })).toEqual({
      paidAmount: 150000,
      balanceDue: 0,
      status: "paid",
    });
  });

  test("summarizes sales invoice KPIs", () => {
    const invoices: SalesInvoiceStatsInput[] = [
      { total: 100000, paid_amount: 100000, balance_due: 0, invoice_status: "paid" },
      { total: 200000, paid_amount: 50000, balance_due: 150000, invoice_status: "partial_payment" },
      { total: 75000, paid_amount: 0, balance_due: 75000, invoice_status: "sent" },
    ];

    expect(getSalesStats({ quotationsCount: 4, reservationsCount: 2, invoices })).toEqual({
      quotations: 4,
      reservations: 2,
      invoices: 3,
      invoicedValue: 375000,
      paidAmount: 150000,
      balanceDue: 225000,
    });
  });

  test("formats sales statuses for document badges", () => {
    expect(formatSalesStatus("partial_payment")).toBe("Partial payment");
    expect(formatSalesStatus("bank_transfer")).toBe("Bank transfer");
  });
});

