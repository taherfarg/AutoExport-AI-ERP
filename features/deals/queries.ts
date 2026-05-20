import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DealPermissions = {
  canViewDeals: boolean;
  canManageDeals: boolean;
  canApproveDeals: boolean;
};

export async function getDealPermissions(companyId: string): Promise<DealPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);
  return {
    canViewDeals: permissions.has(PERMISSIONS.VIEW_DEALS) || permissions.has(PERMISSIONS.MANAGE_DEALS),
    canManageDeals: permissions.has(PERMISSIONS.MANAGE_DEALS),
    canApproveDeals: permissions.has(PERMISSIONS.APPROVE_DEALS),
  };
}

export async function getDealDeskData(companyId: string) {
  const supabase = createServiceRoleClient();
  const [
    { data: deals },
    { data: lenders },
    { data: insuranceProducts },
    { data: warrantyProducts },
    { data: applications },
    { data: submissions },
    { data: approvals },
    { data: branches },
    { data: quotations },
    { data: vehicles },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("id, deal_number, deal_type, status, vehicle_price, product_total, down_payment, finance_amount, term_months, annual_interest_rate, monthly_payment, total_payable, currency_code, approval_status, created_at, vehicles(stock_number, brand, model, year), customers(name), leads(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("lenders")
      .select("id, branch_id, name, lender_type, country_code, base_rate, integration_status, is_active")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("insurance_products")
      .select("id, name, provider_name, premium_amount, cost_amount, commission_amount, currency_code, is_active")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("warranty_products")
      .select("id, name, provider_name, coverage_months, retail_amount, cost_amount, commission_amount, currency_code, is_active")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("finance_applications")
      .select("id, deal_id, lender_id, application_number, applicant_name, requested_amount, term_months, annual_interest_rate, status, created_at, lenders(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("lender_submissions")
      .select("id, finance_application_id, lender_id, submission_number, status, external_reference, created_at, lenders(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("deal_approvals")
      .select("id, deal_id, approval_number, approval_type, status, notes, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("branches")
      .select("id, name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotations")
      .select("id, branch_id, quotation_number, vehicle_id, customer_id, lead_id, total, currency_code, vehicles(stock_number, brand, model, year), customers(name), leads(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("vehicles")
      .select("id, branch_id, stock_number, brand, model, year, selling_price, currency_code")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return {
    deals: deals ?? [],
    lenders: lenders ?? [],
    insuranceProducts: insuranceProducts ?? [],
    warrantyProducts: warrantyProducts ?? [],
    applications: applications ?? [],
    submissions: submissions ?? [],
    approvals: approvals ?? [],
    branches: branches ?? [],
    quotations: quotations ?? [],
    vehicles: vehicles ?? [],
  };
}
