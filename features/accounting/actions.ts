"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeAccountingNumber } from "@/lib/accounting/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createAccountingExportSchema,
  createBankReconciliationSchema,
  createBankTransactionSchema,
  createGlAccountSchema,
  createJournalEntrySchema,
  createTaxRateSchema,
  createTaxReportSchema,
  postJournalEntrySchema,
} from "@/lib/validations/accounting";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  return Number(value);
}

function formBoolean(value: FormDataEntryValue | null, fallback = false) {
  if (typeof value !== "string") return fallback;
  return value === "true" || value === "on";
}

async function requireAccountingPermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this accounting action.");
  }

  return workspace;
}

async function requireAnyAccountingPermission(permissionKeys: string[]) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissionKeys.some((permissionKey) => permissions.has(permissionKey))) {
    throw new Error("You do not have permission for this accounting action.");
  }

  return workspace;
}

async function writeAuditLog({
  companyId,
  branchId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  branchId?: string | null;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    branch_id: branchId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

async function assertCompanyAccount(accountId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("gl_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  return !error && Boolean(data);
}

export async function createGlAccount(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = createGlAccountSchema.safeParse({
    companyId: formData.get("companyId"),
    parentAccountId: formOptional(formData.get("parentAccountId")),
    accountCode: formData.get("accountCode"),
    accountName: formData.get("accountName"),
    accountType: formData.get("accountType"),
    status: formOptional(formData.get("status")) ?? "active",
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    description: formOptional(formData.get("description")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "GL account details are invalid." };
  }

  const normalBalance = ["asset", "expense"].includes(parsed.data.accountType) ? "debit" : "credit";
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("gl_accounts")
    .insert({
      company_id: workspace.companyId,
      parent_account_id: parsed.data.parentAccountId,
      account_code: parsed.data.accountCode,
      account_name: parsed.data.accountName,
      account_type: parsed.data.accountType,
      normal_balance: normalBalance,
      status: parsed.data.status,
      currency_code: parsed.data.currencyCode,
      description: parsed.data.description,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "GL account could not be created." };

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "create_gl_account",
    entityType: "gl_account",
    entityId: data.id,
    newValues: { accountCode: parsed.data.accountCode, accountType: parsed.data.accountType },
  });

  revalidatePath("/finance/accounting");
  return { success: "GL account created." };
}

export async function createManualJournalEntry(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = createJournalEntrySchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    entryDate: formData.get("entryDate"),
    memo: formData.get("memo"),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    debitAccountId: formData.get("debitAccountId"),
    creditAccountId: formData.get("creditAccountId"),
    amount: formNumber(formData.get("amount")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Journal entry details are invalid." };
  }

  if (parsed.data.debitAccountId === parsed.data.creditAccountId) {
    return { error: "Debit and credit accounts must be different." };
  }

  const [debitOk, creditOk] = await Promise.all([
    assertCompanyAccount(parsed.data.debitAccountId, workspace.companyId),
    assertCompanyAccount(parsed.data.creditAccountId, workspace.companyId),
  ]);

  if (!debitOk || !creditOk) {
    return { error: "Selected GL accounts are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data: journal, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      entry_number: makeAccountingNumber("JE"),
      entry_date: parsed.data.entryDate,
      memo: parsed.data.memo,
      source_type: "manual",
      currency_code: parsed.data.currencyCode,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    return { error: journalError?.message ?? "Journal entry could not be created." };
  }

  const lines = [
    {
      company_id: workspace.companyId,
      journal_entry_id: journal.id,
      gl_account_id: parsed.data.debitAccountId,
      branch_id: parsed.data.branchId,
      description: parsed.data.memo,
      debit_amount: parsed.data.amount,
      credit_amount: 0,
      currency_code: parsed.data.currencyCode,
      line_order: 1,
      created_by: workspace.profileId,
    },
    {
      company_id: workspace.companyId,
      journal_entry_id: journal.id,
      gl_account_id: parsed.data.creditAccountId,
      branch_id: parsed.data.branchId,
      description: parsed.data.memo,
      debit_amount: 0,
      credit_amount: parsed.data.amount,
      currency_code: parsed.data.currencyCode,
      line_order: 2,
      created_by: workspace.profileId,
    },
  ];

  const { error: lineError } = await supabase.from("journal_entry_lines").insert(lines);
  if (lineError) {
    return { error: lineError.message };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_manual_journal_entry",
    entityType: "journal_entry",
    entityId: journal.id,
    newValues: { amount: parsed.data.amount, memo: parsed.data.memo },
  });

  revalidatePath("/finance/accounting");
  return { success: "Journal entry created." };
}

export async function postJournalEntry(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = postJournalEntrySchema.safeParse({
    companyId: formData.get("companyId"),
    journalEntryId: formData.get("journalEntryId"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Journal entry is invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .update({
      status: "posted",
      posted_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.journalEntryId)
    .eq("company_id", workspace.companyId)
    .select("id, branch_id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Journal entry could not be posted." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: data.branch_id,
    actorProfileId: workspace.profileId,
    action: "post_journal_entry",
    entityType: "journal_entry",
    entityId: data.id,
  });

  revalidatePath("/finance/accounting");
  return { success: "Journal entry posted." };
}

export async function createTaxRate(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = createTaxRateSchema.safeParse({
    companyId: formData.get("companyId"),
    countryCode: formOptional(formData.get("countryCode")) ?? "AE",
    taxName: formData.get("taxName"),
    ratePercent: formNumber(formData.get("ratePercent")),
    taxAccountId: formOptional(formData.get("taxAccountId")),
    isActive: formBoolean(formData.get("isActive"), true),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Tax rate details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tax_rates")
    .insert({
      company_id: workspace.companyId,
      country_code: parsed.data.countryCode,
      tax_name: parsed.data.taxName,
      rate_percent: parsed.data.ratePercent,
      tax_account_id: parsed.data.taxAccountId,
      is_active: parsed.data.isActive,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Tax rate could not be created." };

  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_tax_rate", entityType: "tax_rate", entityId: data.id });
  revalidatePath("/finance/accounting");
  return { success: "Tax rate created." };
}

export async function createTaxReport(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = createTaxReportSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    countryCode: formOptional(formData.get("countryCode")) ?? "AE",
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    taxableSales: formNumber(formData.get("taxableSales")),
    taxablePurchases: formNumber(formData.get("taxablePurchases")),
    taxCollected: formNumber(formData.get("taxCollected")),
    taxPaid: formNumber(formData.get("taxPaid")),
    status: formOptional(formData.get("status")) ?? "generated",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Tax report details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tax_reports")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      report_number: makeAccountingNumber("TAX"),
      country_code: parsed.data.countryCode,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      taxable_sales: parsed.data.taxableSales,
      taxable_purchases: parsed.data.taxablePurchases,
      tax_collected: parsed.data.taxCollected,
      tax_paid: parsed.data.taxPaid,
      net_tax_due: parsed.data.netTaxDue,
      status: parsed.data.status,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Tax report could not be created." };

  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_tax_report", entityType: "tax_report", entityId: data.id });
  revalidatePath("/finance/accounting");
  return { success: "Tax report created." };
}

export async function createBankTransaction(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = createBankTransactionSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    bankAccountId: formOptional(formData.get("bankAccountId")),
    transactionDate: formData.get("transactionDate"),
    transactionType: formData.get("transactionType"),
    amount: formNumber(formData.get("amount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    description: formData.get("description"),
    reference: formOptional(formData.get("reference")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Bank transaction details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      bank_account_id: parsed.data.bankAccountId,
      transaction_number: makeAccountingNumber("BTX"),
      transaction_date: parsed.data.transactionDate,
      transaction_type: parsed.data.transactionType,
      amount: parsed.data.amount,
      currency_code: parsed.data.currencyCode,
      description: parsed.data.description,
      reference: parsed.data.reference,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Bank transaction could not be created." };

  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_bank_transaction", entityType: "bank_transaction", entityId: data.id });
  revalidatePath("/finance/accounting");
  return { success: "Bank transaction created." };
}

export async function createBankReconciliation(formData: FormData) {
  const workspace = await requireAccountingPermission(PERMISSIONS.MANAGE_ACCOUNTING);
  const parsed = createBankReconciliationSchema.safeParse({
    companyId: formData.get("companyId"),
    bankAccountId: formOptional(formData.get("bankAccountId")),
    statementStartDate: formData.get("statementStartDate"),
    statementEndDate: formData.get("statementEndDate"),
    statementEndingBalance: formNumber(formData.get("statementEndingBalance")),
    systemEndingBalance: formNumber(formData.get("systemEndingBalance")),
    status: formOptional(formData.get("status")) ?? "draft",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Bank reconciliation details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_reconciliations")
    .insert({
      company_id: workspace.companyId,
      bank_account_id: parsed.data.bankAccountId,
      reconciliation_number: makeAccountingNumber("REC"),
      statement_start_date: parsed.data.statementStartDate,
      statement_end_date: parsed.data.statementEndDate,
      statement_ending_balance: parsed.data.statementEndingBalance,
      system_ending_balance: parsed.data.systemEndingBalance,
      difference_amount: parsed.data.differenceAmount,
      status: parsed.data.status,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Bank reconciliation could not be created." };

  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_bank_reconciliation", entityType: "bank_reconciliation", entityId: data.id });
  revalidatePath("/finance/accounting");
  return { success: "Bank reconciliation created." };
}

export async function createAccountingExport(formData: FormData) {
  const workspace = await requireAnyAccountingPermission([PERMISSIONS.EXPORT_ACCOUNTING, PERMISSIONS.MANAGE_ACCOUNTING]);
  const parsed = createAccountingExportSchema.safeParse({
    companyId: formData.get("companyId"),
    exportFormat: formData.get("exportFormat"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    status: formOptional(formData.get("status")) ?? "queued",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Accounting export details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("accounting_exports")
    .insert({
      company_id: workspace.companyId,
      export_number: makeAccountingNumber("AEXP"),
      export_format: parsed.data.exportFormat,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      status: parsed.data.status,
      requested_by: workspace.profileId,
      summary_payload: { provider: parsed.data.exportFormat, generatedBy: "manual" },
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Accounting export could not be queued." };

  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_accounting_export", entityType: "accounting_export", entityId: data.id });
  revalidatePath("/finance/accounting");
  return { success: "Accounting export queued." };
}
