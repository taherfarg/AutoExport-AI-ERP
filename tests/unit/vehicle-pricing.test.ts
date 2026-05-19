import { describe, expect, it } from "vitest";
import { calculateVehiclePricing } from "@/lib/vehicles/pricing";

describe("calculateVehiclePricing", () => {
  it("calculates landed cost, expected profit, and margin", () => {
    expect(
      calculateVehiclePricing({
        purchasePrice: 100000,
        shippingCost: 7000,
        customsCost: 12000,
        preparationCost: 2500,
        marketingCost: 900,
        otherExpenses: 600,
        sellingPrice: 150000,
      }),
    ).toEqual({
      totalLandedCost: 123000,
      minimumSellingPrice: 123000,
      suggestedSellingPrice: 139772.73,
      expectedProfit: 27000,
      profitMargin: 18,
      recommendedDiscountLimit: 27000,
      lowMarginWarning: false,
      aiRecommendation: "Pricing is healthy at 18% margin. Use the suggested price as the public offer and keep the discount limit for negotiation control.",
    });
  });

  it("returns zero margin when selling price is not set", () => {
    expect(
      calculateVehiclePricing({
        purchasePrice: 100000,
      }),
    ).toEqual({
      totalLandedCost: 100000,
      minimumSellingPrice: 100000,
      suggestedSellingPrice: 113636.36,
      expectedProfit: 13636.36,
      profitMargin: 12,
      recommendedDiscountLimit: 13636.36,
      lowMarginWarning: false,
      aiRecommendation: "Pricing is healthy at 12% margin. Use the suggested price as the public offer and keep the discount limit for negotiation control.",
    });
  });

  it("includes detailed smart-pricing inputs and warns on weak margins", () => {
    expect(
      calculateVehiclePricing({
        purchasePrice: 90000,
        shippingCost: 5000,
        customsCost: 8000,
        registrationCost: 1000,
        inspectionCost: 600,
        repairPreparationCost: 2500,
        detailingCost: 700,
        marketingCost: 400,
        salesCommission: 1200,
        otherExpenses: 600,
        targetProfitMargin: 18,
        marketPrice: 128000,
        competitorPrice: 126000,
        sellingPrice: 123000,
        discount: 2000,
        exportDestination: "Oman",
      }),
    ).toEqual({
      totalLandedCost: 110000,
      minimumSellingPrice: 110000,
      suggestedSellingPrice: 130573.17,
      expectedProfit: 11000,
      profitMargin: 9.09,
      recommendedDiscountLimit: 13000,
      lowMarginWarning: true,
      aiRecommendation: "Margin is below the 18% target for Oman. Protect profit by listing near 130573.17 or requesting manager approval before discounting.",
    });
  });
});

