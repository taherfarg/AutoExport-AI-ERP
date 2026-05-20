import { z } from "zod";
import { calculateBankReconciliationDifference } from "@/lib/accounting/calculations";

export const glAccountTypes = ["asset", "liability", "equity", "revenue", "expense"] as const;
export const glAccountStatuses = ["active", "inactive", "archived"] as const;
export const journalEntryStatuses = ["draft", "posted", "reversed", "void"] as const;
export const journalSourceTypes = ["manual", "sales_invoice", "payment", "expense", "payable", "commission", "import_export"] as const;
export const accountingPeriodStatuses = ["open", "locked", "closed"] as const;
export const bankTransactionTypes = ["deposit", "withdrawal", "fee", "transfer", "adjustment"] as const;
export const bankReconciliationStatuses = ["draft", "matched", "approved", "cancelled"] as const;
export const accountingExportFormats = ["csv", "quickbooks", "xero", "zoho", "datev"] as const;
export const accountingExportStatuses = ["queued", "generated", "failed"] as const;
export const taxReportStatuses = ["draft", "generated", "filed", "cancelled"] as const;

const optionalUuid = z.string().uuid().optional();
const currencyCode = z.string().trim().length(3).transform((value) => value.toUpperCase());
const countryCode = z.string().trim().length(2).transform((value) => value.toUpperCase());

export const createGlAccountSchema = z.object({
  companyId: z.string().uuid(),
  parentAccountId: optionalUuid,
  accountCode: z.string().trim().min(2).max(32),
  accountName: z.string().trim().min(2).max(160),
  accountType: z.enum(glAccountTypes),
  status: z.enum(glAccountStatuses).default("active"),
  currencyCode: currencyCode.default("AED"),
  description: z.string().trim().max(500).optional(),
});

export const createJournalEntrySchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  entryDate: z.string().date(),
  memo: z.string().trim().min(2).max(500),
  currencyCode: currencyCode.default("AED"),
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.number().positive(),
});

export const postJournalEntrySchema = z.object({
  companyId: z.string().uuid(),
  journalEntryId: z.string().uuid(),
});

export const createTaxRateSchema = z.object({
  companyId: z.string().uuid(),
  countryCode: countryCode.default("AE"),
  taxName: z.string().trim().min(2).max(120),
  ratePercent: z.number().min(0).max(100),
  taxAccountId: optionalUuid,
  isActive: z.boolean().default(true),
});

export const createTaxReportSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  countryCode: countryCode.default("AE"),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  taxableSales: z.number().min(0).default(0),
  taxablePurchases: z.number().min(0).default(0),
  taxCollected: z.number().min(0).default(0),
  taxPaid: z.number().min(0).default(0),
  status: z.enum(taxReportStatuses).default("generated"),
}).transform((value) => ({
  ...value,
  netTaxDue: Math.round((value.taxCollected - value.taxPaid) * 100) / 100,
}));

export const createBankTransactionSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  bankAccountId: optionalUuid,
  transactionDate: z.string().date(),
  transactionType: z.enum(bankTransactionTypes),
  amount: z.number().positive(),
  currencyCode: currencyCode.default("AED"),
  description: z.string().trim().min(2).max(240),
  reference: z.string().trim().max(120).optional(),
});

export const createBankReconciliationSchema = z.object({
  companyId: z.string().uuid(),
  bankAccountId: optionalUuid,
  statementStartDate: z.string().date(),
  statementEndDate: z.string().date(),
  statementEndingBalance: z.number(),
  systemEndingBalance: z.number(),
  status: z.enum(bankReconciliationStatuses).default("draft"),
}).transform((value) => ({
  ...value,
  differenceAmount: calculateBankReconciliationDifference({
    statementEndingBalance: value.statementEndingBalance,
    systemEndingBalance: value.systemEndingBalance,
  }),
}));

export const createAccountingExportSchema = z.object({
  companyId: z.string().uuid(),
  exportFormat: z.enum(accountingExportFormats),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  status: z.enum(accountingExportStatuses).default("queued"),
});
