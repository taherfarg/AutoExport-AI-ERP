import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { calculateCampaignPerformance } from "@/lib/marketing/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { summarizeSyncJobs } from "@/lib/marketing/marketplace";

export type MarketingPermissions = {
  canManageMarketing: boolean;
};

export type ListingChannelRow = {
  id: string;
  channel_key: string;
  name: string;
  channel_type: string;
  active: boolean;
};

export type MarketingVehicleOption = {
  id: string;
  branch_id: string;
  stock_number: string;
  brand: string;
  model: string;
  year: number;
  trim: string | null;
  mileage: number;
  condition: string;
  selling_price: number;
  currency_code: string;
  export_available: boolean;
};

export type MarketingListingRow = {
  id: string;
  branch_id: string | null;
  vehicle_id: string;
  channel_id: string | null;
  listing_number: string;
  title: string;
  short_description: string | null;
  price: number;
  currency_code: string;
  export_available: boolean;
  status: string;
  external_url: string | null;
  lead_count: number;
  published_at: string | null;
  created_at: string;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
  listing_channels: { name: string; channel_type: string } | null;
  branches: { name: string; code: string } | null;
};

export type SocialPostRow = {
  id: string;
  vehicle_id: string | null;
  listing_id: string | null;
  campaign_id: string | null;
  channel_id: string | null;
  post_number: string;
  channel_type: string;
  caption: string;
  hashtags: string[];
  call_to_action: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
};

export type CampaignRow = {
  id: string;
  branch_id: string | null;
  channel_id: string | null;
  campaign_number: string;
  name: string;
  objective: string;
  status: string;
  budget: number;
  spend: number;
  currency_code: string;
  start_date: string | null;
  end_date: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  listing_channels: { name: string; channel_type: string } | null;
};

export type CalendarEntryRow = {
  id: string;
  title: string;
  calendar_date: string;
  start_time: string | null;
  status: string;
  notes: string | null;
};

export type LeadSourceRow = {
  id: string;
  source_key: string;
  name: string;
  channel_type: string;
  monthly_leads: number;
  monthly_spend: number;
  monthly_conversions: number;
  currency_code: string;
  active: boolean;
};

export type MarketplaceChannelRow = {
  id: string;
  channel_key: string;
  name: string;
  provider: string;
  channel_type: string;
  base_url: string | null;
  sync_enabled: boolean;
  active: boolean;
};

export type ListingPriceOverrideRow = {
  id: string;
  listing_id: string;
  marketplace_channel_id: string;
  override_price: number;
  currency_code: string;
  reason: string | null;
  active: boolean;
  marketing_listings: { listing_number: string; title: string } | null;
  marketplace_channels: { name: string; channel_key: string } | null;
};

export type ListingSyncJobRow = {
  id: string;
  listing_id: string;
  marketplace_channel_id: string;
  operation: string;
  status: string;
  external_reference: string | null;
  error_message: string | null;
  queued_at: string;
  completed_at: string | null;
  marketing_listings: { listing_number: string; title: string } | null;
  marketplace_channels: { name: string; channel_key: string } | null;
};

export type ListingSyncLogRow = {
  id: string;
  sync_job_id: string | null;
  severity: string;
  message: string;
  provider_code: string | null;
  external_reference: string | null;
  created_at: string;
  marketplace_channels: { name: string; channel_key: string } | null;
};

export type MarketplaceLeadRow = {
  id: string;
  listing_id: string | null;
  vehicle_id: string | null;
  lead_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  message: string | null;
  budget: number;
  currency_code: string;
  status: string;
  captured_at: string;
  marketing_listings: { listing_number: string; title: string } | null;
  marketplace_channels: { name: string; channel_key: string } | null;
};

const DEFAULT_CHANNELS = [
  ["website", "Website", "website", "website"],
  ["instagram", "Instagram", "instagram", "instagram"],
  ["facebook", "Facebook", "facebook", "facebook"],
  ["tiktok", "TikTok", "tiktok", "tiktok"],
  ["linkedin", "LinkedIn", "linkedin", "linkedin"],
  ["whatsapp", "WhatsApp Broadcast", "whatsapp", "whatsapp"],
  ["marketplace", "Marketplace", "marketplace", "marketplace"],
  ["export_portal", "Export Portal", "export_portal", "export_portal"],
] as const;

const DEFAULT_LEAD_SOURCES = [
  ["instagram", "Instagram", "instagram"],
  ["facebook", "Facebook", "facebook"],
  ["tiktok", "TikTok", "tiktok"],
  ["website", "Website", "website"],
  ["whatsapp", "WhatsApp", "whatsapp"],
  ["linkedin", "LinkedIn", "linkedin"],
  ["referral", "Referral", "other"],
  ["showroom_visit", "Showroom Visit", "other"],
  ["export_inquiry", "Export Inquiry", "export_portal"],
] as const;

const DEFAULT_MARKETPLACE_CHANNELS = [
  ["website_inventory", "Website Inventory", "website", "website", null, "global"],
  ["dubizzle", "Dubizzle", "dubizzle", "marketplace", "https://dubizzle.com", "gcc"],
  ["autotrader", "AutoTrader", "autotrader", "marketplace", "https://www.autotrader.com", "global"],
  ["facebook_marketplace", "Facebook Marketplace", "meta", "marketplace", "https://www.facebook.com/marketplace", "global"],
  ["instagram_shop", "Instagram Shop", "meta", "instagram", "https://www.instagram.com", "global"],
  ["export_portal", "Export Portal", "manual_export", "export_portal", null, "global"],
] as const;

export async function getMarketingPermissions(companyId: string): Promise<MarketingPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canManageMarketing: permissions.has(PERMISSIONS.MANAGE_MARKETING),
  };
}

export async function ensureDefaultMarketingSetup(companyId: string) {
  const supabase = createServiceRoleClient();
  const { data: company } = await supabase
    .from("companies")
    .select("primary_currency_code")
    .eq("id", companyId)
    .single();

  await supabase.from("listing_channels").upsert(
    DEFAULT_CHANNELS.map(([channelKey, name, channelType, utmSource]) => ({
      company_id: companyId,
      channel_key: channelKey,
      name,
      channel_type: channelType,
      utm_source: utmSource,
    })),
    { onConflict: "company_id,channel_key" },
  );

  await supabase.from("lead_sources").upsert(
    DEFAULT_LEAD_SOURCES.map(([sourceKey, name, channelType]) => ({
      company_id: companyId,
      source_key: sourceKey,
      name,
      channel_type: channelType,
      currency_code: company?.primary_currency_code ?? "AED",
    })),
    { onConflict: "company_id,source_key" },
  );

  await supabase.from("marketplace_channels").upsert(
    DEFAULT_MARKETPLACE_CHANNELS.map(([channelKey, name, provider, channelType, baseUrl, region]) => ({
      company_id: companyId,
      channel_key: channelKey,
      name,
      provider,
      channel_type: channelType,
      base_url: baseUrl,
      settings: { mode: "manual", region },
    })),
    { onConflict: "company_id,channel_key" },
  );
}

export async function getMarketingDashboardData(companyId: string) {
  await ensureDefaultMarketingSetup(companyId);

  const supabase = await createClient();
  const [
    channelsResult,
    vehiclesResult,
    listingsResult,
    postsResult,
    campaignsResult,
    calendarResult,
    leadSourcesResult,
    marketplaceChannelsResult,
    priceOverridesResult,
    syncJobsResult,
    syncLogsResult,
    marketplaceLeadsResult,
  ] =
    await Promise.all([
      supabase
        .from("listing_channels")
        .select("id, channel_key, name, channel_type, active")
        .eq("company_id", companyId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("channel_key", { ascending: true }),
      supabase
        .from("vehicles")
        .select("id, branch_id, stock_number, brand, model, year, trim, mileage, condition, selling_price, currency_code, export_available")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("marketing_listings")
        .select(
          "id, branch_id, vehicle_id, channel_id, listing_number, title, short_description, price, currency_code, export_available, status, external_url, lead_count, published_at, created_at, vehicles(stock_number, brand, model, year), listing_channels(name, channel_type), branches(name, code)",
        )
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("social_posts")
        .select("id, vehicle_id, listing_id, campaign_id, channel_id, post_number, channel_type, caption, hashtags, call_to_action, status, scheduled_at, published_at, created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("campaigns")
        .select("id, branch_id, channel_id, campaign_number, name, objective, status, budget, spend, currency_code, start_date, end_date, impressions, clicks, leads, conversions, listing_channels(name, channel_type)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("content_calendar")
        .select("id, title, calendar_date, start_time, status, notes")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("calendar_date", { ascending: true })
        .limit(30),
      supabase
        .from("lead_sources")
        .select("id, source_key, name, channel_type, monthly_leads, monthly_spend, monthly_conversions, currency_code, active")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("monthly_leads", { ascending: false }),
      supabase
        .from("marketplace_channels")
        .select("id, channel_key, name, provider, channel_type, base_url, sync_enabled, active")
        .eq("company_id", companyId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("channel_key", { ascending: true }),
      supabase
        .from("listing_price_overrides")
        .select("id, listing_id, marketplace_channel_id, override_price, currency_code, reason, active, marketing_listings(listing_number, title), marketplace_channels(name, channel_key)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("listing_sync_jobs")
        .select("id, listing_id, marketplace_channel_id, operation, status, external_reference, error_message, queued_at, completed_at, marketing_listings(listing_number, title), marketplace_channels(name, channel_key)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("queued_at", { ascending: false })
        .limit(40),
      supabase
        .from("listing_sync_logs")
        .select("id, sync_job_id, severity, message, provider_code, external_reference, created_at, marketplace_channels(name, channel_key)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("marketplace_leads")
        .select("id, listing_id, vehicle_id, lead_name, phone, whatsapp, email, message, budget, currency_code, status, captured_at, marketing_listings(listing_number, title), marketplace_channels(name, channel_key)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("captured_at", { ascending: false })
        .limit(40),
    ]);

  for (const result of [
    channelsResult,
    vehiclesResult,
    listingsResult,
    postsResult,
    campaignsResult,
    calendarResult,
    leadSourcesResult,
    marketplaceChannelsResult,
    priceOverridesResult,
    syncJobsResult,
    syncLogsResult,
    marketplaceLeadsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const campaigns = (campaignsResult.data ?? []) as unknown as CampaignRow[];
  const syncJobs = (syncJobsResult.data ?? []) as unknown as ListingSyncJobRow[];
  const totalSpend = campaigns.reduce((sum, campaign) => sum + Number(campaign.spend), 0);

  return {
    channels: (channelsResult.data ?? []) as ListingChannelRow[],
    vehicles: (vehiclesResult.data ?? []) as MarketingVehicleOption[],
    listings: (listingsResult.data ?? []) as unknown as MarketingListingRow[],
    posts: (postsResult.data ?? []) as SocialPostRow[],
    campaigns,
    calendar: (calendarResult.data ?? []) as CalendarEntryRow[],
    leadSources: (leadSourcesResult.data ?? []) as LeadSourceRow[],
    marketplaceChannels: (marketplaceChannelsResult.data ?? []) as MarketplaceChannelRow[],
    priceOverrides: (priceOverridesResult.data ?? []) as unknown as ListingPriceOverrideRow[],
    syncJobs,
    syncLogs: (syncLogsResult.data ?? []) as unknown as ListingSyncLogRow[],
    marketplaceLeads: (marketplaceLeadsResult.data ?? []) as unknown as MarketplaceLeadRow[],
    stats: {
      activeListings: (listingsResult.data ?? []).filter((listing) => listing.status === "active").length,
      draftPosts: (postsResult.data ?? []).filter((post) => post.status === "draft").length,
      scheduledPosts: (postsResult.data ?? []).filter((post) => post.status === "scheduled").length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      leadSources: (leadSourcesResult.data ?? []).filter((source) => source.active).length,
      totalSpend,
      marketplaceChannels: (marketplaceChannelsResult.data ?? []).filter((channel) => channel.active).length,
      marketplaceLeads: (marketplaceLeadsResult.data ?? []).length,
      failedSyncJobs: syncJobs.filter((job) => job.status === "failed").length,
    },
    syncSummary: summarizeSyncJobs(syncJobs),
    campaignPerformance: campaigns.map((campaign) => ({
      campaignId: campaign.id,
      ...calculateCampaignPerformance({
        budget: Number(campaign.budget),
        spend: Number(campaign.spend),
        impressions: Number(campaign.impressions),
        clicks: Number(campaign.clicks),
        leads: Number(campaign.leads),
        conversions: Number(campaign.conversions),
      }),
    })),
  };
}
