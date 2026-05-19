import { z } from "zod";

export const quotationStatuses = ["draft", "sent", "accepted", "rejected", "expired", "converted"] as const;
export const reservationStatuses = ["active", "expired", "cancelled", "converted"] as const;
export const proformaStatuses = ["draft", "sent", "accepted", "cancelled", "converted"] as const;
export const invoiceStatuses = ["draft", "sent", "partial_payment", "paid", "cancelled", "overdue"] as const;
export const paymentTypes = ["deposit", "final_payment", "partial_payment", "refund"] as const;
export const paymentMethods = ["cash", "bank_transfer", "card", "cheque", "online_payment", "crypto_placeholder"] as const;

const optionalUuid = z.string().uuid().optional();

export const quotationIdSchema = z.object({
  quotationId: z.string().uuid(),
});

export const createQuotationSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  leadId: optionalUuid,
  customerId: optionalUuid,
  vehicleId: z.string().uuid(),
  price: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  currencyCode: z.string().length(3),
  validUntil: z.string().date(),
  notes: z.string().max(2000).optional(),
  salespersonId: optionalUuid,
});

export const createReservationSchema = quotationIdSchema.extend({
  depositAmount: z.number().min(0),
  expiryDate: z.string().date(),
});

export const createProformaSchema = quotationIdSchema.extend({
  exportDestination: z.string().max(120).optional(),
  shippingEstimate: z.number().min(0).default(0),
  additionalFees: z.number().min(0).default(0),
  paymentTerms: z.string().max(1000).optional(),
});

export const createSalesInvoiceSchema = quotationIdSchema.extend({
  dueDate: z.string().date(),
  tax: z.number().min(0).default(0),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  reservationId: optionalUuid,
  amount: z.number().positive(),
  paymentType: z.enum(paymentTypes),
  paymentMethod: z.enum(paymentMethods),
  paymentDate: z.string().date(),
  notes: z.string().max(1000).optional(),
});

