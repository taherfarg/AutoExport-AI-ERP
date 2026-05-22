"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeFinanceNumber } from "@/lib/finance/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { makeSupplierCode } from "@/lib/suppliers/format";
import { createSupplierLinkedPayableSchema, createSupplierSchema } from "@/lib/validations/suppliers";

type SupplierActionResult = { success?: string; error?: string };

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  return Number(value);
}

async function requireSupplierPermission() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (
    !permissions.has(PERMISSIONS.MANAGE_SUPPLIERS) &&
    !permissions.has(PERMISSIONS.MANAGE_FINANCE) &&
    !permissions.has(PERMISSIONS.MANAGE_ACCOUNTING) &&
    !permissions.has(PERMISSIONS.MANAGE_PARTS)
  ) {
    throw new Error("You do not have permission for this supplier action.");
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

async function getSupplierForCompany(supplierId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, supplier_name, payment_terms_days, currency_code")
    .eq("id", supplierId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createSupplier(formData: FormData): Promise<SupplierActionResult> {
  const workspace = await requireSupplierPermission();
  const parsed = createSupplierSchema.safeParse({
    companyId: formData.get("companyId"),
    supplierName: formData.get("supplierName"),
    legalName: formOptional(formData.get("legalName")),
    category: formOptional(formData.get("category")) ?? "general_vendor",
    status: formOptional(formData.get("status")) ?? "active",
    countryCode: formOptional(formData.get("countryCode")),
    city: formOptional(formData.get("city")),
    contactName: formOptional(formData.get("contactName")),
    email: formOptional(formData.get("email")),
    phone: formOptional(formData.get("phone")),
    website: formOptional(formData.get("website")),
    taxRegistrationNumber: formOptional(formData.get("taxRegistrationNumber")),
    paymentTermsDays: formNumber(formData.get("paymentTermsDays"), 30),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    bankName: formOptional(formData.get("bankName")),
    bankAccountName: formOptional(formData.get("bankAccountName")),
    iban: formOptional(formData.get("iban")),
    swiftCode: formOptional(formData.get("swiftCode")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Supplier details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      company_id: workspace.companyId,
      supplier_code: makeSupplierCode(parsed.data.supplierName),
      supplier_name: parsed.data.supplierName,
      legal_name: parsed.data.legalName,
      category: parsed.data.category,
      status: parsed.data.status,
      country_code: parsed.data.countryCode,
      city: parsed.data.city,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      website: parsed.data.website,
      tax_registration_number: parsed.data.taxRegistrationNumber,
      payment_terms_days: parsed.data.paymentTermsDays,
      currency_code: parsed.data.currencyCode,
      bank_name: parsed.data.bankName,
      bank_account_name: parsed.data.bankAccountName,
      iban: parsed.data.iban,
      swift_code: parsed.data.swiftCode,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Supplier could not be created." };

  if (parsed.data.category === "parts") {
    const { error: partSupplierError } = await supabase.from("part_suppliers").insert({
      id: data.id,
      company_id: workspace.companyId,
      supplier_name: parsed.data.supplierName,
      country_code: parsed.data.countryCode,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      status: parsed.data.status === "archived" ? "archived" : parsed.data.status === "inactive" ? "inactive" : "active",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    });

    if (partSupplierError) {
      return { error: partSupplierError.message };
    }
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "create_supplier",
    entityType: "supplier",
    entityId: data.id,
    newValues: { supplierName: parsed.data.supplierName, category: parsed.data.category },
  });

  revalidatePath("/finance/suppliers");
  revalidatePath("/finance/accounting");
  revalidatePath("/parts/inventory");
  return { success: "Supplier created." };
}

export async function createSupplierLinkedPayable(formData: FormData): Promise<SupplierActionResult> {
  const workspace = await requireSupplierPermission();
  const parsed = createSupplierLinkedPayableSchema.safeParse({
    companyId: formData.get("companyId"),
    supplierId: formData.get("supplierId"),
    branchId: formData.get("branchId"),
    vehicleId: formOptional(formData.get("vehicleId")),
    exportOrderId: formOptional(formData.get("exportOrderId")),
    importOrderId: formOptional(formData.get("importOrderId")),
    description: formData.get("description"),
    amount: formNumber(formData.get("amount")),
    paidAmount: formNumber(formData.get("paidAmount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    dueDate: formOptional(formData.get("dueDate")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Supplier payable details are invalid." };
  }

  const supplier = await getSupplierForCompany(parsed.data.supplierId, workspace.companyId);
  if (!supplier) return { error: "Supplier was not found." };

  const balanceDue = Math.max(Math.round((parsed.data.amount - parsed.data.paidAmount) * 100) / 100, 0);
  const status = balanceDue <= 0 ? "paid" : parsed.data.paidAmount > 0 ? "partial" : "open";
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payables")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      vehicle_id: parsed.data.vehicleId,
      export_order_id: parsed.data.exportOrderId,
      import_order_id: parsed.data.importOrderId,
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      payable_number: makeFinanceNumber("AP"),
      description: parsed.data.description,
      amount: parsed.data.amount,
      paid_amount: parsed.data.paidAmount,
      balance_due: balanceDue,
      currency_code: parsed.data.currencyCode,
      due_date: parsed.data.dueDate,
      status,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Payable could not be created." };

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_supplier_payable",
    entityType: "payable",
    entityId: data.id,
    newValues: { supplierId: supplier.id, amount: parsed.data.amount },
  });

  revalidatePath("/finance/suppliers");
  revalidatePath("/finance");
  revalidatePath("/finance/accounting");
  return { success: "Supplier payable created." };
}
