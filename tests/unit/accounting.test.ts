import { describe, expect, test } from "vitest";
import {
  calculateBankReconciliationDifference,
  calculateTaxAmount,
  calculateTrialBalance,
  isBalancedJournal,
  summarizeJournalLines,
} from "@/lib/accounting/calculations";
import { formatAccountingStatus } from "@/lib/accounting/format";
import {
  createAccountingExportSchema,
  createBankTransactionSchema,
  createGlAccountSchema,
  createJournalEntrySchema,
  createTaxReportSchema,
} from "@/lib/validations/accounting";

describe("accounting calculations", () => {
  test("detects balanced and unbalanced journal lines", () => {
    const balanced = [
      { debitAmount: 125000, creditAmount: 0 },
      { debitAmount: 0, creditAmount: 125000 },
    ];
    const unbalanced = [
      { debitAmount: 125000, creditAmount: 0 },
      { debitAmount: 0, creditAmount: 124999 },
    ];

    expect(summarizeJournalLines(balanced)).toEqual({ debitTotal: 125000, creditTotal: 125000, difference: 0 });
    expect(isBalancedJournal(balanced)).toBe(true);
    expect(isBalancedJournal(unbalanced)).toBe(false);
  });

  test("calculates trial balance by account type", () => {
    const summary = calculateTrialBalance([
      { accountType: "asset", debitAmount: 50000, creditAmount: 5000 },
      { accountType: "liability", debitAmount: 0, creditAmount: 15000 },
      { accountType: "revenue", debitAmount: 0, creditAmount: 45000 },
      { accountType: "expense", debitAmount: 15000, creditAmount: 0 },
    ]);

    expect(summary.debitTotal).toBe(65000);
    expect(summary.creditTotal).toBe(65000);
    expect(summary.byType.asset).toBe(45000);
    expect(summary.byType.liability).toBe(-15000);
    expect(summary.byType.revenue).toBe(-45000);
    expect(summary.byType.expense).toBe(15000);
  });

  test("calculates tax and bank reconciliation differences", () => {
    expect(calculateTaxAmount({ amount: 100000, ratePercent: 5 })).toBe(5000);
    expect(calculateTaxAmount({ amount: 100000, ratePercent: 0 })).toBe(0);
    expect(calculateBankReconciliationDifference({ statementEndingBalance: 82500, systemEndingBalance: 82000 })).toBe(500);
  });
});

describe("accounting validation", () => {
  test("validates chart account and journal payloads", () => {
    expect(createGlAccountSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      accountCode: "1000",
      accountName: "Cash",
      accountType: "asset",
    }).accountCode).toBe("1000");

    const journal = createJournalEntrySchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      entryDate: "2026-05-20",
      memo: "Opening balance",
      currencyCode: "aed",
      debitAccountId: "00000000-0000-4000-8000-000000000003",
      creditAccountId: "00000000-0000-4000-8000-000000000004",
      amount: 25000,
    });

    expect(journal.currencyCode).toBe("AED");
    expect(journal.amount).toBe(25000);
  });

  test("validates tax, bank, and export payloads", () => {
    expect(createTaxReportSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      countryCode: "AE",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      taxableSales: 100000,
      taxablePurchases: 40000,
      taxCollected: 5000,
      taxPaid: 2000,
    }).netTaxDue).toBe(3000);

    expect(createBankTransactionSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      transactionDate: "2026-05-20",
      transactionType: "deposit",
      amount: 5000,
      currencyCode: "AED",
      description: "Customer deposit",
    }).amount).toBe(5000);

    expect(createAccountingExportSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      exportFormat: "csv",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
    }).exportFormat).toBe("csv");
  });
});

describe("accounting formatting", () => {
  test("formats accounting statuses", () => {
    expect(formatAccountingStatus("trial_balance")).toBe("Trial Balance");
    expect(formatAccountingStatus("posted")).toBe("Posted");
  });
});
