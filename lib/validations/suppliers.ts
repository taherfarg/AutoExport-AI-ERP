import { z } from "zod";

export const supplierCategories = [
  "parts",
  "vehicle_supplier",
  "logistics",
  "service",
  "marketing",
  "finance",
  "general_vendor",
] as const;

export const supplierStatuses = ["active", "on_hold", "inactive", "archived"] as const;

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalUuid = z
  .string()
  .uuid()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const countryCode = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase())
  .optional();

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())
  .default("AED");

export const createSupplierSchema = z.object({
  companyId: z.string().uuid(),
  supplierName: z.string().trim().min(2).max(180),
  legalName: optionalString,
  category: z.enum(supplierCategories).default("general_vendor"),
  status: z.enum(supplierStatuses).default("active"),
  countryCode,
  city: optionalString,
  contactName: optionalString,
  email: z.string().trim().email().optional(),
  phone: optionalString,
  website: optionalString,
  taxRegistrationNumber: optionalString,
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  currencyCode,
  bankName: optionalString,
  bankAccountName: optionalString,
  iban: optionalString,
  swiftCode: optionalString,
  notes: optionalString,
});

export const createSupplierLinkedPayableSchema = z.object({
  companyId: z.string().uuid(),
  supplierId: z.string().uuid(),
  branchId: z.string().uuid(),
  vehicleId: optionalUuid,
  exportOrderId: optionalUuid,
  importOrderId: optionalUuid,
  description: z.string().trim().min(2).max(240),
  amount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  currencyCode,
  dueDate: z.string().date().optional(),
});
