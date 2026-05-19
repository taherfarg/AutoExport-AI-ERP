"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeFinanceNumber } from "@/lib/finance/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createExpenseSchema,
  createPayableSchema,
  createSalespersonCommissionSchema,
} from "@/lib/validations/finance";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return Number(value);
}

async function requireFinancePermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this finance action.");
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

export async function createExpense(formData: FormData) {
  const workspace = await requireFinancePermission(PERMISSIONS.MANAGE_FINANCE);
  const parsed = createExpenseSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    vehicleId: formOptional(formData.get("vehicleId")),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formNumber(formData.get("amount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    expenseDate: formData.get("expenseDate"),
    supplierName: formOptional(formData.get("supplierName")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Expense details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      vehicle_id: parsed.data.vehicleId,
      expense_number: makeFinanceNumber("EXP"),
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      currency_code: parsed.data.currencyCode,
      expense_date: parsed.data.expenseDate,
      supplier_name: parsed.data.supplierName,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Expense could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_expense",
    entityType: "expense",
    entityId: data.id,
    newValues: { amount: parsed.data.amount, category: parsed.data.category },
  });

  revalidatePath("/finance");
  return { success: "Expense recorded." };
}

export async function createPayable(formData: FormData) {
  const workspace = await requireFinancePermission(PERMISSIONS.MANAGE_FINANCE);
  const parsed = createPayableSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    vehicleId: formOptional(formData.get("vehicleId")),
    supplierName: formData.get("supplierName"),
    description: formData.get("description"),
    amount: formNumber(formData.get("amount")),
    paidAmount: formNumber(formData.get("paidAmount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    dueDate: formOptional(formData.get("dueDate")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Payable details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payables")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      vehicle_id: parsed.data.vehicleId,
      payable_number: makeFinanceNumber("AP"),
      supplier_name: parsed.data.supplierName,
      description: parsed.data.description,
      amount: parsed.data.amount,
      paid_amount: parsed.data.paidAmount,
      currency_code: parsed.data.currencyCode,
      due_date: parsed.data.dueDate,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Payable could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_payable",
    entityType: "payable",
    entityId: data.id,
    newValues: { amount: parsed.data.amount, supplierName: parsed.data.supplierName },
  });

  revalidatePath("/finance");
  return { success: "Payable created." };
}

export async function createSalespersonCommission(formData: FormData) {
  const workspace = await requireFinancePermission(PERMISSIONS.MANAGE_COMMISSIONS);
  const parsed = createSalespersonCommissionSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    salespersonId: formOptional(formData.get("salespersonId")),
    salesInvoiceId: formOptional(formData.get("salesInvoiceId")),
    vehicleId: formOptional(formData.get("vehicleId")),
    basisAmount: formNumber(formData.get("basisAmount")),
    commissionRate: formNumber(formData.get("commissionRate")),
    commissionAmount: formOptional(formData.get("commissionAmount")) ? formNumber(formData.get("commissionAmount")) : undefined,
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    status: formOptional(formData.get("status")) ?? "pending",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Commission details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("salesperson_commissions")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      salesperson_id: parsed.data.salespersonId,
      sales_invoice_id: parsed.data.salesInvoiceId,
      vehicle_id: parsed.data.vehicleId,
      commission_number: makeFinanceNumber("COM"),
      basis_amount: parsed.data.basisAmount,
      commission_rate: parsed.data.commissionRate,
      commission_amount: parsed.data.commissionAmount,
      currency_code: parsed.data.currencyCode,
      status: parsed.data.status,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Commission could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_salesperson_commission",
    entityType: "salesperson_commission",
    entityId: data.id,
    newValues: { amount: parsed.data.commissionAmount, salespersonId: parsed.data.salespersonId },
  });

  revalidatePath("/finance");
  return { success: "Commission created." };
}
