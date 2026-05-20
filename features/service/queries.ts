import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ServicePermissions = {
  canViewService: boolean;
  canManageService: boolean;
  canAssignJobs: boolean;
  canManageWarrantyClaims: boolean;
};

export type TechnicianRow = {
  id: string;
  branch_id: string | null;
  display_name: string;
  specialization: string | null;
  hourly_rate: number;
  currency_code: string;
  status: string;
  branches: { name: string; code: string } | null;
};

export type ServiceOrderRow = {
  id: string;
  branch_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  order_number: string;
  title: string;
  complaint: string | null;
  priority: string;
  status: string;
  labor_total: number;
  parts_total: number;
  total_amount: number;
  currency_code: string;
  opened_at: string;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
  customers: { name: string } | null;
  branches: { name: string; code: string } | null;
};

export type ServiceJobRow = {
  id: string;
  branch_id: string;
  service_order_id: string;
  technician_id: string | null;
  job_number: string;
  title: string;
  labor_type: string;
  status: string;
  estimated_hours: number;
  labor_amount: number;
  service_orders: { order_number: string; title: string } | null;
  technicians: { display_name: string } | null;
};

export type ServiceLaborLineRow = {
  id: string;
  service_order_id: string;
  service_job_id: string | null;
  technician_id: string | null;
  line_number: string;
  labor_type: string;
  description: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  service_orders: { order_number: string } | null;
  technicians: { display_name: string } | null;
};

export type InspectionChecklistRow = {
  id: string;
  name: string;
  checklist_type: string;
  is_active: boolean;
};

export type InspectionResultRow = {
  id: string;
  result_number: string;
  overall_status: string;
  score_percent: number;
  notes: string | null;
  inspected_at: string;
  service_orders: { order_number: string } | null;
  technicians: { display_name: string } | null;
};

export type WarrantyClaimRow = {
  id: string;
  claim_number: string;
  provider_name: string;
  claim_amount: number;
  approved_amount: number;
  paid_amount: number;
  currency_code: string;
  status: string;
  service_orders: { order_number: string } | null;
};

export type ServiceAppointmentRow = {
  id: string;
  appointment_number: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: string;
  vehicles: { stock_number: string; brand: string; model: string } | null;
  customers: { name: string } | null;
};

export type ServiceVehicleOption = {
  id: string;
  branch_id: string;
  stock_number: string;
  brand: string;
  model: string;
  year: number;
  currency_code: string;
};

export type ServiceCustomerOption = {
  id: string;
  name: string;
};

export async function getServicePermissions(companyId: string): Promise<ServicePermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewService: permissions.has(PERMISSIONS.VIEW_SERVICE) || permissions.has(PERMISSIONS.MANAGE_SERVICE),
    canManageService: permissions.has(PERMISSIONS.MANAGE_SERVICE),
    canAssignJobs: permissions.has(PERMISSIONS.ASSIGN_SERVICE_JOBS) || permissions.has(PERMISSIONS.MANAGE_SERVICE),
    canManageWarrantyClaims: permissions.has(PERMISSIONS.MANAGE_WARRANTY_CLAIMS) || permissions.has(PERMISSIONS.MANAGE_SERVICE),
  };
}

export async function getServiceWorkshopData(companyId: string) {
  const supabase = createServiceRoleClient();
  const [
    techniciansResult,
    ordersResult,
    jobsResult,
    laborResult,
    checklistsResult,
    inspectionsResult,
    claimsResult,
    appointmentsResult,
    vehiclesResult,
    customersResult,
  ] = await Promise.all([
    supabase.from("technicians").select("id, branch_id, display_name, specialization, hourly_rate, currency_code, status, branches(name, code)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_orders").select("id, branch_id, vehicle_id, customer_id, order_number, title, complaint, priority, status, labor_total, parts_total, total_amount, currency_code, opened_at, vehicles(stock_number, brand, model, year), customers(name), branches(name, code)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_jobs").select("id, branch_id, service_order_id, technician_id, job_number, title, labor_type, status, estimated_hours, labor_amount, service_orders(order_number, title), technicians(display_name)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_labor_lines").select("id, service_order_id, service_job_id, technician_id, line_number, labor_type, description, hours, hourly_rate, amount, service_orders(order_number), technicians(display_name)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("inspection_checklists").select("id, name, checklist_type, is_active").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("inspection_results").select("id, result_number, overall_status, score_percent, notes, inspected_at, service_orders(order_number), technicians(display_name)").eq("company_id", companyId).is("deleted_at", null).order("inspected_at", { ascending: false }),
    supabase.from("warranty_claims").select("id, claim_number, provider_name, claim_amount, approved_amount, paid_amount, currency_code, status, service_orders(order_number)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_appointments").select("id, appointment_number, title, scheduled_start, scheduled_end, status, vehicles(stock_number, brand, model), customers(name)").eq("company_id", companyId).is("deleted_at", null).order("scheduled_start", { ascending: true }),
    supabase.from("vehicles").select("id, branch_id, stock_number, brand, model, year, currency_code").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
  ]);

  for (const result of [techniciansResult, ordersResult, jobsResult, laborResult, checklistsResult, inspectionsResult, claimsResult, appointmentsResult, vehiclesResult, customersResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const orders = (ordersResult.data ?? []) as unknown as ServiceOrderRow[];
  const laborLines = (laborResult.data ?? []) as unknown as ServiceLaborLineRow[];
  const warrantyClaims = (claimsResult.data ?? []) as unknown as WarrantyClaimRow[];

  return {
    technicians: (techniciansResult.data ?? []) as unknown as TechnicianRow[],
    serviceOrders: orders,
    serviceJobs: (jobsResult.data ?? []) as unknown as ServiceJobRow[],
    laborLines,
    checklists: (checklistsResult.data ?? []) as InspectionChecklistRow[],
    inspectionResults: (inspectionsResult.data ?? []) as unknown as InspectionResultRow[],
    warrantyClaims,
    appointments: (appointmentsResult.data ?? []) as unknown as ServiceAppointmentRow[],
    vehicles: (vehiclesResult.data ?? []) as ServiceVehicleOption[],
    customers: (customersResult.data ?? []) as ServiceCustomerOption[],
    summary: {
      openOrders: orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length,
      activeJobs: (jobsResult.data ?? []).filter((job) => !["completed", "cancelled"].includes(String(job.status))).length,
      laborTotal: laborLines.reduce((sum, line) => sum + Number(line.amount), 0),
      warrantyBalance: warrantyClaims.reduce((sum, claim) => sum + Math.max(Number(claim.approved_amount) - Number(claim.paid_amount), 0), 0),
    },
  };
}
