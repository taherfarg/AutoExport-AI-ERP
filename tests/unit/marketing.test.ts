import { describe, expect, test } from "vitest";
import {
  calculateCampaignPerformance,
  createListingDraftFromVehicle,
  createSocialCaptionDraft,
  type MarketingVehicleInput,
} from "@/lib/marketing/calculations";
import { formatMarketingStatus, makeMarketingNumber } from "@/lib/marketing/format";
import {
  createCampaignSchema,
  createContentCalendarEntrySchema,
  createMarketingListingSchema,
  createSocialPostSchema,
  upsertLeadSourceSchema,
} from "@/lib/validations/marketing";

describe("marketing listings", () => {
  const vehicle: MarketingVehicleInput = {
    stockNumber: "PLX-2026-001",
    brand: "Toyota",
    model: "Hilux",
    year: 2026,
    trim: "GR Sport",
    mileage: 0,
    condition: "new",
    sellingPrice: 150000,
    currencyCode: "AED",
    exportAvailable: true,
  };

  test("creates customer-facing listing draft from vehicle data", () => {
    expect(createListingDraftFromVehicle(vehicle)).toEqual({
      title: "2026 Toyota Hilux GR Sport",
      shortDescription: "New Toyota Hilux GR Sport available for AED 150,000.",
      fullDescription:
        "2026 Toyota Hilux GR Sport in new condition with 0 km. Export available. Stock PLX-2026-001 is ready for showroom or export buyer inquiries.",
      specifications: {
        stockNumber: "PLX-2026-001",
        brand: "Toyota",
        model: "Hilux",
        year: 2026,
        trim: "GR Sport",
        mileage: 0,
        condition: "new",
      },
    });
  });

  test("creates channel-aware social caption drafts", () => {
    expect(createSocialCaptionDraft({ vehicle, channelType: "instagram" })).toMatchObject({
      caption: expect.stringContaining("2026 Toyota Hilux GR Sport"),
      hashtags: ["#Toyota", "#Hilux", "#AutoSphere", "#ExportAvailable"],
      callToAction: "DM us for price and export details.",
    });

    expect(createSocialCaptionDraft({ vehicle, channelType: "whatsapp" }).caption).toContain("AED 150,000");
  });

  test("calculates campaign performance metrics", () => {
    expect(
      calculateCampaignPerformance({
        budget: 10000,
        spend: 2500,
        impressions: 10000,
        clicks: 500,
        leads: 25,
        conversions: 5,
      }),
    ).toEqual({
      remainingBudget: 7500,
      clickThroughRate: 5,
      costPerLead: 100,
      conversionRate: 20,
    });
  });

  test("formats marketing labels and numbers", () => {
    expect(formatMarketingStatus("export_portal")).toBe("Export portal");
    expect(makeMarketingNumber("LST", 123456)).toBe("LST-2N9C");
  });

  test("validates listing, post, campaign, calendar, and lead source payloads", () => {
    expect(
      createMarketingListingSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        vehicleId: "33333333-3333-4333-8333-333333333333",
        channelId: "44444444-4444-4444-8444-444444444444",
        title: "Toyota Hilux GR Sport",
        price: 150000,
        currencyCode: "aed",
        exportAvailable: true,
      }),
    ).toMatchObject({ currencyCode: "AED", status: "draft", listingNumber: expect.stringMatching(/^LST-/) });

    expect(
      createSocialPostSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        vehicleId: "33333333-3333-4333-8333-333333333333",
        channelId: "44444444-4444-4444-8444-444444444444",
        channelType: "instagram",
        caption: "Toyota Hilux available now",
        hashtags: "#Toyota #Hilux",
      }),
    ).toMatchObject({ hashtags: ["#Toyota", "#Hilux"], status: "draft" });

    expect(
      createCampaignSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        name: "Hilux export campaign",
        objective: "lead_generation",
        budget: 10000,
        spend: 2500,
        currencyCode: "aed",
        startDate: "2026-06-01",
      }),
    ).toMatchObject({ currencyCode: "AED", campaignNumber: expect.stringMatching(/^CMP-/) });

    expect(
      createContentCalendarEntrySchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        title: "Publish Hilux post",
        calendarDate: "2026-06-01",
        startTime: "10:30",
      }),
    ).toMatchObject({ status: "planned" });

    expect(
      upsertLeadSourceSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        sourceKey: "instagram",
        name: "Instagram",
        channelType: "instagram",
        monthlyLeads: 20,
        monthlySpend: 1500,
        monthlyConversions: 3,
        currencyCode: "aed",
      }),
    ).toMatchObject({ currencyCode: "AED", sourceKey: "instagram" });
  });
});
