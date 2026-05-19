import { z } from "zod";

export const shippingMethods = ["ro_ro", "container", "land_transport", "air_freight"] as const;
export const shippingStatuses = [
  "waiting_booking",
  "booked",
  "vehicle_delivered_to_port",
  "loaded",
  "shipped",
  "arrived",
  "under_clearance",
  "delivered_to_customer",
] as const;
export const customsStatuses = [
  "not_started",
  "pending_documents",
  "submitted",
  "inspection",
  "duties_pending",
  "under_clearance",
  "cleared",
  "delayed",
  "rejected",
] as const;
export const exportDocumentStatuses = ["missing", "pending", "uploaded", "verified", "expired"] as const;
export const shipmentCostTypes = [
  "ocean_freight",
  "land_transport",
  "port_fee",
  "customs_duty",
  "inspection",
  "insurance",
  "handling",
  "storage",
  "other",
] as const;

const optionalUuid = z.string().uuid().optional();
const countryCode = z.string().trim().length(2).transform((value) => value.toUpperCase());

export const createExportOrderSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  customerId: optionalUuid,
  vehicleId: z.string().uuid(),
  salesInvoiceId: optionalUuid,
  proformaInvoiceId: optionalUuid,
  destinationCountryCode: countryCode,
  destinationPort: z.string().trim().min(2).max(120),
  shippingMethod: z.enum(shippingMethods),
  shippingCompanyId: optionalUuid,
  logisticsPartnerId: optionalUuid,
  bookingNumber: z.string().trim().max(120).optional(),
  containerNumber: z.string().trim().max(120).optional(),
  blNumber: z.string().trim().max(120).optional(),
  estimatedDepartureDate: z.string().date().optional(),
  estimatedArrivalDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const createImportOrderSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  supplierName: z.string().trim().min(2).max(160),
  originCountryCode: countryCode,
  originPort: z.string().trim().max(120).optional(),
  destinationCountryCode: countryCode.default("AE"),
  destinationPort: z.string().trim().max(120).optional(),
  shippingMethod: z.enum(shippingMethods),
  logisticsPartnerId: optionalUuid,
  vehicleCount: z.number().int().positive().default(1),
  estimatedDepartureDate: z.string().date().optional(),
  estimatedArrivalDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const createShippingEventSchema = z.object({
  exportOrderId: z.string().uuid().optional(),
  importOrderId: z.string().uuid().optional(),
  eventStatus: z.enum(shippingStatuses),
  eventDate: z.string().datetime(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
}).refine((value) => Boolean(value.exportOrderId) !== Boolean(value.importOrderId), {
  message: "Choose either an export order or an import order.",
});

export const updateCustomsClearanceSchema = z.object({
  exportOrderId: z.string().uuid().optional(),
  importOrderId: z.string().uuid().optional(),
  brokerId: optionalUuid,
  customsStatus: z.enum(customsStatuses),
  declarationNumber: z.string().trim().max(120).optional(),
  inspectionDate: z.string().date().optional(),
  clearedDate: z.string().date().optional(),
  dutiesAmount: z.number().min(0).default(0),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("AED"),
  notes: z.string().trim().max(1000).optional(),
}).refine((value) => Boolean(value.exportOrderId) !== Boolean(value.importOrderId), {
  message: "Choose either an export order or an import order.",
});

export const upsertExportDocumentSchema = z.object({
  exportOrderId: z.string().uuid(),
  documentType: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  status: z.enum(exportDocumentStatuses),
  isRequired: z.boolean().default(true),
  storageBucket: z.string().trim().max(120).optional(),
  storagePath: z.string().trim().max(500).optional(),
  expiresAt: z.string().date().optional(),
});

export const createShipmentCostSchema = z.object({
  exportOrderId: z.string().uuid().optional(),
  importOrderId: z.string().uuid().optional(),
  costType: z.enum(shipmentCostTypes),
  description: z.string().trim().min(2).max(240),
  amount: z.number().min(0),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("AED"),
  costDate: z.string().date(),
  supplierName: z.string().trim().max(160).optional(),
}).refine((value) => Boolean(value.exportOrderId) !== Boolean(value.importOrderId), {
  message: "Choose either an export order or an import order.",
});
