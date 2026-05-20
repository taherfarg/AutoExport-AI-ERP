import { z } from "zod";

export const customerTypes = ["individual", "dealer", "company", "export_buyer"] as const;
export const leadStatuses = [
  "new",
  "contacted",
  "interested",
  "quotation_sent",
  "reserved",
  "negotiation",
  "won",
  "lost",
] as const;
export const leadSources = [
  "instagram",
  "facebook",
  "tiktok",
  "website",
  "whatsapp",
  "linkedin",
  "referral",
  "showroom_visit",
  "export_inquiry",
] as const;
export const followUpPriorities = ["low", "normal", "high", "urgent"] as const;
export const messageDirections = ["inbound", "outbound", "internal"] as const;
export const messageChannels = [
  "phone",
  "whatsapp",
  "email",
  "sms",
  "instagram",
  "facebook",
  "website",
  "showroom",
  "internal",
] as const;


const optionalUuid = z.string().uuid().optional();

export const leadIdSchema = z.object({
  leadId: z.string().uuid(),
});

export const createCustomerSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  customerType: z.enum(customerTypes),
  name: z.string().min(2).max(160),
  phone: z.string().max(40).optional(),
  whatsapp: z.string().max(40).optional(),
  email: z.string().email().optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().max(80).optional(),
  preferredLanguage: z.string().min(2).max(10),
  notes: z.string().max(2000).optional(),
});

export const createLeadSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: z.string().min(2).max(160),
  customerType: z.enum(customerTypes),
  phone: z.string().max(40).optional(),
  whatsapp: z.string().max(40).optional(),
  email: z.string().email().optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().max(80).optional(),
  preferredBrand: z.string().max(80).optional(),
  preferredModel: z.string().max(80).optional(),
  budget: z.number().min(0).optional(),
  currencyCode: z.string().length(3),
  language: z.string().min(2).max(10),
  leadSource: z.enum(leadSources),
  assignedSalespersonId: optionalUuid,
  notes: z.string().max(2000).optional(),
});

export const updateLeadStatusSchema = leadIdSchema.extend({
  status: z.enum(leadStatuses),
});

export const createFollowUpSchema = leadIdSchema.extend({
  title: z.string().min(2).max(160),
  notes: z.string().max(1000).optional(),
  dueAt: z.string().datetime(),
  priority: z.enum(followUpPriorities),
  assignedTo: optionalUuid,
});

export const logLeadMessageSchema = leadIdSchema.extend({
  direction: z.enum(messageDirections),
  channel: z.enum(messageChannels),
  subject: z.string().max(160).optional(),
  body: z.string().min(2).max(3000),
});

export const providerTypes = ["whatsapp", "email", "sms"] as const;
export const outboundMessageStatuses = [
  "draft",
  "pending_approval",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

export const providerSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  providerType: z.enum(providerTypes),
  providerName: z.string().min(2).max(100),
  config: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
});

export const templateSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  name: z.string().min(2).max(100),
  channel: z.enum(messageChannels),
  subject: z.string().max(200).optional(),
  body: z.string().min(2).max(5000),
  variables: z.array(z.string()).default([]),
  language: z.string().min(2).max(10).default("en"),
  isActive: z.boolean().default(true),
});

export const consentSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  channel: z.enum(messageChannels),
  isGranted: z.boolean(),
  consentSource: z.string().min(2).max(100).default("verbal"),
});

export const outboundMessageSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  channel: z.enum(messageChannels),
  recipientAddress: z.string().min(2).max(200),
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(outboundMessageStatuses).default("draft"),
});


