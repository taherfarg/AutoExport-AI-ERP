import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { getCrmStats } from "@/lib/crm/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export type LeadFilters = {
  search?: string;
  status?: string;
  branchId?: string;
  source?: string;
  assignedTo?: string;
};

export type LeadListRow = {
  id: string;
  company_id: string;
  branch_id: string;
  customer_id: string | null;
  name: string;
  customer_type: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  country_code: string | null;
  city: string | null;
  preferred_brand: string | null;
  preferred_model: string | null;
  budget: number | null;
  currency_code: string;
  language: string;
  lead_source: string;
  assigned_salesperson_id: string | null;
  status: string;
  lead_score: number;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  branches: { name: string; code: string; country_code: string } | null;
};

export type LeadDetail = LeadListRow & {
  converted_customer_id: string | null;
  converted_at: string | null;
};

export type FollowUpRow = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string;
  completed_at: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
};

export type LeadMessageRow = {
  id: string;
  direction: string;
  channel: string;
  subject: string | null;
  body: string;
  message_at: string;
  created_at: string;
};

export type MatchingVehicleRow = {
  id: string;
  stock_number: string;
  brand: string;
  model: string;
  year: number;
  trim: string | null;
  selling_price: number;
  currency_code: string;
  status: string;
  export_available: boolean;
};

export type CrmPermissions = {
  canCreateLead: boolean;
  canUpdateLead: boolean;
  canAssignLead: boolean;
  canCreateFollowUp: boolean;
  canUpdateFollowUp: boolean;
};

export async function getCrmPermissions(companyId: string): Promise<CrmPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canCreateLead: permissions.has(PERMISSIONS.CREATE_LEAD),
    canUpdateLead: permissions.has(PERMISSIONS.UPDATE_LEAD),
    canAssignLead: permissions.has(PERMISSIONS.ASSIGN_LEAD),
    canCreateFollowUp: permissions.has(PERMISSIONS.CREATE_FOLLOW_UP),
    canUpdateFollowUp: permissions.has(PERMISSIONS.UPDATE_FOLLOW_UP),
  };
}

export async function getLeads(companyId: string, filters: LeadFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(
      "id, company_id, branch_id, customer_id, name, customer_type, phone, whatsapp, email, country_code, city, preferred_brand, preferred_model, budget, currency_code, language, lead_source, assigned_salesperson_id, status, lead_score, last_contact_at, next_follow_up_at, notes, created_at, branches(name, code, country_code)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,preferred_brand.ilike.%${search}%,preferred_model.ilike.%${search}%`,
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.branchId && filters.branchId !== "all") {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.source && filters.source !== "all") {
    query = query.eq("lead_source", filters.source);
  }

  if (filters.assignedTo && filters.assignedTo !== "all") {
    query = query.eq("assigned_salesperson_id", filters.assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as LeadListRow[];
}

export async function getLeadDetail(companyId: string, leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_id, branch_id, customer_id, name, customer_type, phone, whatsapp, email, country_code, city, preferred_brand, preferred_model, budget, currency_code, language, lead_source, assigned_salesperson_id, status, lead_score, last_contact_at, next_follow_up_at, notes, created_at, converted_customer_id, converted_at, branches(name, code, country_code)",
    )
    .eq("company_id", companyId)
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as LeadDetail;
}

export async function getLeadFollowUps(companyId: string, leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("id, title, notes, due_at, completed_at, status, priority, assigned_to, created_at")
    .eq("company_id", companyId)
    .eq("lead_id", leadId)
    .is("deleted_at", null)
    .order("due_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FollowUpRow[];
}

export async function getLeadMessages(companyId: string, leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_messages")
    .select("id, direction, channel, subject, body, message_at, created_at")
    .eq("company_id", companyId)
    .eq("lead_id", leadId)
    .is("deleted_at", null)
    .order("message_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LeadMessageRow[];
}

export async function getMatchingVehicles(companyId: string, lead: Pick<LeadDetail, "preferred_brand" | "preferred_model">) {
  const supabase = await createClient();
  let query = supabase
    .from("vehicles")
    .select("id, stock_number, brand, model, year, trim, selling_price, currency_code, status, export_available")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .in("status", ["available", "ready_for_export"])
    .limit(5);

  if (lead.preferred_brand) {
    query = query.ilike("brand", `%${lead.preferred_brand.replaceAll("%", "")}%`);
  }

  if (lead.preferred_model) {
    query = query.ilike("model", `%${lead.preferred_model.replaceAll("%", "")}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchingVehicleRow[];
}

export function getLeadStats(leads: LeadListRow[]) {
  return getCrmStats(leads);
}

export function getLeadPipeline(leads: LeadListRow[], statuses: readonly string[]) {
  return statuses.map((status) => ({
    status,
    leads: leads.filter((lead) => lead.status === status),
  }));
}

