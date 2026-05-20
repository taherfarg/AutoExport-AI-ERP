"use server";

import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { calculateDealStructure } from "@/lib/deals/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createDealApprovalSchema,
  createDealProductSchema,
  createDealSchema,
  createFinanceApplicationSchema,
  createInsuranceProductSchema,
  createLenderSchema,
  createLenderSubmissionSchema,
  createWarrantyProductSchema,
  decideDealApprovalSchema,
} from "@/lib/validations/deals";

type DealActionResult = {
  success?: string;
  error?: string;
};

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function documentNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function requirePermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this deal desk operation.");
  }

  return workspace;
}

async function writeAuditLog({
  companyId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

async function getDeal(companyId: string, dealId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, company_id, branch_id, finance_amount, down_payment, term_months, annual_interest_rate")
    .eq("company_id", companyId)
    .eq("id", dealId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Deal was not found.");
  }

  return data;
}

export async function createLender(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createLenderSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    name: formData.get("name"),
    lenderType: formData.get("lenderType") || "bank",
    countryCode: formData.get("countryCode") || "AE",
    contactEmail: formOptional(formData.get("contactEmail")),
    contactPhone: formOptional(formData.get("contactPhone")),
    baseRate: formData.get("baseRate") || 0,
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Lender details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("lenders")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      name: parsed.data.name,
      lender_type: parsed.data.lenderType,
      country_code: parsed.data.countryCode,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      base_rate: parsed.data.baseRate,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Lender could not be created." };

  await writeAuditLog({ companyId: workspace.companyId, actorProfileId: workspace.profileId, action: "create_lender", entityType: "lender", entityId: data.id });
  return { success: "Lender saved." };
}

export async function createInsuranceProduct(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createInsuranceProductSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("insuranceName"),
    providerName: formData.get("insuranceProviderName"),
    premiumAmount: formData.get("premiumAmount") || 0,
    costAmount: formData.get("insuranceCostAmount") || 0,
    commissionAmount: formData.get("insuranceCommissionAmount") || 0,
    currencyCode: formData.get("currencyCode") || "AED",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Insurance product details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("insurance_products").insert({
    company_id: workspace.companyId,
    name: parsed.data.name,
    provider_name: parsed.data.providerName,
    premium_amount: parsed.data.premiumAmount,
    cost_amount: parsed.data.costAmount,
    commission_amount: parsed.data.commissionAmount,
    currency_code: parsed.data.currencyCode,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) return { error: error.message };
  return { success: "Insurance product saved." };
}

export async function createWarrantyProduct(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createWarrantyProductSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("warrantyName"),
    providerName: formData.get("warrantyProviderName"),
    coverageMonths: formData.get("coverageMonths") || 12,
    coverageKm: formOptional(formData.get("coverageKm")),
    retailAmount: formData.get("retailAmount") || 0,
    costAmount: formData.get("warrantyCostAmount") || 0,
    commissionAmount: formData.get("warrantyCommissionAmount") || 0,
    currencyCode: formData.get("currencyCode") || "AED",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Warranty product details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("warranty_products").insert({
    company_id: workspace.companyId,
    name: parsed.data.name,
    provider_name: parsed.data.providerName,
    coverage_months: parsed.data.coverageMonths,
    coverage_km: parsed.data.coverageKm,
    retail_amount: parsed.data.retailAmount,
    cost_amount: parsed.data.costAmount,
    commission_amount: parsed.data.commissionAmount,
    currency_code: parsed.data.currencyCode,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) return { error: error.message };
  return { success: "Warranty product saved." };
}

export async function createDeal(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createDealSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    quotationId: formOptional(formData.get("quotationId")),
    reservationId: formOptional(formData.get("reservationId")),
    vehicleId: formData.get("vehicleId"),
    customerId: formOptional(formData.get("customerId")),
    leadId: formOptional(formData.get("leadId")),
    dealType: formData.get("dealType") || "finance",
    vehiclePrice: formData.get("vehiclePrice") || 0,
    productTotal: formData.get("productTotal") || 0,
    downPayment: formData.get("downPayment") || 0,
    tradeInValue: formData.get("tradeInValue") || 0,
    termMonths: formData.get("termMonths") || 60,
    annualInterestRate: formData.get("annualInterestRate") || 0,
    balloonPayment: formData.get("balloonPayment") || 0,
    currencyCode: formData.get("currencyCode") || "AED",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Deal details are invalid." };
  }

  const structure = calculateDealStructure({
    vehiclePrice: parsed.data.vehiclePrice,
    productTotal: parsed.data.productTotal,
    downPayment: parsed.data.downPayment,
    tradeInValue: parsed.data.tradeInValue,
    annualRate: parsed.data.annualInterestRate,
    termMonths: parsed.data.termMonths,
    balloonPayment: parsed.data.balloonPayment,
  });

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      deal_number: documentNumber("DEAL"),
      quotation_id: parsed.data.quotationId,
      reservation_id: parsed.data.reservationId,
      vehicle_id: parsed.data.vehicleId,
      customer_id: parsed.data.customerId,
      lead_id: parsed.data.leadId,
      deal_type: parsed.data.dealType,
      vehicle_price: parsed.data.vehiclePrice,
      product_total: parsed.data.productTotal,
      down_payment: parsed.data.downPayment,
      trade_in_value: parsed.data.tradeInValue,
      finance_amount: structure.financeAmount,
      term_months: parsed.data.termMonths,
      annual_interest_rate: parsed.data.annualInterestRate,
      monthly_payment: structure.monthlyPayment,
      balloon_payment: parsed.data.balloonPayment,
      total_payable: structure.totalPayable,
      currency_code: parsed.data.currencyCode,
      notes: parsed.data.notes,
      salesperson_id: workspace.profileId,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Deal could not be created." };

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "create_deal",
    entityType: "deal",
    entityId: data.id,
    newValues: { financeAmount: structure.financeAmount, monthlyPayment: structure.monthlyPayment },
  });

  return { success: "Deal structure saved." };
}

export async function createDealProduct(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createDealProductSchema.safeParse({
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
    productType: formData.get("productType"),
    name: formData.get("productName"),
    sellingPrice: formData.get("sellingPrice") || 0,
    costAmount: formData.get("costAmount") || 0,
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Deal product is invalid." };

  const supabase = createServiceRoleClient();
  const grossProfit = Math.max(parsed.data.sellingPrice - parsed.data.costAmount, 0);
  const { error } = await supabase.from("deal_products").insert({
    company_id: workspace.companyId,
    deal_id: parsed.data.dealId,
    product_type: parsed.data.productType,
    name: parsed.data.name,
    selling_price: parsed.data.sellingPrice,
    cost_amount: parsed.data.costAmount,
    gross_profit: grossProfit,
    status: "accepted",
    created_by: workspace.profileId,
  });

  if (error) return { error: error.message };
  return { success: "Deal product added." };
}

export async function createFinanceApplication(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createFinanceApplicationSchema.safeParse({
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
    lenderId: formOptional(formData.get("lenderId")),
    applicantName: formData.get("applicantName"),
    applicantEmail: formOptional(formData.get("applicantEmail")),
    applicantPhone: formOptional(formData.get("applicantPhone")),
    employmentStatus: formOptional(formData.get("employmentStatus")),
    annualIncome: formData.get("annualIncome") || 0,
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Finance application details are invalid." };

  const deal = await getDeal(workspace.companyId, parsed.data.dealId);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("finance_applications")
    .insert({
      company_id: workspace.companyId,
      branch_id: deal.branch_id,
      deal_id: deal.id,
      lender_id: parsed.data.lenderId,
      application_number: documentNumber("FIN"),
      applicant_name: parsed.data.applicantName,
      applicant_email: parsed.data.applicantEmail,
      applicant_phone: parsed.data.applicantPhone,
      employment_status: parsed.data.employmentStatus,
      annual_income: parsed.data.annualIncome,
      requested_amount: deal.finance_amount,
      down_payment: deal.down_payment,
      term_months: deal.term_months,
      annual_interest_rate: deal.annual_interest_rate,
      status: "submitted",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Finance application could not be created." };
  return { success: "Finance application submitted." };
}

export async function createLenderSubmission(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createLenderSubmissionSchema.safeParse({
    companyId: formData.get("companyId"),
    financeApplicationId: formData.get("financeApplicationId"),
    lenderId: formData.get("lenderId"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Lender submission details are invalid." };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lender_submissions").insert({
    company_id: workspace.companyId,
    finance_application_id: parsed.data.financeApplicationId,
    lender_id: parsed.data.lenderId,
    submission_number: documentNumber("SUB"),
    status: "sent",
    sent_at: new Date().toISOString(),
    request_payload: { mode: "manual_provider_ready" },
    created_by: workspace.profileId,
  });

  if (error) return { error: error.message };
  return { success: "Lender submission sent." };
}

export async function createDealApproval(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_DEALS);
  const parsed = createDealApprovalSchema.safeParse({
    companyId: formData.get("companyId"),
    dealId: formData.get("dealId"),
    approvalType: formData.get("approvalType") || "manager",
    notes: formOptional(formData.get("approvalNotes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Approval request details are invalid." };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("deal_approvals").insert({
    company_id: workspace.companyId,
    deal_id: parsed.data.dealId,
    approval_number: documentNumber("APP"),
    approval_type: parsed.data.approvalType,
    status: "pending",
    requested_by: workspace.profileId,
    notes: parsed.data.notes,
  });

  if (error) return { error: error.message };
  return { success: "Approval requested." };
}

export async function decideDealApproval(formData: FormData): Promise<DealActionResult> {
  const workspace = await requirePermission(PERMISSIONS.APPROVE_DEALS);
  const parsed = decideDealApprovalSchema.safeParse({
    companyId: formData.get("companyId"),
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
    notes: formOptional(formData.get("decisionNotes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) return { error: "Approval decision details are invalid." };

  const supabase = createServiceRoleClient();
  const { data: approval, error: approvalError } = await supabase
    .from("deal_approvals")
    .select("deal_id")
    .eq("company_id", workspace.companyId)
    .eq("id", parsed.data.approvalId)
    .single();

  if (approvalError || !approval) return { error: approvalError?.message ?? "Approval was not found." };

  const { error } = await supabase
    .from("deal_approvals")
    .update({
      status: parsed.data.decision,
      decided_by: workspace.profileId,
      decided_at: new Date().toISOString(),
      notes: parsed.data.notes,
    })
    .eq("company_id", workspace.companyId)
    .eq("id", parsed.data.approvalId);

  if (error) return { error: error.message };

  await supabase
    .from("deals")
    .update({
      approval_status: parsed.data.decision,
      status: parsed.data.decision === "approved" ? "approved" : "rejected",
      updated_by: workspace.profileId,
    })
    .eq("company_id", workspace.companyId)
    .eq("id", approval.deal_id);

  return { success: parsed.data.decision === "approved" ? "Deal approved." : "Deal rejected." };
}
