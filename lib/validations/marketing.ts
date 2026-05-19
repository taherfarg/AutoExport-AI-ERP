import { z } from "zod";
import { makeMarketingNumber } from "@/lib/marketing/format";

export const marketingListingStatuses = ["draft", "active", "paused", "sold", "archived"] as const;
export const marketingChannelTypes = [
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "whatsapp",
  "marketplace",
  "export_portal",
  "other",
] as const;
export const socialPostStatuses = ["draft", "scheduled", "published", "failed", "archived"] as const;
export const campaignStatuses = ["draft", "active", "paused", "completed", "cancelled"] as const;
export const contentCalendarStatuses = ["planned", "scheduled", "published", "cancelled"] as const;

const optionalUuid = z.string().uuid().optional();
const currencyCode = z.string().trim().length(3).transform((value) => value.toUpperCase());
const hashtags = z.union([
  z.array(z.string().trim().min(1).max(80)),
  z.string().transform((value) =>
    value
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
]);

export const createMarketingListingSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  vehicleId: z.string().uuid(),
  channelId: optionalUuid,
  listingNumber: z.string().trim().min(3).max(80).default(() => makeMarketingNumber("LST")),
  title: z.string().trim().min(2).max(180),
  shortDescription: z.string().trim().max(500).optional(),
  fullDescription: z.string().trim().max(3000).optional(),
  specifications: z.record(z.string(), z.unknown()).default({}),
  price: z.number().min(0),
  currencyCode: currencyCode.default("AED"),
  exportAvailable: z.boolean().default(false),
  status: z.enum(marketingListingStatuses).default("draft"),
  externalUrl: z.string().trim().url().optional(),
});

export const createSocialPostSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  vehicleId: optionalUuid,
  listingId: optionalUuid,
  campaignId: optionalUuid,
  channelId: optionalUuid,
  postNumber: z.string().trim().min(3).max(80).default(() => makeMarketingNumber("POST")),
  channelType: z.enum(marketingChannelTypes),
  caption: z.string().trim().min(5).max(3000),
  hashtags: hashtags.default([]),
  callToAction: z.string().trim().max(240).optional(),
  script: z.string().trim().max(3000).optional(),
  mediaNotes: z.string().trim().max(1000).optional(),
  status: z.enum(socialPostStatuses).default("draft"),
  scheduledAt: z.string().datetime().optional(),
  externalUrl: z.string().trim().url().optional(),
}).refine((value) => Boolean(value.vehicleId) || Boolean(value.listingId), {
  message: "Choose a vehicle or listing for the social post.",
});

export const createCampaignSchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  channelId: optionalUuid,
  campaignNumber: z.string().trim().min(3).max(80).default(() => makeMarketingNumber("CMP")),
  name: z.string().trim().min(2).max(180),
  objective: z.string().trim().min(2).max(120).default("lead_generation"),
  status: z.enum(campaignStatuses).default("draft"),
  budget: z.number().min(0).default(0),
  spend: z.number().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  impressions: z.number().int().min(0).default(0),
  clicks: z.number().int().min(0).default(0),
  leads: z.number().int().min(0).default(0),
  conversions: z.number().int().min(0).default(0),
  notes: z.string().trim().max(1000).optional(),
});

export const createContentCalendarEntrySchema = z.object({
  companyId: z.string().uuid(),
  branchId: optionalUuid,
  listingId: optionalUuid,
  socialPostId: optionalUuid,
  campaignId: optionalUuid,
  title: z.string().trim().min(2).max(180),
  calendarDate: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(contentCalendarStatuses).default("planned"),
  ownerProfileId: optionalUuid,
  notes: z.string().trim().max(1000).optional(),
});

export const upsertLeadSourceSchema = z.object({
  companyId: z.string().uuid(),
  sourceKey: z.string().trim().min(2).max(80).transform((value) => value.toLowerCase().replace(/[^a-z0-9_]+/g, "_")),
  name: z.string().trim().min(2).max(120),
  channelType: z.enum(marketingChannelTypes).default("other"),
  monthlyLeads: z.number().int().min(0).default(0),
  monthlySpend: z.number().min(0).default(0),
  monthlyConversions: z.number().int().min(0).default(0),
  currencyCode: currencyCode.default("AED"),
  active: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional(),
});
