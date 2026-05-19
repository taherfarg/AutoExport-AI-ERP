import { z } from "zod";
import { makeOperationsNumber } from "@/lib/operations/format";

export const reportTypes = ["inventory", "sales", "profit", "export", "marketing", "branch", "custom"] as const;
export const reportExportFormats = ["csv", "pdf", "excel", "email"] as const;
export const reportScheduleFrequencies = ["daily", "weekly", "monthly"] as const;
export const alertTypes = [
  "vehicle_reserved_but_deposit_not_paid",
  "customer_payment_overdue",
  "export_documents_missing",
  "shipment_delayed",
  "customs_clearance_pending",
  "vehicle_margin_too_low",
  "vehicle_stock_aging_over_60_days",
  "supplier_payment_due",
  "car_preparation_delayed",
  "new_lead_not_contacted",
  "contract_waiting_signature",
  "insurance_expiring",
  "registration_renewal_due",
  "marketing_campaign_underperforming",
  "branch_sales_target_not_reached",
  "manual",
] as const;
export const alertPriorities = ["low", "medium", "high", "critical"] as const;
export const alertStatuses = ["open", "assigned", "snoozed", "resolved", "dismissed"] as const;
export const taskStatuses = ["open", "in_progress", "blocked", "completed", "cancelled"] as const;
export const reminderStatuses = ["pending", "sent", "snoozed", "completed", "cancelled"] as const;
export const chatThreadTypes = ["sales_team", "export_team", "branch", "vehicle", "customer", "internal_support", "ai_assistant"] as const;

const optionalUuid = z.string().uuid().optional();
const optionalDateTime = z.string().trim().min(1).optional();

export const createReportExportSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  savedReportId: optionalUuid,
  exportNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("EXP")),
  reportType: z.enum(reportTypes).default("custom"),
  exportFormat: z.enum(reportExportFormats).default("csv"),
  filters: z.record(z.string(), z.unknown()).default({}),
});

export const createReportScheduleSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  savedReportId: z.string().uuid(),
  scheduleNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("SCH")),
  name: z.string().trim().min(2).max(160),
  frequency: z.enum(reportScheduleFrequencies).default("weekly"),
  runTime: z.string().trim().min(4).max(8).default("09:00"),
  timezone: z.string().trim().min(2).max(80).default("Asia/Dubai"),
  recipients: z.array(z.string().email()).default([]),
});

export const createAlertSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  alertNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("ALT")),
  alertType: z.enum(alertTypes).default("manual"),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
  priority: z.enum(alertPriorities).default("medium"),
  status: z.enum(alertStatuses).default("open"),
  assignedTo: optionalUuid,
  dueAt: optionalDateTime,
});

export const updateAlertSchema = z.object({
  alertId: z.string().uuid(),
  status: z.enum(alertStatuses),
  resolutionNotes: z.string().trim().max(1000).optional(),
  snoozedUntil: optionalDateTime,
});

export const createTaskSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  alertId: optionalUuid,
  taskNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("TSK")),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(taskStatuses).default("open"),
  priority: z.enum(alertPriorities).default("medium"),
  assignedTo: optionalUuid,
  dueAt: optionalDateTime,
});

export const createReminderSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  reminderNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("REM")),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
  remindAt: z.string().trim().min(1),
  assignedTo: optionalUuid,
});

export const createChatThreadSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  threadNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("CHT")),
  threadType: z.enum(chatThreadTypes).default("internal_support"),
  title: z.string().trim().min(2).max(180),
});

export const createChatMessageSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  threadId: z.string().uuid(),
  messageNumber: z.string().trim().min(3).max(80).default(() => makeOperationsNumber("MSG")),
  body: z.string().trim().min(1).max(4000),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});
