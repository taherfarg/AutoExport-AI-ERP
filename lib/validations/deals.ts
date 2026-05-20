import { z } from "zod";

const optionalUuid = z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional());
const optionalText = z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().trim().optional());
const money = z.coerce.number().min(0);

export const dealTypes = ["cash", "finance", "lease"] as const;
export const dealStatuses = ["draft", "submitted", "approved", "rejected", "contracted", "funded", "cancelled"] as const;
export const financeApplicationStatuses = ["draft", "submitted", "conditionally_approved", "approved", "declined", "funded", "cancelled"] as const;
export const lenderSubmissionStatuses = ["queued", "sent", "acknowledged", "approved", "declined", "error"] as const;
export const dealApprovalStatuses = ["pending", "approved", "rejected", "cancelled"] as const;

export const createLenderSchema = z.object({
  companyId: z.uuid(),
  branchId: optionalUuid,
  name: z.string().trim().min(2),
  lenderType: z.enum(["bank", "finance_company", "in_house", "broker"]),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  contactEmail: optionalText,
  contactPhone: optionalText,
  baseRate: money,
});

export const createInsuranceProductSchema = z.object({
  companyId: z.uuid(),
  name: z.string().trim().min(2),
  providerName: z.string().trim().min(2),
  premiumAmount: money,
  costAmount: money,
  commissionAmount: money,
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});

export const createWarrantyProductSchema = z.object({
  companyId: z.uuid(),
  name: z.string().trim().min(2),
  providerName: z.string().trim().min(2),
  coverageMonths: z.coerce.number().int().positive(),
  coverageKm: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().positive().optional()),
  retailAmount: money,
  costAmount: money,
  commissionAmount: money,
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});

export const createDealSchema = z.object({
  companyId: z.uuid(),
  branchId: z.uuid(),
  quotationId: optionalUuid,
  reservationId: optionalUuid,
  vehicleId: z.uuid(),
  customerId: optionalUuid,
  leadId: optionalUuid,
  dealType: z.enum(dealTypes),
  vehiclePrice: money,
  productTotal: money,
  downPayment: money,
  tradeInValue: money,
  termMonths: z.coerce.number().int().positive(),
  annualInterestRate: money,
  balloonPayment: money,
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  notes: optionalText,
});

export const createDealProductSchema = z.object({
  companyId: z.uuid(),
  dealId: z.uuid(),
  productType: z.string().trim().min(2),
  name: z.string().trim().min(2),
  sellingPrice: money,
  costAmount: money,
});

export const createFinanceApplicationSchema = z.object({
  companyId: z.uuid(),
  dealId: z.uuid(),
  lenderId: optionalUuid,
  applicantName: z.string().trim().min(2),
  applicantEmail: optionalText,
  applicantPhone: optionalText,
  employmentStatus: optionalText,
  annualIncome: money,
});

export const createLenderSubmissionSchema = z.object({
  companyId: z.uuid(),
  financeApplicationId: z.uuid(),
  lenderId: z.uuid(),
});

export const createDealApprovalSchema = z.object({
  companyId: z.uuid(),
  dealId: z.uuid(),
  approvalType: z.string().trim().min(2),
  notes: optionalText,
});

export const decideDealApprovalSchema = z.object({
  companyId: z.uuid(),
  approvalId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: optionalText,
});
