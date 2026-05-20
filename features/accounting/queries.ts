import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { calculateTrialBalance } from "@/lib/accounting/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AccountingPermissions = {
  canViewAccounting: boolean;
  canManageAccounting: boolean;
  canExportAccounting: boolean;
};

export type GlAccountRow = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  status: string;
  normal_balance: string;
  currency_code: string;
  system_key: string | null;
  is_system_account: boolean;
};

export type JournalLineRow = {
  id: string;
  gl_account_id: string;
  description: string | null;
  debit_amount: number;
  credit_amount: number;
  currency_code: string;
  gl_accounts: { account_code: string; account_name: string; account_type: GlAccountRow["account_type"] } | null;
};

export type JournalEntryRow = {
  id: string;
  branch_id: string | null;
  entry_number: string;
  entry_date: string;
  memo: string;
  status: string;
  source_type: string;
  currency_code: string;
  posted_at: string | null;
  branches: { name: string; code: string } | null;
  journal_entry_lines: JournalLineRow[];
};

export type AccountingPeriodRow = {
  id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  status: string;
};

export type TaxRateRow = {
  id: string;
  country_code: string;
  tax_name: string;
  rate_percent: number;
  is_active: boolean;
};

export type TaxReportRow = {
  id: string;
  report_number: string;
  country_code: string;
  period_start: string;
  period_end: string;
  taxable_sales: number;
  taxable_purchases: number;
  tax_collected: number;
  tax_paid: number;
  net_tax_due: number;
  status: string;
};

export type BankTransactionRow = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  currency_code: string;
  description: string;
  reference: string | null;
  status: string;
};

export type BankReconciliationRow = {
  id: string;
  reconciliation_number: string;
  statement_start_date: string;
  statement_end_date: string;
  statement_ending_balance: number;
  system_ending_balance: number;
  difference_amount: number;
  status: string;
};

export type AccountingExportRow = {
  id: string;
  export_number: string;
  export_format: string;
  period_start: string;
  period_end: string;
  status: string;
  file_path: string | null;
  created_at: string;
};

export type BankAccountOption = {
  id: string;
  account_name: string;
  bank_name: string | null;
  currency_code: string;
};

export async function getAccountingPermissions(companyId: string): Promise<AccountingPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewAccounting: permissions.has(PERMISSIONS.VIEW_ACCOUNTING) || permissions.has(PERMISSIONS.VIEW_FINANCE),
    canManageAccounting: permissions.has(PERMISSIONS.MANAGE_ACCOUNTING),
    canExportAccounting: permissions.has(PERMISSIONS.EXPORT_ACCOUNTING) || permissions.has(PERMISSIONS.MANAGE_ACCOUNTING),
  };
}

export async function getAccountingDashboardData(companyId: string) {
  const supabase = createServiceRoleClient();

  const [
    accountsResult,
    periodsResult,
    journalResult,
    taxRatesResult,
    taxReportsResult,
    bankTransactionsResult,
    reconciliationsResult,
    exportsResult,
    bankAccountsResult,
  ] = await Promise.all([
    supabase
      .from("gl_accounts")
      .select("id, account_code, account_name, account_type, status, normal_balance, currency_code, system_key, is_system_account")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("account_code", { ascending: true }),
    supabase
      .from("accounting_periods")
      .select("id, period_name, period_start, period_end, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("period_start", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("id, branch_id, entry_number, entry_date, memo, status, source_type, currency_code, posted_at, branches(name, code), journal_entry_lines(id, gl_account_id, description, debit_amount, credit_amount, currency_code, gl_accounts(account_code, account_name, account_type))")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .limit(25),
    supabase
      .from("tax_rates")
      .select("id, country_code, tax_name, rate_percent, is_active")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("country_code", { ascending: true }),
    supabase
      .from("tax_reports")
      .select("id, report_number, country_code, period_start, period_end, taxable_sales, taxable_purchases, tax_collected, tax_paid, net_tax_due, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("period_end", { ascending: false }),
    supabase
      .from("bank_transactions")
      .select("id, transaction_number, transaction_date, transaction_type, amount, currency_code, description, reference, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("bank_reconciliations")
      .select("id, reconciliation_number, statement_start_date, statement_end_date, statement_ending_balance, system_ending_balance, difference_amount, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("statement_end_date", { ascending: false }),
    supabase
      .from("accounting_exports")
      .select("id, export_number, export_format, period_start, period_end, status, file_path, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("bank_accounts")
      .select("id, account_name, bank_name, currency_code")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("account_name", { ascending: true }),
  ]);

  for (const result of [
    accountsResult,
    periodsResult,
    journalResult,
    taxRatesResult,
    taxReportsResult,
    bankTransactionsResult,
    reconciliationsResult,
    exportsResult,
    bankAccountsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const accounts = (accountsResult.data ?? []) as unknown as GlAccountRow[];
  const journalEntries = (journalResult.data ?? []) as unknown as JournalEntryRow[];
  const lines = journalEntries.flatMap((entry) =>
    (entry.journal_entry_lines ?? []).map((line) => ({
      accountType: line.gl_accounts?.account_type ?? "asset",
      debitAmount: Number(line.debit_amount),
      creditAmount: Number(line.credit_amount),
    })),
  );

  return {
    accounts,
    periods: (periodsResult.data ?? []) as AccountingPeriodRow[],
    journalEntries,
    taxRates: (taxRatesResult.data ?? []) as TaxRateRow[],
    taxReports: (taxReportsResult.data ?? []) as TaxReportRow[],
    bankTransactions: (bankTransactionsResult.data ?? []) as BankTransactionRow[],
    bankReconciliations: (reconciliationsResult.data ?? []) as BankReconciliationRow[],
    accountingExports: (exportsResult.data ?? []) as AccountingExportRow[],
    bankAccounts: (bankAccountsResult.data ?? []) as BankAccountOption[],
    trialBalance: calculateTrialBalance(lines),
  };
}
