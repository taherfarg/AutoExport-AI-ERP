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
      expectedProfit: 27000,
      profitMargin: 18,
    });
  });

  it("returns zero margin when selling price is not set", () => {
    expect(
      calculateVehiclePricing({
        purchasePrice: 100000,
      }),
    ).toEqual({
      totalLandedCost: 100000,
      expectedProfit: -100000,
      profitMargin: 0,
    });
  });
});

