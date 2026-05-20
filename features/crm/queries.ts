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

export type CustomerFilters = {
  search?: string;
  type?: string;
  branchId?: string;
  countryCode?: string;
};

export type CustomerRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_type: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  country_code: string | null;
  city: string | null;
  preferred_language: string;
  notes: string | null;
  created_at: string;
  branches: { name: string; code: string; country_code: string } | null;
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
  canCreateCustomer: boolean;
  canUpdateCustomer: boolean;
  canCreateLead: boolean;
  canUpdateLead: boolean;
  canAssignLead: boolean;
  canCreateFollowUp: boolean;
  canUpdateFollowUp: boolean;
};

export async function getCrmPermissions(companyId: string): Promise<CrmPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canCreateCustomer: permissions.has(PERMISSIONS.CREATE_CUSTOMER),
    canUpdateCustomer: permissions.has(PERMISSIONS.UPDATE_CUSTOMER),
    canCreateLead: permissions.has(PERMISSIONS.CREATE_LEAD),
    canUpdateLead: permissions.has(PERMISSIONS.UPDATE_LEAD),
    canAssignLead: permissions.has(PERMISSIONS.ASSIGN_LEAD),
    canCreateFollowUp: permissions.has(PERMISSIONS.CREATE_FOLLOW_UP),
    canUpdateFollowUp: permissions.has(PERMISSIONS.UPDATE_FOLLOW_UP),
  };
}

export async function getCustomers(companyId: string, filters: CustomerFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select(
      "id, company_id, branch_id, customer_type, name, phone, whatsapp, email, country_code, city, preferred_language, notes, created_at, branches(name, code, country_code)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`,
    );
  }

  if (filters.type && filters.type !== "all") {
    query = query.eq("customer_type", filters.type);
  }

  if (filters.branchId && filters.branchId !== "all") {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.countryCode && filters.countryCode !== "all") {
    query = query.eq("country_code", filters.countryCode.toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CustomerRow[];
}

export function getCustomerStats(customers: CustomerRow[]) {
  return {
    total: customers.length,
    exportBuyers: customers.filter((customer) => customer.customer_type === "export_buyer").length,
    companies: customers.filter((customer) => customer.customer_type === "company" || customer.customer_type === "dealer").length,
    countries: new Set(customers.map((customer) => customer.country_code).filter(Boolean)).size,
  };
}

export function getCustomerFilterOptions(customers: CustomerRow[]) {
  return {
    countries: Array.from(new Set(customers.map((customer) => customer.country_code).filter(Boolean) as string[])).sort(),
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

export type CommunicationProviderRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  provider_type: string;
  provider_name: string;
  config: Record<string, unknown>;
  is_active: boolean;
};

export type MessageTemplateRow = {
  id: string;
  company_id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[];
  language: string;
  is_active: boolean;
};

export type CustomerConsentRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  lead_id: string | null;
  channel: string;
  is_granted: boolean;
  consent_source: string;
};

export type OutboundMessageRow = {
  id: string;
  company_id: string;
  branch_id: string;
  provider_id: string | null;
  lead_id: string | null;
  customer_id: string | null;
  channel: string;
  sender_id: string | null;
  recipient_address: string;
  subject: string | null;
  body: string;
  template_id: string | null;
  template_variables: Record<string, unknown>;
  status: string;
  error_message: string | null;
  external_message_id: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  message_delivery_events: Array<{
    id: string;
    status: string;
    event_at: string;
    error_code: string | null;
    error_description: string | null;
  }>;
};

export async function getCommunicationProviders(companyId: string): Promise<CommunicationProviderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_providers")
    .select("id, company_id, branch_id, provider_type, provider_name, config, is_active")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("provider_type", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CommunicationProviderRow[];
}

export async function getMessageTemplates(companyId: string, channel?: string): Promise<MessageTemplateRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("message_templates")
    .select("id, company_id, name, channel, subject, body, variables, language, is_active")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (channel && channel !== "all") {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MessageTemplateRow[];
}

export async function getCustomerConsents(
  companyId: string,
  ref: { customerId?: string; leadId?: string }
): Promise<CustomerConsentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("customer_consents")
    .select("id, company_id, customer_id, lead_id, channel, is_granted, consent_source")
    .eq("company_id", companyId);

  if (ref.customerId) {
    query = query.eq("customer_id", ref.customerId);
  } else if (ref.leadId) {
    query = query.eq("lead_id", ref.leadId);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CustomerConsentRow[];
}

export async function getOutboundMessagesTimeline(
  companyId: string,
  leadId: string
): Promise<OutboundMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outbound_messages")
    .select(`
      id,
      company_id,
      branch_id,
      provider_id,
      lead_id,
      customer_id,
      channel,
      sender_id,
      recipient_address,
      subject,
      body,
      template_id,
      template_variables,
      status,
      error_message,
      external_message_id,
      created_at,
      profiles!sender_id(full_name, email),
      message_delivery_events(id, status, event_at, error_code, error_description)
    `)
    .eq("company_id", companyId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OutboundMessageRow[];
}

