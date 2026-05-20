"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeExportOrderNumber, makeImportOrderNumber } from "@/lib/export/format";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createExportOrderSchema,
  createImportOrderSchema,
  createShipmentCostSchema,
  createShippingEventSchema,
  updateCustomsClearanceSchema,
  upsertExportDocumentSchema,
} from "@/lib/validations/export";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return Number(value);
}

function formDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function getExportOrderForWorkspace(exportOrderId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("export_orders")
    .select("id, company_id, branch_id, vehicle_id, export_order_number")
    .eq("id", exportOrderId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Export order was not found.");
  }

  return data;
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

const DEFAULT_EXPORT_DOCUMENTS = [
  ["commercial_invoice", "Commercial invoice"],
  ["proforma_invoice", "Proforma invoice"],
  ["export_certificate", "Export certificate"],
  ["certificate_of_origin", "Certificate of origin"],
  ["bill_of_lading", "Bill of lading"],
  ["vehicle_title", "Vehicle title"],
  ["customs_documents", "Customs documents"],
  ["insurance", "Insurance"],
  ["inspection_certificate", "Inspection certificate"],
] as const;

export async function createExportOrder(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createExportOrderSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    customerId: formOptional(formData.get("customerId")),
    vehicleId: formData.get("vehicleId"),
    salesInvoiceId: formOptional(formData.get("salesInvoiceId")),
    proformaInvoiceId: formOptional(formData.get("proformaInvoiceId")),
    destinationCountryCode: formData.get("destinationCountryCode"),
    destinationPort: formData.get("destinationPort"),
    shippingMethod: formData.get("shippingMethod"),
    shippingCompanyId: formOptional(formData.get("shippingCompanyId")),
    logisticsPartnerId: formOptional(formData.get("logisticsPartnerId")),
    bookingNumber: formOptional(formData.get("bookingNumber")),
    containerNumber: formOptional(formData.get("containerNumber")),
    blNumber: formOptional(formData.get("blNumber")),
    estimatedDepartureDate: formOptional(formData.get("estimatedDepartureDate")),
    estimatedArrivalDate: formOptional(formData.get("estimatedArrivalDate")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Export order details are invalid." };
  }

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("export_orders")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      export_order_number: makeExportOrderNumber(),
      customer_id: parsed.data.customerId,
      vehicle_id: parsed.data.vehicleId,
      sales_invoice_id: parsed.data.salesInvoiceId,
      proforma_invoice_id: parsed.data.proformaInvoiceId,
      destination_country_code: parsed.data.destinationCountryCode,
      destination_port: parsed.data.destinationPort,
      shipping_method: parsed.data.shippingMethod,
      shipping_company_id: parsed.data.shippingCompanyId,
      logistics_partner_id: parsed.data.logisticsPartnerId,
      booking_number: parsed.data.bookingNumber,
      container_number: parsed.data.containerNumber,
      bl_number: parsed.data.blNumber,
      estimated_departure_date: parsed.data.estimatedDepartureDate,
      estimated_arrival_date: parsed.data.estimatedArrivalDate,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !order) {
    return { error: error?.message ?? "Export order could not be created." };
  }

  await supabase.from("export_documents").insert(
    DEFAULT_EXPORT_DOCUMENTS.map(([documentType, title]) => ({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      export_order_id: order.id,
      document_type: documentType,
      title,
      status: "missing",
      is_required: true,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })),
  );

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_export_order",
    entityType: "export_order",
    entityId: order.id,
    newValues: { destinationCountryCode: parsed.data.destinationCountryCode, vehicleId: parsed.data.vehicleId },
  });

  revalidatePath("/export/orders");
  return { orderId: order.id, success: "Export order created." };
}

export async function createImportOrder(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createImportOrderSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    supplierName: formData.get("supplierName"),
    originCountryCode: formData.get("originCountryCode"),
    originPort: formOptional(formData.get("originPort")),
    destinationCountryCode: formOptional(formData.get("destinationCountryCode")) ?? "AE",
    destinationPort: formOptional(formData.get("destinationPort")),
    shippingMethod: formData.get("shippingMethod"),
    logisticsPartnerId: formOptional(formData.get("logisticsPartnerId")),
    vehicleCount: formNumber(formData.get("vehicleCount"), 1),
    estimatedDepartureDate: formOptional(formData.get("estimatedDepartureDate")),
    estimatedArrivalDate: formOptional(formData.get("estimatedArrivalDate")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Import order details are invalid." };
  }

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("import_orders")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      import_order_number: makeImportOrderNumber(),
      supplier_name: parsed.data.supplierName,
      origin_country_code: parsed.data.originCountryCode,
      origin_port: parsed.data.originPort,
      destination_country_code: parsed.data.destinationCountryCode,
      destination_port: parsed.data.destinationPort,
      shipping_method: parsed.data.shippingMethod,
      logistics_partner_id: parsed.data.logisticsPartnerId,
      vehicle_count: parsed.data.vehicleCount,
      estimated_departure_date: parsed.data.estimatedDepartureDate,
      estimated_arrival_date: parsed.data.estimatedArrivalDate,
      status: "ordered",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (error || !order) {
    return { error: error?.message ?? "Import order could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_import_order",
    entityType: "import_order",
    entityId: order.id,
    newValues: { supplierName: parsed.data.supplierName, vehicleCount: parsed.data.vehicleCount },
  });

  revalidatePath("/export/orders");
  return { importOrderId: order.id, success: "Import order created." };
}

export async function addShippingEvent(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createShippingEventSchema.safeParse({
    exportOrderId: formOptional(formData.get("exportOrderId")),
    eventStatus: formData.get("eventStatus"),
    eventDate: formDateTime(formData.get("eventDate")),
    location: formOptional(formData.get("location")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || !parsed.data.exportOrderId) {
    return { error: "Shipping event details are invalid." };
  }

  const order = await getExportOrderForWorkspace(parsed.data.exportOrderId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_events").insert({
    company_id: workspace.companyId,
    branch_id: order.branch_id,
    export_order_id: order.id,
    event_status: parsed.data.eventStatus,
    event_date: parsed.data.eventDate,
    location: parsed.data.location,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: order.branch_id,
    actorProfileId: workspace.profileId,
    action: "add_shipping_event",
    entityType: "export_order",
    entityId: order.id,
    newValues: { eventStatus: parsed.data.eventStatus, location: parsed.data.location },
  });

  revalidatePath("/export/orders");
  revalidatePath(`/export/orders/${order.id}`);
}

export async function addCustomsClearance(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = updateCustomsClearanceSchema.safeParse({
    exportOrderId: formOptional(formData.get("exportOrderId")),
    brokerId: formOptional(formData.get("brokerId")),
    customsStatus: formData.get("customsStatus"),
    declarationNumber: formOptional(formData.get("declarationNumber")),
    inspectionDate: formOptional(formData.get("inspectionDate")),
    clearedDate: formOptional(formData.get("clearedDate")),
    dutiesAmount: formNumber(formData.get("dutiesAmount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || !parsed.data.exportOrderId) {
    return { error: "Customs clearance details are invalid." };
  }

  const order = await getExportOrderForWorkspace(parsed.data.exportOrderId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("customs_clearance").insert({
    company_id: workspace.companyId,
    branch_id: order.branch_id,
    export_order_id: order.id,
    broker_id: parsed.data.brokerId,
    customs_status: parsed.data.customsStatus,
    declaration_number: parsed.data.declarationNumber,
    inspection_date: parsed.data.inspectionDate,
    cleared_date: parsed.data.clearedDate,
    duties_amount: parsed.data.dutiesAmount,
    currency_code: parsed.data.currencyCode,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: order.branch_id,
    actorProfileId: workspace.profileId,
    action: "update_customs_clearance",
    entityType: "export_order",
    entityId: order.id,
    newValues: { customsStatus: parsed.data.customsStatus, declarationNumber: parsed.data.declarationNumber },
  });

  revalidatePath("/export/orders");
  revalidatePath(`/export/orders/${order.id}`);
}

export async function upsertExportDocument(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = upsertExportDocumentSchema.safeParse({
    exportOrderId: formData.get("exportOrderId"),
    documentType: formData.get("documentType"),
    title: formData.get("title"),
    status: formData.get("status"),
    isRequired: formData.get("isRequired") !== "false",
    storageBucket: formOptional(formData.get("storageBucket")),
    storagePath: formOptional(formData.get("storagePath")),
    expiresAt: formOptional(formData.get("expiresAt")),
  });

  if (!parsed.success) {
    return { error: "Export document details are invalid." };
  }

  const order = await getExportOrderForWorkspace(parsed.data.exportOrderId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("export_documents").upsert(
    {
      company_id: workspace.companyId,
      branch_id: order.branch_id,
      export_order_id: order.id,
      document_type: parsed.data.documentType,
      title: parsed.data.title,
      status: parsed.data.status,
      is_required: parsed.data.isRequired,
      storage_bucket: parsed.data.storageBucket,
      storage_path: parsed.data.storagePath,
      expires_at: parsed.data.expiresAt,
      verified_by: parsed.data.status === "verified" ? workspace.profileId : null,
      verified_at: parsed.data.status === "verified" ? new Date().toISOString() : null,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    },
    { onConflict: "company_id,export_order_id,document_type" },
  );

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: order.branch_id,
    actorProfileId: workspace.profileId,
    action: "upsert_export_document",
    entityType: "export_order",
    entityId: order.id,
    newValues: { documentType: parsed.data.documentType, status: parsed.data.status },
  });

  revalidatePath("/export/orders");
  revalidatePath(`/export/orders/${order.id}`);
}

export async function addShipmentCost(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createShipmentCostSchema.safeParse({
    exportOrderId: formOptional(formData.get("exportOrderId")),
    costType: formData.get("costType"),
    description: formData.get("description"),
    amount: formNumber(formData.get("amount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    costDate: formData.get("costDate"),
    supplierName: formOptional(formData.get("supplierName")),
  });

  if (!parsed.success || !parsed.data.exportOrderId) {
    return { error: "Shipment cost details are invalid." };
  }

  const order = await getExportOrderForWorkspace(parsed.data.exportOrderId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("shipment_costs").insert({
    company_id: workspace.companyId,
    branch_id: order.branch_id,
    export_order_id: order.id,
    cost_type: parsed.data.costType,
    description: parsed.data.description,
    amount: parsed.data.amount,
    currency_code: parsed.data.currencyCode,
    cost_date: parsed.data.costDate,
    supplier_name: parsed.data.supplierName,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: order.branch_id,
    actorProfileId: workspace.profileId,
    action: "add_shipment_cost",
    entityType: "export_order",
    entityId: order.id,
    newValues: { costType: parsed.data.costType, amount: parsed.data.amount, currencyCode: parsed.data.currencyCode },
  });

  revalidatePath("/export/orders");
  revalidatePath(`/export/orders/${order.id}`);
}
