import { describe, expect, test } from "vitest";
import {
  calculateCommissionAmount,
  calculateFinanceSummary,
  calculateFinanceVehicleProfit,
  getBalanceStatus,
  type FinanceSummaryInput,
} from "@/lib/finance/calculations";
import { formatFinanceStatus } from "@/lib/finance/format";
import { createExpenseSchema, createPayableSchema, createSalespersonCommissionSchema } from "@/lib/validations/finance";

describe("finance lite calculations", () => {
  test("calculates vehicle net profit after expenses, shipment costs, and commission", () => {
    expect(
      calculateFinanceVehicleProfit({
        sellingPrice: 180000,
        totalLandedCost: 140000,
        financeExpenses: 2500,
        shipmentCosts: 8500,
        commissionAmount: 4500,
      }),
    ).toEqual({
      grossProfit: 40000,
      netProfit: 24500,
      profitMargin: 13.61,
    });
  });

  test("summarizes finance dashboard totals", () => {
    const input: FinanceSummaryInput = {
      invoices: [{ total: 180000, paid_amount: 60000, balance_due: 120000 }],
      expenses: [{ amount: 2500 }],
      receivables: [{ balance_due: 120000 }],
      payables: [{ balance_due: 3000 }],
      commissions: [{ commission_amount: 4500, status: "pending" }],
    };

    expect(calculateFinanceSummary(input)).toEqual({
      salesTotal: 180000,
      paidTotal: 60000,
      receivablesTotal: 120000,
      payablesTotal: 3000,
      expensesTotal: 2500,
      commissionsTotal: 4500,
      openCommissionTotal: 4500,
      cashPosition: 53000,
    });
  });

  test("derives balance status from amount, paid amount, and due date", () => {
    expect(getBalanceStatus({ amount: 10000, paidAmount: 0, dueDate: "2026-05-01", today: "2026-05-19" })).toBe("overdue");
    expect(getBalanceStatus({ amount: 10000, paidAmount: 3000, dueDate: "2026-05-30", today: "2026-05-19" })).toBe("partial");
    expect(getBalanceStatus({ amount: 10000, paidAmount: 10000, dueDate: "2026-05-30", today: "2026-05-19" })).toBe("paid");
  });

  test("calculates commission from basis amount and percent rate", () => {
    expect(calculateCommissionAmount({ basisAmount: 180000, commissionRate: 2.5 })).toBe(4500);
  });

  test("formats finance statuses", () => {
    expect(formatFinanceStatus("branch_overhead")).toBe("Branch overhead");
    expect(formatFinanceStatus("bank_transfer")).toBe("Bank transfer");
  });

  test("validates expense, payable, and commission payloads", () => {
    expect(
      createExpenseSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        category: "repair",
        description: "Paint repair",
        amount: 2500,
        currencyCode: "aed",
        expenseDate: "2026-05-19",
      }),
    ).toMatchObject({ currencyCode: "AED", category: "repair" });

    expect(
      createPayableSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        supplierName: "Repair Supplier",
        description: "Repair payable",
        amount: 5000,
        paidAmount: 2000,
        currencyCode: "aed",
        dueDate: "2026-05-30",
      }),
    ).toMatchObject({ balanceDue: 3000, currencyCode: "AED" });

    expect(
      createSalespersonCommissionSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        salespersonId: "33333333-3333-4333-8333-333333333333",
        basisAmount: 180000,
        commissionRate: 2.5,
        currencyCode: "aed",
      }),
    ).toMatchObject({ commissionAmount: 4500, currencyCode: "AED" });
  });
});
