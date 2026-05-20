import { z } from "zod";
import { makeAiNumber } from "@/lib/ai/format";

export const aiRequestStatuses = ["pending", "completed", "failed", "approval_required"] as const;
export const aiActionStatuses = ["proposed", "executed", "failed", "blocked", "approval_required"] as const;
export const aiApprovalStatuses = ["pending", "approved", "rejected", "expired"] as const;
export const aiReportStatuses = ["draft", "queued", "completed", "failed"] as const;
export const aiExtractionStatuses = ["queued", "processing", "completed", "failed"] as const;

const optionalUuid = z.string().uuid().optional();

export const askAiSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  conversationId: optionalUuid,
  prompt: z.string().trim().min(3).max(2000),
});

export const createAiReportRequestSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  reportNumber: z.string().trim().min(3).max(80).default(() => makeAiNumber("AIR")),
  reportType: z.string().trim().min(2).max(80),
  prompt: z.string().trim().min(5).max(2000),
  filters: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(aiReportStatuses).default("draft"),
});

export const createAiExtractionRequestSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  documentId: optionalUuid,
  extractionNumber: z.string().trim().min(3).max(80).default(() => makeAiNumber("AIX")),
  documentType: z.string().trim().min(2).max(120),
});

export const aiApprovalDecisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(1000).optional(),
});

export const automationAgentSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  agentType: z.enum(["crm_follow_up", "parts_reorder", "vehicle_marketing"]),
  isEnabled: z.boolean().default(false),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const documentExtractionSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  filePath: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileType: z.string().trim().min(1),
  documentType: z.string().trim().min(1),
  status: z.enum(["pending", "completed", "failed"]).default("pending"),
  extractedData: z.record(z.string(), z.unknown()).default({}),
  rawText: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});

export const automationProposalSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  agentId: z.string().uuid().optional().nullable(),
  proposalType: z.enum(["lead_follow_up", "parts_reorder", "vehicle_marketing"]),
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(3),
  justification: z.string().trim().min(3),
  proposedPayload: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["pending", "approved", "dismissed", "failed"]).default("pending"),
  resolvedBy: z.string().uuid().optional().nullable(),
  resolvedAt: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});
