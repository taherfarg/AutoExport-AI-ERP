import { describe, expect, it } from "vitest";
import {
  calculateValuationRecommendation,
  isLikelyVin,
  normalizeVin,
  summarizeVehicleIntelligence,
} from "@/lib/vehicles/intelligence";
import {
  createVehicleCompetitorPriceSchema,
  createVehicleHistoryReportSchema,
  createVehicleMarketValueSchema,
  createVinDecodeRequestSchema,
} from "@/lib/validations/vehicle";

describe("vehicle intelligence", () => {
  it("normalizes VINs and rejects ambiguous VIN characters", () => {
    expect(normalizeVin("  jt123456789012345  ")).toBe("JT123456789012345");
    expect(isLikelyVin("JT123456789012345")).toBe(true);
    expect(isLikelyVin("JTI23456789012345")).toBe(false);
    expect(isLikelyVin("SHORT")).toBe(false);
  });

  it("calculates valuation recommendation from market and competitor prices", () => {
    expect(
      calculateValuationRecommendation({
        marketLow: 132000,
        marketAverage: 145000,
        marketHigh: 158000,
        competitorPrices: [142000, 148000, 151000],
        targetMarginPrice: 139000,
      }),
    ).toEqual({
      competitorAverage: 147000,
      recommendedPrice: 146000,
      marketSpread: 26000,
      recommendation: "List near AED 146,000. Market and competitor signals are aligned, while target margin is protected.",
    });
  });

  it("keeps recommended price above target margin when market is weak", () => {
    expect(
      calculateValuationRecommendation({
        marketLow: 105000,
        marketAverage: 112000,
        marketHigh: 120000,
        competitorPrices: [109000, 111000],
        targetMarginPrice: 125000,
      }).recommendedPrice,
    ).toBe(125000);
  });

  it("summarizes latest intelligence records for vehicle detail cards", () => {
    expect(
      summarizeVehicleIntelligence({
        vinStatus: "completed",
        valuationPrice: 146000,
        competitorCount: 3,
        historyRisk: "low",
      }),
    ).toEqual([
      "VIN decoded",
      "Recommended market price AED 146,000",
      "3 competitor prices tracked",
      "History risk: low",
    ]);
  });

  it("validates vehicle intelligence forms", () => {
    expect(
      createVinDecodeRequestSchema.parse({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        vin: " jt123456789012345 ",
        provider: "manual",
        decodedBrand: "Toyota",
        decodedModel: "Hilux",
        decodedYear: "2026",
      }),
    ).toMatchObject({
      vin: "JT123456789012345",
      decodedYear: 2026,
    });

    expect(
      createVehicleMarketValueSchema.parse({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        provider: "manual",
        marketLow: "132000",
        marketAverage: "145000",
        marketHigh: "158000",
        recommendedPrice: "146000",
      }),
    ).toMatchObject({ marketAverage: 145000, recommendedPrice: 146000 });

    expect(
      createVehicleCompetitorPriceSchema.parse({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        sourceName: "Dubizzle",
        competitorName: "Dubai Dealer",
        price: "148000",
        observedAt: "2026-05-20",
      }),
    ).toMatchObject({ sourceName: "Dubizzle", price: 148000 });

    expect(
      createVehicleHistoryReportSchema.parse({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        provider: "manual",
        reportStatus: "completed",
        riskSummary: "low",
      }),
    ).toMatchObject({ provider: "manual", reportStatus: "completed" });
  });
});
