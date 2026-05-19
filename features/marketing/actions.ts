"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createListingDraftFromVehicle, createSocialCaptionDraft } from "@/lib/marketing/calculations";
import { makeMarketingNumber } from "@/lib/marketing/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createCampaignSchema,
  createContentCalendarEntrySchema,
  createMarketingListingSchema,
  createSocialPostSchema,
  upsertLeadSourceSchema,
} from "@/lib/validations/marketing";

type MarketingVehicleRow = {
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

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return Number(value);
}

function formDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

async function requireMarketingPermission() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(PERMISSIONS.MANAGE_MARKETING)) {
    throw new Error("You do not have permission for this marketing action.");
  }

  return workspace;
}

async function writeAuditLog({
  companyId,
  branchId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  branchId?: string | null;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    branch_id: branchId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

async function getVehicleForMarketing(vehicleId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, branch_id, stock_number, brand, model, year, trim, mileage, condition, selling_price, currency_code, export_available")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Vehicle was not found.");
  }

  return data as unknown as MarketingVehicleRow;
}

function marketingVehicleFromRow(vehicle: MarketingVehicleRow) {
  return {
    stockNumber: vehicle.stock_number,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    trim: vehicle.trim,
    mileage: vehicle.mileage,
    condition: vehicle.condition,
    sellingPrice: vehicle.selling_price,
    currencyCode: vehicle.currency_code,
    exportAvailable: vehicle.export_available,
  };
}

export async function createMarketingListing(formData: FormData) {
  const workspace = await requireMarketingPermission();
  const vehicle = await getVehicleForMarketing(String(formData.get("vehicleId")), workspace.companyId);
  const draft = createListingDraftFromVehicle(marketingVehicleFromRow(vehicle));
  const parsed = createMarketingListingSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")) ?? vehicle.branch_id,
    vehicleId: vehicle.id,
    channelId: formOptional(formData.get("channelId")),
    listingNumber: formOptional(formData.get("listingNumber")) ?? makeMarketingNumber("LST"),
    title: formOptional(formData.get("title")) ?? draft.title,
    shortDescription: formOptional(formData.get("shortDescription")) ?? draft.shortDescription,
    fullDescription: formOptional(formData.get("fullDescription")) ?? draft.fullDescription,
    specifications: draft.specifications,
    price: formNumber(formData.get("price"), Number(vehicle.selling_price)),
    currencyCode: formOptional(formData.get("currencyCode")) ?? vehicle.currency_code,
    exportAvailable: formBoolean(formData.get("exportAvailable")) || Boolean(vehicle.export_available),
    status: formOptional(formData.get("status")) ?? "draft",
    externalUrl: formOptional(formData.get("externalUrl")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Listing details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("marketing_listings")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      vehicle_id: parsed.data.vehicleId,
      channel_id: parsed.data.channelId,
      listing_number: parsed.data.listingNumber,
      title: parsed.data.title,
      short_description: parsed.data.shortDescription,
      full_description: parsed.data.fullDescription,
      specifications: parsed.data.specifications,
      price: parsed.data.price,
      currency_code: parsed.data.currencyCode,
      export_available: parsed.data.exportAvailable,
      status: parsed.data.status,
      external_url: parsed.data.externalUrl,
      published_at: parsed.data.status === "active" ? new Date().toISOString() : null,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Listing could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_marketing_listing",
    entityType: "marketing_listing",
    entityId: data.id,
    newValues: { vehicleId: parsed.data.vehicleId, status: parsed.data.status },
  });

  revalidatePath("/marketing/listings");
}

export async function createSocialPost(formData: FormData) {
  const workspace = await requireMarketingPermission();
  const vehicleId = formOptional(formData.get("vehicleId"));
  const vehicle = vehicleId ? await getVehicleForMarketing(vehicleId, workspace.companyId) : null;
  const channelType = String(formData.get("channelType") ?? "instagram");
  const draft = vehicle ? createSocialCaptionDraft({ vehicle: marketingVehicleFromRow(vehicle), channelType }) : null;
  const parsed = createSocialPostSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")) ?? vehicle?.branch_id,
    vehicleId,
    listingId: formOptional(formData.get("listingId")),
    campaignId: formOptional(formData.get("campaignId")),
    channelId: formOptional(formData.get("channelId")),
    postNumber: formOptional(formData.get("postNumber")) ?? makeMarketingNumber("POST"),
    channelType,
    caption: formOptional(formData.get("caption")) ?? draft?.caption,
    hashtags: formOptional(formData.get("hashtags")) ?? draft?.hashtags ?? [],
    callToAction: formOptional(formData.get("callToAction")) ?? draft?.callToAction,
    script: formOptional(formData.get("script")),
    mediaNotes: formOptional(formData.get("mediaNotes")),
    status: formOptional(formData.get("status")) ?? "draft",
    scheduledAt: formDateTime(formData.get("scheduledAt")),
    externalUrl: formOptional(formData.get("externalUrl")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Social post details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      vehicle_id: parsed.data.vehicleId,
      listing_id: parsed.data.listingId,
      campaign_id: parsed.data.campaignId,
      channel_id: parsed.data.channelId,
      post_number: parsed.data.postNumber,
      channel_type: parsed.data.channelType,
      caption: parsed.data.caption,
      hashtags: parsed.data.hashtags,
      call_to_action: parsed.data.callToAction,
      script: parsed.data.script,
      media_notes: parsed.data.mediaNotes,
      status: parsed.data.status,
      scheduled_at: parsed.data.scheduledAt,
      published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
      external_url: parsed.data.externalUrl,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Social post could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_social_post",
    entityType: "social_post",
    entityId: data.id,
    newValues: { channelType: parsed.data.channelType, status: parsed.data.status },
  });

  revalidatePath("/marketing/listings");
}

export async function createCampaign(formData: FormData) {
  const workspace = await requireMarketingPermission();
  const parsed = createCampaignSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    channelId: formOptional(formData.get("channelId")),
    campaignNumber: formOptional(formData.get("campaignNumber")) ?? makeMarketingNumber("CMP"),
    name: formData.get("name"),
    objective: formOptional(formData.get("objective")) ?? "lead_generation",
    status: formOptional(formData.get("status")) ?? "draft",
    budget: formNumber(formData.get("budget")),
    spend: formNumber(formData.get("spend")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    startDate: formOptional(formData.get("startDate")),
    endDate: formOptional(formData.get("endDate")),
    impressions: formNumber(formData.get("impressions")),
    clicks: formNumber(formData.get("clicks")),
    leads: formNumber(formData.get("leads")),
    conversions: formNumber(formData.get("conversions")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Campaign details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      channel_id: parsed.data.channelId,
      campaign_number: parsed.data.campaignNumber,
      name: parsed.data.name,
      objective: parsed.data.objective,
      status: parsed.data.status,
      budget: parsed.data.budget,
      spend: parsed.data.spend,
      currency_code: parsed.data.currencyCode,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      impressions: parsed.data.impressions,
      clicks: parsed.data.clicks,
      leads: parsed.data.leads,
      conversions: parsed.data.conversions,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Campaign could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_campaign",
    entityType: "campaign",
    entityId: data.id,
    newValues: { name: parsed.data.name, status: parsed.data.status },
  });

  revalidatePath("/marketing/listings");
}

export async function createContentCalendarEntry(formData: FormData) {
  const workspace = await requireMarketingPermission();
  const parsed = createContentCalendarEntrySchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    listingId: formOptional(formData.get("listingId")),
    socialPostId: formOptional(formData.get("socialPostId")),
    campaignId: formOptional(formData.get("campaignId")),
    title: formData.get("title"),
    calendarDate: formData.get("calendarDate"),
    startTime: formOptional(formData.get("startTime")),
    status: formOptional(formData.get("status")) ?? "planned",
    ownerProfileId: formOptional(formData.get("ownerProfileId")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Calendar entry details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("content_calendar").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    listing_id: parsed.data.listingId,
    social_post_id: parsed.data.socialPostId,
    campaign_id: parsed.data.campaignId,
    title: parsed.data.title,
    calendar_date: parsed.data.calendarDate,
    start_time: parsed.data.startTime,
    status: parsed.data.status,
    owner_profile_id: parsed.data.ownerProfileId,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/listings");
}

export async function upsertLeadSourceMetrics(formData: FormData) {
  const workspace = await requireMarketingPermission();
  const parsed = upsertLeadSourceSchema.safeParse({
    companyId: formData.get("companyId"),
    sourceKey: formData.get("sourceKey"),
    name: formData.get("name"),
    channelType: formData.get("channelType"),
    monthlyLeads: formNumber(formData.get("monthlyLeads")),
    monthlySpend: formNumber(formData.get("monthlySpend")),
    monthlyConversions: formNumber(formData.get("monthlyConversions")),
    currencyCode: formOptional(formData.get("currencyCode")) ?? "AED",
    active: formData.get("active") !== "false",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Lead source details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("lead_sources").upsert(
    {
      company_id: workspace.companyId,
      source_key: parsed.data.sourceKey,
      name: parsed.data.name,
      channel_type: parsed.data.channelType,
      monthly_leads: parsed.data.monthlyLeads,
      monthly_spend: parsed.data.monthlySpend,
      monthly_conversions: parsed.data.monthlyConversions,
      currency_code: parsed.data.currencyCode,
      active: parsed.data.active,
      notes: parsed.data.notes,
      updated_by: workspace.profileId,
    },
    { onConflict: "company_id,source_key" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/listings");
}
