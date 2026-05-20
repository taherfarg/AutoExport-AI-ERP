import { z } from "zod";
import { calculatePartLineTotals } from "@/lib/parts/calculations";

export const partStatuses = ["active", "inactive", "archived"] as const;
export const partStockStatuses = ["in_stock", "low_stock", "out_of_stock", "reserved"] as const;
export const partOrderStatuses = ["draft", "ordered", "partially_received", "received", "cancelled"] as const;
export const partTransferStatuses = ["draft", "in_transit", "received", "cancelled"] as const;
export const partReceiptStatuses = ["draft", "posted", "cancelled"] as const;
export const servicePartLineStatuses = ["reserved", "used", "returned", "cancelled"] as const;
export const partReorderAlertStatuses = ["open", "ordered", "resolved", "cancelled"] as const;

const optionalUuid = z.string().uuid().optional();
const currencyCode = z.string().trim().length(3).transform((value) => value.toUpperCase());
const countryCode = z.string().trim().length(2).transform((value) => value.toUpperCase()).optional();
const partNumber = z.string().trim().min(2).max(80).transform((value) => value.toUpperCase());

export const createPartSupplierSchema = z.object({
  companyId: z.string().uuid(),
  supplierName: z.string().trim().min(2).max(180),
  countryCode,
  contactName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(60).optional(),
  status: z.enum(partStatuses).default("active"),
});

export const createPartSchema = z.object({
  companyId: z.string().uuid(),
  partNumber,
  sku: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  compatibleBrands: z.array(z.string().trim().min(1)).default([]),
  compatibleModels: z.array(z.string().trim().min(1)).default([]),
  unitCost: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  status: z.enum(partStatuses).default("active"),
  reorderPoint: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0).default(0),
});

export const createPartPurchaseOrderSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  supplierId: optionalUuid,
  status: z.enum(partOrderStatuses).default("ordered"),
  orderDate: z.string().date().optional(),
  expectedDate: z.string().date().optional(),
  taxAmount: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  notes: z.string().trim().max(1000).optional(),
});

export const createPartPurchaseOrderItemSchema = z.object({
  companyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  partId: z.string().uuid(),
  description: z.string().trim().max(240).optional(),
  quantityOrdered: z.number().min(0),
  unitCost: z.number().min(0),
}).transform((value) => ({
  ...value,
  lineTotal: calculatePartLineTotals({
    quantity: value.quantityOrdered,
    unitCost: value.unitCost,
    sellingPrice: value.unitCost,
  }).lineCost,
}));

export const createPartReceiptSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  purchaseOrderId: optionalUuid,
  purchaseOrderItemId: optionalUuid,
  partId: z.string().uuid(),
  quantityReceived: z.number().positive(),
  unitCost: z.number().min(0),
  status: z.enum(partReceiptStatuses).default("posted"),
  notes: z.string().trim().max(1000).optional(),
});

export const createPartTransferSchema = z.object({
  companyId: z.string().uuid(),
  partId: z.string().uuid(),
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  quantity: z.number().positive(),
  status: z.enum(partTransferStatuses).default("received"),
  notes: z.string().trim().max(1000).optional(),
});

export const createServicePartLineSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  serviceJobId: optionalUuid,
  partId: z.string().uuid(),
  description: z.string().trim().min(2).max(240),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  status: z.enum(servicePartLineStatuses).default("used"),
}).transform((value) => ({
  ...value,
  totals: calculatePartLineTotals({
    quantity: value.quantity,
    unitCost: value.unitCost,
    sellingPrice: value.sellingPrice,
  }),
}));
