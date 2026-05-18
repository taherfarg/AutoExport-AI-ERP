export type VehiclePricingInput = {
  purchasePrice: number;
  shippingCost?: number;
  customsCost?: number;
  preparationCost?: number;
  marketingCost?: number;
  otherExpenses?: number;
  sellingPrice?: number;
};

export type VehiclePricingResult = {
  totalLandedCost: number;
  expectedProfit: number;
  profitMargin: number;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateVehiclePricing(input: VehiclePricingInput): VehiclePricingResult {
  const totalLandedCost = money(
    input.purchasePrice +
      (input.shippingCost ?? 0) +
      (input.customsCost ?? 0) +
      (input.preparationCost ?? 0) +
      (input.marketingCost ?? 0) +
      (input.otherExpenses ?? 0),
  );
  const sellingPrice = input.sellingPrice ?? 0;
  const expectedProfit = money(sellingPrice - totalLandedCost);
  const profitMargin = sellingPrice <= 0 ? 0 : money((expectedProfit / sellingPrice) * 100);

  return {
    totalLandedCost,
    expectedProfit,
    profitMargin,
  };
}

