import { z } from "zod";
import { calculateCommissionAmount } from "@/lib/finance/calculations";

export const financeExpenseCategories = [
  "purchase",
  "shipping",
  "customs",
  "transport",
  "inspection",
  "repair",
  "detailing",
  "marketing",
  "commission",
  "branch_overhead",
  "supplier",
  "other",
] as const;

export const financeRecordStatuses = ["draft", "open", "partial", "paid", "overdue", "cancelled"] as const;
export const financeCommissionStatuses = ["pending", "approved", "paid", "cancelled"] as const;

const optionalUuid = z.string().uuid().optional();
const currencyCode = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const createExpenseSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  supplierId: optionalUuid,
  vehicleId: optionalUuid,
  exportOrderId: optionalUuid,
  importOrderId: optionalUuid,
  category: z.enum(financeExpenseCategories),
  description: z.string().trim().min(2).max(240),
  amount: z.number().min(0),
  currencyCode: currencyCode.default("AED"),
  expenseDate: z.string().date(),
  supplierName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const createPayableSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  supplierId: optionalUuid,
  vehicleId: optionalUuid,
  exportOrderId: optionalUuid,
  importOrderId: optionalUuid,
  supplierName: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(2).max(240),
  amount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  balanceDue: z.number().min(0).optional(),
  currencyCode: currencyCode.default("AED"),
  dueDate: z.string().date().optional(),
}).transform((value) => ({
  ...value,
  supplierName: value.supplierName ?? "",
  balanceDue: Math.max(Math.round((value.amount - value.paidAmount) * 100) / 100, 0),
}));

export const createReceivableSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  customerId: optionalUuid,
  vehicleId: optionalUuid,
  salesInvoiceId: optionalUuid,
  description: z.string().trim().min(2).max(240),
  amount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  dueDate: z.string().date().optional(),
});

export const createVehicleProfitSnapshotSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  salesInvoiceId: optionalUuid,
  snapshotDate: z.string().date(),
  sellingPrice: z.number().min(0),
  totalLandedCost: z.number().min(0),
  financeExpenses: z.number().min(0).default(0),
  shipmentCosts: z.number().min(0).default(0),
  commissionAmount: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  notes: z.string().trim().max(1000).optional(),
});

export const createSalespersonCommissionSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  salespersonId: optionalUuid,
  salesInvoiceId: optionalUuid,
  vehicleId: optionalUuid,
  basisAmount: z.number().min(0),
  commissionRate: z.number().min(0).max(100),
  commissionAmount: z.number().min(0).optional(),
  currencyCode: currencyCode.default("AED"),
  status: z.enum(financeCommissionStatuses).default("pending"),
  notes: z.string().trim().max(1000).optional(),
}).transform((value) => ({
  ...value,
  commissionAmount: value.commissionAmount ?? calculateCommissionAmount({
    basisAmount: value.basisAmount,
    commissionRate: value.commissionRate,
  }),
}));
