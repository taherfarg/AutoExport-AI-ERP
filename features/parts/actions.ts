"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makePartsNumber } from "@/lib/parts/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { makeSupplierCode } from "@/lib/suppliers/format";
import {
  createPartPurchaseOrderItemSchema,
  createPartPurchaseOrderSchema,
  createPartReceiptSchema,
  createPartSchema,
  createPartSupplierSchema,
  createPartTransferSchema,
  createServicePartLineSchema,
} from "@/lib/validations/parts";

type PartsActionResult = { success?: string; error?: string };

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  return Number(value);
}

async function requirePartsPermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this parts action.");
  }

  return workspace;
}

async function requireAnyPartsPermission(permissionKeys: string[]) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissionKeys.some((permissionKey) => permissions.has(permissionKey))) {
    throw new Error("You do not have permission for this parts action.");
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

export async function createPartSupplier(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requireAnyPartsPermission([PERMISSIONS.MANAGE_PARTS, PERMISSIONS.MANAGE_PART_ORDERS]);
  const parsed = createPartSupplierSchema.safeParse({
    companyId: formData.get("companyId"),
    supplierName: formData.get("supplierName"),
    countryCode: formOptional(formData.get("countryCode")),
    contactName: formOptional(formData.get("contactName")),
    email: formOptional(formData.get("email")),
    phone: formOptional(formData.get("phone")),
    status: formOptional(formData.get("status")) ?? "active",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Supplier details are invalid." };

  const supabase = createServiceRoleClient();
  let supplierId: string | null = null;
  const { data: existingSupplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("company_id", workspace.companyId)
    .eq("supplier_name", parsed.data.supplierName)
    .maybeSingle();

  if (existingSupplier?.id) {
    supplierId = existingSupplier.id as string;
  } else {
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .insert({
        company_id: workspace.companyId,
        supplier_code: makeSupplierCode(parsed.data.supplierName),
        supplier_name: parsed.data.supplierName,
        category: "parts",
        status: parsed.data.status === "archived" ? "archived" : parsed.data.status === "inactive" ? "inactive" : "active",
        country_code: parsed.data.countryCode,
        contact_name: parsed.data.contactName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      })
      .select("id")
      .single();

    if (supplierError || !supplier) return { error: supplierError?.message ?? "Supplier master could not be created." };
    supplierId = supplier.id;
  }

  const { data, error } = await supabase.from("part_suppliers").insert({
    id: supplierId,
    company_id: workspace.companyId,
    supplier_name: parsed.data.supplierName,
    country_code: parsed.data.countryCode,
    contact_name: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    status: parsed.data.status,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Supplier could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_part_supplier", entityType: "part_supplier", entityId: data.id });
  revalidatePath("/parts/inventory");
  return { success: "Parts supplier created." };
}

export async function createPart(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requirePartsPermission(PERMISSIONS.MANAGE_PARTS);
  const parsed = createPartSchema.safeParse({
    companyId: formData.get("companyId"),
    partNumber: formData.get("partNumber"),
    sku: formOptional(formData.get("sku")),
    name: formData.get("name"),
    category: formOptional(formData.get("category")),
    brand: formOptional(formData.get("brand")),
    unitCost: formNumber(formData.get("unitCost")),
    sellingPrice: formNumber(formData.get("sellingPrice")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    status: formOptional(formData.get("status")) ?? "active",
    reorderPoint: formNumber(formData.get("reorderPoint")),
    reorderQuantity: formNumber(formData.get("reorderQuantity")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Part details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("parts").insert({
    company_id: workspace.companyId,
    part_number: parsed.data.partNumber,
    sku: parsed.data.sku,
    name: parsed.data.name,
    category: parsed.data.category,
    brand: parsed.data.brand,
    compatible_brands: parsed.data.compatibleBrands,
    compatible_models: parsed.data.compatibleModels,
    unit_cost: parsed.data.unitCost,
    selling_price: parsed.data.sellingPrice,
    currency_code: parsed.data.currencyCode,
    status: parsed.data.status,
    reorder_point: parsed.data.reorderPoint,
    reorder_quantity: parsed.data.reorderQuantity,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Part could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_part", entityType: "part", entityId: data.id });
  revalidatePath("/parts/inventory");
  return { success: "Part created." };
}

export async function createPartPurchaseOrder(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requirePartsPermission(PERMISSIONS.MANAGE_PART_ORDERS);
  const parsed = createPartPurchaseOrderSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    supplierId: formOptional(formData.get("supplierId")),
    status: formOptional(formData.get("status")) ?? "ordered",
    orderDate: formOptional(formData.get("orderDate")),
    expectedDate: formOptional(formData.get("expectedDate")),
    taxAmount: formNumber(formData.get("taxAmount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Purchase order details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("part_purchase_orders").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    supplier_id: parsed.data.supplierId,
    purchase_order_number: makePartsNumber("PPO"),
    status: parsed.data.status,
    order_date: parsed.data.orderDate,
    expected_date: parsed.data.expectedDate,
    tax_amount: parsed.data.taxAmount,
    currency_code: parsed.data.currencyCode,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Purchase order could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_part_purchase_order", entityType: "part_purchase_order", entityId: data.id });
  revalidatePath("/parts/inventory");
  return { success: "Parts purchase order created." };
}

export async function createPartPurchaseOrderItem(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requirePartsPermission(PERMISSIONS.MANAGE_PART_ORDERS);
  const parsed = createPartPurchaseOrderItemSchema.safeParse({
    companyId: formData.get("companyId"),
    purchaseOrderId: formData.get("purchaseOrderId"),
    partId: formData.get("partId"),
    description: formOptional(formData.get("description")),
    quantityOrdered: formNumber(formData.get("quantityOrdered")),
    unitCost: formNumber(formData.get("unitCost")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Purchase order item details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("part_purchase_order_items").insert({
    company_id: workspace.companyId,
    purchase_order_id: parsed.data.purchaseOrderId,
    part_id: parsed.data.partId,
    description: parsed.data.description,
    quantity_ordered: parsed.data.quantityOrdered,
    unit_cost: parsed.data.unitCost,
    line_total: parsed.data.lineTotal,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Purchase order item could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_part_purchase_order_item", entityType: "part_purchase_order_item", entityId: data.id });
  revalidatePath("/parts/inventory");
  return { success: "Purchase order item created." };
}

export async function createPartReceipt(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requirePartsPermission(PERMISSIONS.MANAGE_PART_ORDERS);
  const parsed = createPartReceiptSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    purchaseOrderId: formOptional(formData.get("purchaseOrderId")),
    purchaseOrderItemId: formOptional(formData.get("purchaseOrderItemId")),
    partId: formData.get("partId"),
    quantityReceived: formNumber(formData.get("quantityReceived")),
    unitCost: formNumber(formData.get("unitCost")),
    status: formOptional(formData.get("status")) ?? "posted",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Receipt details are invalid." };

  const supabase = createServiceRoleClient();
  const { data: receipt, error: receiptError } = await supabase.from("part_receipts").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    purchase_order_id: parsed.data.purchaseOrderId,
    receipt_number: makePartsNumber("PRC"),
    status: parsed.data.status,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (receiptError || !receipt) return { error: receiptError?.message ?? "Parts receipt could not be created." };

  const { error: itemError } = await supabase.from("part_receipt_items").insert({
    company_id: workspace.companyId,
    part_receipt_id: receipt.id,
    purchase_order_item_id: parsed.data.purchaseOrderItemId,
    part_id: parsed.data.partId,
    quantity_received: parsed.data.quantityReceived,
    unit_cost: parsed.data.unitCost,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (itemError) return { error: itemError.message };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_part_receipt", entityType: "part_receipt", entityId: receipt.id });
  revalidatePath("/parts/inventory");
  return { success: "Parts receipt posted." };
}

export async function createPartTransfer(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requireAnyPartsPermission([PERMISSIONS.TRANSFER_PARTS, PERMISSIONS.MANAGE_PARTS]);
  const parsed = createPartTransferSchema.safeParse({
    companyId: formData.get("companyId"),
    partId: formData.get("partId"),
    fromBranchId: formData.get("fromBranchId"),
    toBranchId: formData.get("toBranchId"),
    quantity: formNumber(formData.get("quantity")),
    status: formOptional(formData.get("status")) ?? "received",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Transfer details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("part_transfers").insert({
    company_id: workspace.companyId,
    part_id: parsed.data.partId,
    from_branch_id: parsed.data.fromBranchId,
    to_branch_id: parsed.data.toBranchId,
    transfer_number: makePartsNumber("PTR"),
    quantity: parsed.data.quantity,
    status: parsed.data.status,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Parts transfer could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.fromBranchId, actorProfileId: workspace.profileId, action: "create_part_transfer", entityType: "part_transfer", entityId: data.id });
  revalidatePath("/parts/inventory");
  return { success: "Parts transfer created." };
}

export async function createServicePartLine(formData: FormData): Promise<PartsActionResult> {
  const workspace = await requireAnyPartsPermission([PERMISSIONS.MANAGE_PARTS, PERMISSIONS.MANAGE_SERVICE]);
  const parsed = createServicePartLineSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    serviceOrderId: formData.get("serviceOrderId"),
    serviceJobId: formOptional(formData.get("serviceJobId")),
    partId: formData.get("partId"),
    description: formData.get("description"),
    quantity: formNumber(formData.get("quantity")),
    unitCost: formNumber(formData.get("unitCost")),
    sellingPrice: formNumber(formData.get("sellingPrice")),
    status: formOptional(formData.get("status")) ?? "used",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Service part details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("service_parts_lines").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    service_order_id: parsed.data.serviceOrderId,
    service_job_id: parsed.data.serviceJobId,
    part_id: parsed.data.partId,
    line_number: makePartsNumber("SPL"),
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unitCost,
    selling_price: parsed.data.sellingPrice,
    line_cost: parsed.data.totals.lineCost,
    line_total: parsed.data.totals.lineTotal,
    gross_profit: parsed.data.totals.grossProfit,
    status: parsed.data.status,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Service part line could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_service_part_line", entityType: "service_part_line", entityId: data.id });
  revalidatePath("/parts/inventory");
  revalidatePath("/service/workshop");
  return { success: "Service part line created." };
}
