"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeDocumentNumber } from "@/lib/sales/format";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createProformaSchema,
  createQuotationSchema,
  createReservationSchema,
  createSalesInvoiceSchema,
  recordPaymentSchema,
} from "@/lib/validations/sales";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return Number(value);
}

async function getQuotationForWorkspace(quotationId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("id, company_id, branch_id, customer_id, lead_id, vehicle_id, total, price, currency_code")
    .eq("id", quotationId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Quotation was not found.");
  }

  return data;
}

async function getInvoiceForWorkspace(invoiceId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sales_invoices")
    .select("id, company_id, branch_id, customer_id, vehicle_id, reservation_id, quotation_id, currency_code")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Invoice was not found.");
  }

  return data;
}

export async function createQuotation(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createQuotationSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    leadId: formOptional(formData.get("leadId")),
    customerId: formOptional(formData.get("customerId")),
    vehicleId: formData.get("vehicleId"),
    price: formNumber(formData.get("price")),
    discount: formNumber(formData.get("discount")),
    tax: formNumber(formData.get("tax")),
    currencyCode: (formData.get("currencyCode") || "AED").toString().toUpperCase(),
    validUntil: formData.get("validUntil"),
    notes: formOptional(formData.get("notes")),
    salespersonId: formOptional(formData.get("salespersonId")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    throw new Error("Quotation details are invalid.");
  }

  const supabase = await createClient();
  const { data: quotation, error } = await supabase
    .from("quotations")
    .insert({
      company_id: parsed.data.companyId,
      branch_id: parsed.data.branchId,
      quotation_number: makeDocumentNumber("Q"),
      lead_id: parsed.data.leadId,
      customer_id: parsed.data.customerId,
      vehicle_id: parsed.data.vehicleId,
      price: parsed.data.price,
      discount: parsed.data.discount,
      tax: parsed.data.tax,
      currency_code: parsed.data.currencyCode,
      valid_until: parsed.data.validUntil,
      notes: parsed.data.notes,
      salesperson_id: parsed.data.salespersonId ?? workspace.profileId,
      status: "sent",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !quotation) {
    throw new Error(error?.message ?? "Quotation could not be created.");
  }

  await supabase.from("quotation_items").insert({
    company_id: parsed.data.companyId,
    quotation_id: quotation.id,
    vehicle_id: parsed.data.vehicleId,
    description: "Vehicle sale price",
    quantity: 1,
    unit_price: parsed.data.price,
    discount: parsed.data.discount,
    tax: parsed.data.tax,
  });

  revalidatePath("/sales/quotations");
  redirect(`/sales/quotations/${quotation.id}`);
}

export async function createReservationFromQuotation(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createReservationSchema.safeParse({
    quotationId: formData.get("quotationId"),
    depositAmount: formNumber(formData.get("depositAmount")),
    expiryDate: formData.get("expiryDate"),
  });

  if (!parsed.success) {
    return { error: "Reservation details are invalid." };
  }

  const quotation = await getQuotationForWorkspace(parsed.data.quotationId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("reservations").insert({
    company_id: workspace.companyId,
    branch_id: quotation.branch_id,
    reservation_number: makeDocumentNumber("R"),
    quotation_id: quotation.id,
    lead_id: quotation.lead_id,
    customer_id: quotation.customer_id,
    vehicle_id: quotation.vehicle_id,
    deposit_amount: parsed.data.depositAmount,
    currency_code: quotation.currency_code,
    expiry_date: parsed.data.expiryDate,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${quotation.id}`);
  revalidatePath(`/vehicles/${quotation.vehicle_id}`);
}

export async function createProformaFromQuotation(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createProformaSchema.safeParse({
    quotationId: formData.get("quotationId"),
    exportDestination: formOptional(formData.get("exportDestination")),
    shippingEstimate: formNumber(formData.get("shippingEstimate")),
    additionalFees: formNumber(formData.get("additionalFees")),
    paymentTerms: formOptional(formData.get("paymentTerms")),
  });

  if (!parsed.success) {
    return { error: "Proforma details are invalid." };
  }

  const quotation = await getQuotationForWorkspace(parsed.data.quotationId, workspace.companyId);
  const supabase = await createClient();
  const { data: proforma, error } = await supabase
    .from("proforma_invoices")
    .insert({
      company_id: workspace.companyId,
      branch_id: quotation.branch_id,
      proforma_number: makeDocumentNumber("PI"),
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      lead_id: quotation.lead_id,
      vehicle_id: quotation.vehicle_id,
      export_destination: parsed.data.exportDestination,
      vehicle_price: quotation.total,
      shipping_estimate: parsed.data.shippingEstimate,
      additional_fees: parsed.data.additionalFees,
      currency_code: quotation.currency_code,
      payment_terms: parsed.data.paymentTerms,
      status: "sent",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !proforma) {
    return { error: error?.message ?? "Proforma could not be created." };
  }

  await supabase.from("proforma_invoice_items").insert({
    company_id: workspace.companyId,
    proforma_invoice_id: proforma.id,
    description: "Vehicle sale price",
    quantity: 1,
    unit_price: quotation.total,
  });

  revalidatePath(`/sales/quotations/${quotation.id}`);
}

export async function createInvoiceFromQuotation(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createSalesInvoiceSchema.safeParse({
    quotationId: formData.get("quotationId"),
    dueDate: formData.get("dueDate"),
    tax: formNumber(formData.get("tax")),
  });

  if (!parsed.success) {
    return { error: "Invoice details are invalid." };
  }

  const quotation = await getQuotationForWorkspace(parsed.data.quotationId, workspace.companyId);
  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("sales_invoices")
    .insert({
      company_id: workspace.companyId,
      branch_id: quotation.branch_id,
      invoice_number: makeDocumentNumber("INV"),
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      lead_id: quotation.lead_id,
      vehicle_id: quotation.vehicle_id,
      final_price: quotation.total,
      tax: parsed.data.tax,
      currency_code: quotation.currency_code,
      due_date: parsed.data.dueDate,
      invoice_status: "sent",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return { error: error?.message ?? "Invoice could not be created." };
  }

  await supabase.from("sales_invoice_items").insert({
    company_id: workspace.companyId,
    sales_invoice_id: invoice.id,
    description: "Vehicle sale price",
    quantity: 1,
    unit_price: quotation.total,
  });

  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/quotations/${quotation.id}`);
}

export async function recordPayment(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = recordPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reservationId: formOptional(formData.get("reservationId")),
    amount: formNumber(formData.get("amount")),
    paymentType: formData.get("paymentType") || "partial_payment",
    paymentMethod: formData.get("paymentMethod") || "cash",
    paymentDate: formData.get("paymentDate"),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "Payment details are invalid." };
  }

  const invoice = await getInvoiceForWorkspace(parsed.data.invoiceId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    company_id: workspace.companyId,
    branch_id: invoice.branch_id,
    payment_number: makeDocumentNumber("PAY"),
    customer_id: invoice.customer_id,
    vehicle_id: invoice.vehicle_id,
    related_invoice_id: invoice.id,
    reservation_id: parsed.data.reservationId ?? invoice.reservation_id,
    payment_type: parsed.data.paymentType,
    amount: parsed.data.amount,
    currency_code: invoice.currency_code,
    payment_method: parsed.data.paymentMethod,
    payment_date: parsed.data.paymentDate,
    status: "completed",
    received_by: workspace.profileId,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sales/invoices");
  revalidatePath("/sales/quotations");
  if (invoice.quotation_id) {
    revalidatePath(`/sales/quotations/${invoice.quotation_id}`);
  }
}
