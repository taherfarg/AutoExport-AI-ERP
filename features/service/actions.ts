"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeServiceNumber } from "@/lib/service/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createInspectionResultSchema,
  createServiceAppointmentSchema,
  createServiceJobSchema,
  createServiceLaborLineSchema,
  createServiceOrderSchema,
  createTechnicianSchema,
  createWarrantyClaimSchema,
} from "@/lib/validations/service";

type ServiceActionResult = { success?: string; error?: string };

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  return Number(value);
}

async function requireServicePermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this service action.");
  }

  return workspace;
}

async function requireAnyServicePermission(permissionKeys: string[]) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissionKeys.some((permissionKey) => permissions.has(permissionKey))) {
    throw new Error("You do not have permission for this service action.");
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

async function getServiceOrder(companyId: string, serviceOrderId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select("id, branch_id, vehicle_id, customer_id, currency_code")
    .eq("company_id", companyId)
    .eq("id", serviceOrderId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Service order was not found.");
  }

  return data;
}

export async function createTechnician(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireServicePermission(PERMISSIONS.MANAGE_SERVICE);
  const parsed = createTechnicianSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    displayName: formData.get("displayName"),
    specialization: formOptional(formData.get("specialization")),
    phone: formOptional(formData.get("phone")),
    hourlyRate: formNumber(formData.get("hourlyRate")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    status: formOptional(formData.get("status")) ?? "active",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Technician details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("technicians").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    display_name: parsed.data.displayName,
    specialization: parsed.data.specialization,
    phone: parsed.data.phone,
    hourly_rate: parsed.data.hourlyRate,
    currency_code: parsed.data.currencyCode,
    status: parsed.data.status,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Technician could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_technician", entityType: "technician", entityId: data.id });
  revalidatePath("/service/workshop");
  return { success: "Technician created." };
}

export async function createServiceAppointment(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireServicePermission(PERMISSIONS.MANAGE_SERVICE);
  const parsed = createServiceAppointmentSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    vehicleId: formOptional(formData.get("vehicleId")),
    customerId: formOptional(formData.get("customerId")),
    title: formData.get("title"),
    scheduledStart: formData.get("scheduledStart"),
    scheduledEnd: formOptional(formData.get("scheduledEnd")),
    status: formOptional(formData.get("status")) ?? "scheduled",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Appointment details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("service_appointments").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    vehicle_id: parsed.data.vehicleId,
    customer_id: parsed.data.customerId,
    appointment_number: makeServiceNumber("APT"),
    title: parsed.data.title,
    scheduled_start: parsed.data.scheduledStart,
    scheduled_end: parsed.data.scheduledEnd,
    status: parsed.data.status,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Appointment could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_service_appointment", entityType: "service_appointment", entityId: data.id });
  revalidatePath("/service/workshop");
  return { success: "Service appointment created." };
}

export async function createServiceOrder(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireServicePermission(PERMISSIONS.MANAGE_SERVICE);
  const parsed = createServiceOrderSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    vehicleId: formOptional(formData.get("vehicleId")),
    customerId: formOptional(formData.get("customerId")),
    title: formData.get("title"),
    complaint: formOptional(formData.get("complaint")),
    odometer: formOptional(formData.get("odometer")) ? formNumber(formData.get("odometer")) : undefined,
    priority: formOptional(formData.get("priority")) ?? "normal",
    status: formOptional(formData.get("status")) ?? "in_progress",
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Service order details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("service_orders").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    vehicle_id: parsed.data.vehicleId,
    customer_id: parsed.data.customerId,
    order_number: makeServiceNumber("SO"),
    title: parsed.data.title,
    complaint: parsed.data.complaint,
    odometer: parsed.data.odometer,
    priority: parsed.data.priority,
    status: parsed.data.status,
    currency_code: parsed.data.currencyCode,
    notes: parsed.data.notes,
    advisor_id: workspace.profileId,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Service order could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_service_order", entityType: "service_order", entityId: data.id });
  revalidatePath("/service/workshop");
  return { success: "Service order created." };
}

export async function createServiceJob(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireAnyServicePermission([PERMISSIONS.MANAGE_SERVICE, PERMISSIONS.ASSIGN_SERVICE_JOBS]);
  const parsed = createServiceJobSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    serviceOrderId: formData.get("serviceOrderId"),
    technicianId: formOptional(formData.get("technicianId")),
    title: formData.get("title"),
    description: formOptional(formData.get("description")),
    laborType: formOptional(formData.get("laborType")) ?? "repair",
    status: formOptional(formData.get("status")) ?? "assigned",
    estimatedHours: formNumber(formData.get("estimatedHours")),
    actualHours: formNumber(formData.get("actualHours")),
    laborRate: formNumber(formData.get("laborRate")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Service job details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("service_jobs").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    service_order_id: parsed.data.serviceOrderId,
    technician_id: parsed.data.technicianId,
    job_number: makeServiceNumber("JOB"),
    title: parsed.data.title,
    description: parsed.data.description,
    labor_type: parsed.data.laborType,
    status: parsed.data.status,
    estimated_hours: parsed.data.estimatedHours,
    actual_hours: parsed.data.actualHours,
    labor_rate: parsed.data.laborRate,
    labor_amount: parsed.data.laborAmount,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Service job could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_service_job", entityType: "service_job", entityId: data.id });
  revalidatePath("/service/workshop");
  return { success: "Service job created." };
}

export async function createServiceLaborLine(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireServicePermission(PERMISSIONS.MANAGE_SERVICE);
  const parsed = createServiceLaborLineSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    serviceOrderId: formData.get("serviceOrderId"),
    serviceJobId: formOptional(formData.get("serviceJobId")),
    technicianId: formOptional(formData.get("technicianId")),
    laborType: formOptional(formData.get("laborType")) ?? "repair",
    description: formData.get("description"),
    hours: formNumber(formData.get("hours")),
    hourlyRate: formNumber(formData.get("hourlyRate")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Labor line details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("service_labor_lines").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    service_order_id: parsed.data.serviceOrderId,
    service_job_id: parsed.data.serviceJobId,
    technician_id: parsed.data.technicianId,
    line_number: makeServiceNumber("LAB"),
    labor_type: parsed.data.laborType,
    description: parsed.data.description,
    hours: parsed.data.hours,
    hourly_rate: parsed.data.hourlyRate,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Labor line could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_service_labor_line", entityType: "service_labor_line", entityId: data.id });
  revalidatePath("/service/workshop");
  return { success: "Labor line created." };
}

export async function createInspectionResult(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireServicePermission(PERMISSIONS.MANAGE_SERVICE);
  const parsed = createInspectionResultSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    serviceOrderId: formData.get("serviceOrderId"),
    checklistId: formOptional(formData.get("checklistId")),
    vehicleId: formOptional(formData.get("vehicleId")),
    technicianId: formOptional(formData.get("technicianId")),
    overallStatus: formOptional(formData.get("overallStatus")) ?? "pass",
    scorePercent: formNumber(formData.get("scorePercent"), 100),
    results: formOptional(formData.get("results")) ?? "{}",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Inspection result details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("inspection_results").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    service_order_id: parsed.data.serviceOrderId,
    checklist_id: parsed.data.checklistId,
    vehicle_id: parsed.data.vehicleId,
    technician_id: parsed.data.technicianId,
    result_number: makeServiceNumber("INSP"),
    overall_status: parsed.data.overallStatus,
    score_percent: parsed.data.scorePercent,
    results: parsed.data.results,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Inspection result could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_inspection_result", entityType: "inspection_result", entityId: data.id });
  revalidatePath("/service/workshop");
  return { success: "Inspection result created." };
}

export async function createWarrantyClaim(formData: FormData): Promise<ServiceActionResult> {
  const workspace = await requireAnyServicePermission([PERMISSIONS.MANAGE_WARRANTY_CLAIMS, PERMISSIONS.MANAGE_SERVICE]);
  const serviceOrderId = formOptional(formData.get("serviceOrderId"));
  const order = serviceOrderId ? await getServiceOrder(workspace.companyId, serviceOrderId) : null;
  const parsed = createWarrantyClaimSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId") ?? order?.branch_id,
    serviceOrderId,
    vehicleId: formOptional(formData.get("vehicleId")) ?? order?.vehicle_id ?? undefined,
    customerId: formOptional(formData.get("customerId")) ?? order?.customer_id ?? undefined,
    providerName: formData.get("providerName"),
    claimAmount: formNumber(formData.get("claimAmount")),
    approvedAmount: formNumber(formData.get("approvedAmount")),
    paidAmount: formNumber(formData.get("paidAmount")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? order?.currency_code ?? "AED",
    status: formOptional(formData.get("status")) ?? "submitted",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Warranty claim details are invalid." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("warranty_claims").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    service_order_id: parsed.data.serviceOrderId,
    vehicle_id: parsed.data.vehicleId,
    customer_id: parsed.data.customerId,
    claim_number: makeServiceNumber("WCL"),
    provider_name: parsed.data.providerName,
    claim_amount: parsed.data.claimAmount,
    approved_amount: parsed.data.approvedAmount,
    paid_amount: parsed.data.paidAmount,
    currency_code: parsed.data.currencyCode,
    status: parsed.data.status,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "Warranty claim could not be created." };
  await writeAuditLog({ companyId: workspace.companyId, branchId: parsed.data.branchId, actorProfileId: workspace.profileId, action: "create_warranty_claim", entityType: "warranty_claim", entityId: data.id, newValues: { claimBalance: parsed.data.claimBalance } });
  revalidatePath("/service/workshop");
  return { success: "Warranty claim created." };
}
