import { z } from "zod";
import { makeDocumentNumber, makeSignatureRequestNumber } from "@/lib/documents/format";

export const documentCategories = [
  "vehicle_title",
  "export_certificate",
  "customs_certificate",
  "purchase_invoice",
  "sales_invoice",
  "proforma_invoice",
  "bill_of_lading",
  "certificate_of_origin",
  "insurance",
  "inspection_report",
  "customer_id_passport",
  "sales_contract",
  "reservation_agreement",
  "delivery_note",
  "signature",
  "other",
] as const;

export const documentStatuses = ["draft", "uploaded", "verified", "rejected", "expired", "archived"] as const;
export const documentEntityTypes = [
  "company",
  "branch",
  "vehicle",
  "customer",
  "lead",
  "quotation",
  "reservation",
  "proforma_invoice",
  "sales_invoice",
  "payment",
  "export_order",
  "import_order",
  "signature_request",
] as const;
export const verificationStatuses = ["pending", "verified", "rejected"] as const;
export const signatureRequestStatuses = ["draft", "sent", "viewed", "signed", "rejected", "expired"] as const;

const optionalUuid = z.string().uuid().optional();

export const createDocumentSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  documentNumber: z.string().trim().min(3).max(80).default(() => makeDocumentNumber()),
  category: z.enum(documentCategories),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
  storageBucket: z.string().trim().min(2).max(120).default("documents"),
  storagePath: z.string().trim().min(4).max(600),
  originalFileName: z.string().trim().max(240).optional(),
  mimeType: z.string().trim().min(3).max(120),
  fileSize: z.number().int().positive().max(30 * 1024 * 1024),
  expiresAt: z.string().date().optional(),
  entityType: z.enum(documentEntityTypes).optional(),
  entityId: optionalUuid,
}).refine((value) => Boolean(value.entityType) === Boolean(value.entityId), {
  message: "Entity type and entity id must be provided together.",
});

export const verifyDocumentSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(verificationStatuses),
  notes: z.string().trim().max(1000).optional(),
}).refine((value) => value.status !== "pending" || Boolean(value.notes), {
  message: "Pending verification requires notes.",
});

export const createSignatureRequestSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  requestNumber: z.string().trim().min(3).max(80).default(() => makeSignatureRequestNumber()),
  documentType: z.enum(documentCategories),
  title: z.string().trim().min(2).max(180),
  relatedCustomerId: optionalUuid,
  relatedVehicleId: optionalUuid,
  sourceDocumentId: optionalUuid,
  sentToName: z.string().trim().min(2).max(160),
  sentToEmail: z.string().trim().email().max(180).optional(),
  sentToPhone: z.string().trim().max(40).optional(),
  expiresAt: z.string().date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateSignatureRequestStatusSchema = z.object({
  signatureRequestId: z.string().uuid(),
  status: z.enum(signatureRequestStatuses),
  notes: z.string().trim().max(1000).optional(),
});

export const signDocumentSchema = z.object({
  signatureRequestId: z.string().uuid(),
  signedByName: z.string().trim().min(2).max(160),
  signatureImagePath: z.string().trim().min(4).max(600),
  signedDocumentPath: z.string().trim().min(4).max(600),
  ipAddress: z.string().trim().max(80).optional(),
  deviceInfo: z.string().trim().max(500).optional(),
});
