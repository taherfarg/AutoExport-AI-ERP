import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { getSalesStats } from "@/lib/sales/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export type SalesPermissions = {
  canViewSales: boolean;
  canCreateQuotation: boolean;
  canUpdateQuotation: boolean;
  canReserveVehicle: boolean;
  canCreateInvoice: boolean;
  canRecordPayment: boolean;
  canViewPayments: boolean;
};

export type QuotationFilters = {
  search?: string;
  status?: string;
  branchId?: string;
};

export type QuotationRow = {
  id: string;
  company_id: string;
  branch_id: string;
  quotation_number: string;
  customer_id: string | null;
  lead_id: string | null;
  vehicle_id: string;
  price: number;
  discount: number;
  tax: number;
  total: number;
  currency_code: string;
  valid_until: string;
  notes: string | null;
  salesperson_id: string | null;
  status: string;
  created_at: string;
  branches: { name: string; code: string } | null;
  vehicles: { stock_number: string; brand: string; model: string; year: number; trim: string | null } | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
  leads: { name: string; phone: string | null; email: string | null } | null;
};

export type ReservationRow = {
  id: string;
  reservation_number: string;
  deposit_amount: number;
  currency_code: string;
  reservation_date: string;
  expiry_date: string;
  payment_status: string;
  agreement_signature_status: string;
  status: string;
};

export type ProformaRow = {
  id: string;
  proforma_number: string;
  export_destination: string | null;
  vehicle_price: number;
  shipping_estimate: number;
  additional_fees: number;
  tax: number;
  total: number;
  currency_code: string;
  status: string;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  quotation_id: string | null;
  reservation_id: string | null;
  customer_id: string | null;
  vehicle_id: string;
  final_price: number;
  tax: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  currency_code: string;
  due_date: string;
  invoice_status: string;
  created_at: string;
  branches: { name: string; code: string } | null;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
};

export type PaymentRow = {
  id: string;
  payment_number: string;
  related_invoice_id: string | null;
  reservation_id: string | null;
  payment_type: string;
  amount: number;
  currency_code: string;
  payment_method: string;
  payment_date: string;
  status: string;
  notes: string | null;
};

export async function getSalesPermissions(companyId: string): Promise<SalesPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewSales: permissions.has(PERMISSIONS.VIEW_SALES),
    canCreateQuotation: permissions.has(PERMISSIONS.CREATE_QUOTATION),
    canUpdateQuotation: permissions.has(PERMISSIONS.UPDATE_QUOTATION),
    canReserveVehicle: permissions.has(PERMISSIONS.RESERVE_VEHICLE),
    canCreateInvoice: permissions.has(PERMISSIONS.CREATE_INVOICE),
    canRecordPayment: permissions.has(PERMISSIONS.RECORD_PAYMENT),
    canViewPayments: permissions.has(PERMISSIONS.VIEW_PAYMENTS),
  };
}

export async function getQuotations(companyId: string, filters: QuotationFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("quotations")
    .select(
      "id, company_id, branch_id, quotation_number, customer_id, lead_id, vehicle_id, price, discount, tax, total, currency_code, valid_until, notes, salesperson_id, status, created_at, branches(name, code), vehicles(stock_number, brand, model, year, trim), customers(name, phone, email), leads(name, phone, email)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(`quotation_number.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.branchId && filters.branchId !== "all") {
    query = query.eq("branch_id", filters.branchId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as QuotationRow[];
}

export async function getQuotationDetail(companyId: string, quotationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(
      "id, company_id, branch_id, quotation_number, customer_id, lead_id, vehicle_id, price, discount, tax, total, currency_code, valid_until, notes, salesperson_id, status, created_at, branches(name, code), vehicles(stock_number, brand, model, year, trim), customers(name, phone, email), leads(name, phone, email)",
    )
    .eq("company_id", companyId)
    .eq("id", quotationId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as QuotationRow;
}

export async function getQuotationReservations(companyId: string, quotationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("id, reservation_number, deposit_amount, currency_code, reservation_date, expiry_date, payment_status, agreement_signature_status, status")
    .eq("company_id", companyId)
    .eq("quotation_id", quotationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReservationRow[];
}

export async function getQuotationProformas(companyId: string, quotationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proforma_invoices")
    .select("id, proforma_number, export_destination, vehicle_price, shipping_estimate, additional_fees, tax, total, currency_code, status")
    .eq("company_id", companyId)
    .eq("quotation_id", quotationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProformaRow[];
}

export async function getQuotationInvoices(companyId: string, quotationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoices")
    .select("id, invoice_number, quotation_id, reservation_id, customer_id, vehicle_id, final_price, tax, total, paid_amount, balance_due, currency_code, due_date, invoice_status, created_at, branches(name, code), vehicles(stock_number, brand, model, year), customers(name, phone, email)")
    .eq("company_id", companyId)
    .eq("quotation_id", quotationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as InvoiceRow[];
}

export async function getInvoices(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoices")
    .select("id, invoice_number, quotation_id, reservation_id, customer_id, vehicle_id, final_price, tax, total, paid_amount, balance_due, currency_code, due_date, invoice_status, created_at, branches(name, code), vehicles(stock_number, brand, model, year), customers(name, phone, email)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as InvoiceRow[];
}

export async function getPaymentsForInvoices(companyId: string, invoiceIds: string[]) {
  if (invoiceIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, payment_number, related_invoice_id, reservation_id, payment_type, amount, currency_code, payment_method, payment_date, status, notes")
    .eq("company_id", companyId)
    .in("related_invoice_id", invoiceIds)
    .is("deleted_at", null)
    .order("payment_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PaymentRow[];
}

export function getSalesDashboardStats(quotations: QuotationRow[], reservations: ReservationRow[], invoices: InvoiceRow[]) {
  return getSalesStats({
    quotationsCount: quotations.length,
    reservationsCount: reservations.length,
    invoices,
  });
}

