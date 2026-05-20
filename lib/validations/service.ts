import { z } from "zod";
import { calculateJobLaborAmount, calculateWarrantyClaimBalance } from "@/lib/service/calculations";

export const technicianStatuses = ["active", "inactive", "on_leave"] as const;
export const serviceOrderStatuses = ["draft", "scheduled", "checked_in", "in_progress", "quality_check", "completed", "cancelled"] as const;
export const serviceJobStatuses = ["pending", "assigned", "in_progress", "on_hold", "completed", "cancelled"] as const;
export const serviceLaborTypes = ["diagnosis", "repair", "inspection", "detailing", "warranty", "other"] as const;
export const serviceAppointmentStatuses = ["requested", "scheduled", "checked_in", "completed", "no_show", "cancelled"] as const;
export const inspectionResultStatuses = ["pass", "attention", "fail", "not_applicable"] as const;
export const warrantyClaimStatuses = ["draft", "submitted", "approved", "rejected", "paid", "cancelled"] as const;
export const servicePriorities = ["low", "normal", "high", "urgent"] as const;

const optionalUuid = z.string().uuid().optional();
const currencyCode = z.string().trim().length(3).transform((value) => value.toUpperCase());

function parseJson(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export const createTechnicianSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  displayName: z.string().trim().min(2).max(160),
  specialization: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(60).optional(),
  hourlyRate: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  status: z.enum(technicianStatuses).default("active"),
});

export const createServiceOrderSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  vehicleId: optionalUuid,
  customerId: optionalUuid,
  title: z.string().trim().min(2).max(180),
  complaint: z.string().trim().max(1000).optional(),
  odometer: z.number().int().min(0).optional(),
  priority: z.enum(servicePriorities).default("normal"),
  status: z.enum(serviceOrderStatuses).default("in_progress"),
  currencyCode: currencyCode.default("AED"),
  notes: z.string().trim().max(1000).optional(),
});

export const createServiceJobSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  technicianId: optionalUuid,
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
  laborType: z.enum(serviceLaborTypes).default("repair"),
  status: z.enum(serviceJobStatuses).default("assigned"),
  estimatedHours: z.number().min(0).default(0),
  actualHours: z.number().min(0).default(0),
  laborRate: z.number().min(0).default(0),
}).transform((value) => ({
  ...value,
  laborAmount: calculateJobLaborAmount({ hours: value.estimatedHours, hourlyRate: value.laborRate }),
}));

export const createServiceLaborLineSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  serviceJobId: optionalUuid,
  technicianId: optionalUuid,
  laborType: z.enum(serviceLaborTypes).default("repair"),
  description: z.string().trim().min(2).max(240),
  hours: z.number().min(0),
  hourlyRate: z.number().min(0),
});

export const createInspectionChecklistSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  name: z.string().trim().min(2).max(160),
  checklistType: z.string().trim().min(2).max(80).default("vehicle_health"),
  items: z.string().transform((value) => {
    const parsed = parseJson(value);
    return Array.isArray(parsed) ? parsed : [];
  }),
});

export const createInspectionResultSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  checklistId: optionalUuid,
  vehicleId: optionalUuid,
  technicianId: optionalUuid,
  overallStatus: z.enum(inspectionResultStatuses).default("pass"),
  scorePercent: z.number().min(0).max(100).default(100),
  results: z.string().transform(parseJson).default("{}"),
  notes: z.string().trim().max(1000).optional(),
});

export const createWarrantyClaimSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  serviceOrderId: optionalUuid,
  vehicleId: optionalUuid,
  customerId: optionalUuid,
  providerName: z.string().trim().min(2).max(160),
  claimAmount: z.number().min(0).default(0),
  approvedAmount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  status: z.enum(warrantyClaimStatuses).default("draft"),
  notes: z.string().trim().max(1000).optional(),
}).transform((value) => ({
  ...value,
  claimBalance: calculateWarrantyClaimBalance({
    claimAmount: value.claimAmount,
    approvedAmount: value.approvedAmount,
    paidAmount: value.paidAmount,
  }),
}));

export const createServiceAppointmentSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  vehicleId: optionalUuid,
  customerId: optionalUuid,
  title: z.string().trim().min(2).max(180),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime().optional(),
  status: z.enum(serviceAppointmentStatuses).default("scheduled"),
  notes: z.string().trim().max(1000).optional(),
});
