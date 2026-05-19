export type VehiclePricingInput = {
  purchasePrice: number;
  shippingCost?: number;
  customsCost?: number;
  registrationCost?: number;
  inspectionCost?: number;
  repairPreparationCost?: number;
  detailingCost?: number;
  preparationCost?: number;
  marketingCost?: number;
  salesCommission?: number;
  otherExpenses?: number;
  currencyConversionRate?: number;
  targetProfitMargin?: number;
  marketPrice?: number;
  competitorPrice?: number;
  exportDestination?: string;
  discount?: number;
  vatTax?: number;
  sellingPrice?: number;
};

export type VehiclePricingResult = {
  totalLandedCost: number;
  minimumSellingPrice: number;
  suggestedSellingPrice: number;
  expectedProfit: number;
  profitMargin: number;
  recommendedDiscountLimit: number;
  lowMarginWarning: boolean;
  aiRecommendation: string;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateVehiclePricing(input: VehiclePricingInput): VehiclePricingResult {
  const conversionRate = input.currencyConversionRate && input.currencyConversionRate > 0
    ? input.currencyConversionRate
    : 1;
  const targetMargin = Math.min(Math.max(input.targetProfitMargin ?? 12, 0), 80);
  const discount = input.discount ?? 0;
  const vatTax = input.vatTax ?? 0;
  const preparationTotal =
    (input.preparationCost ?? 0) +
    (input.registrationCost ?? 0) +
    (input.inspectionCost ?? 0) +
    (input.repairPreparationCost ?? 0) +
    (input.detailingCost ?? 0);

  const totalLandedCost = money(
    input.purchasePrice +
      (input.shippingCost ?? 0) +
      (input.customsCost ?? 0) +
      preparationTotal +
      (input.marketingCost ?? 0) +
      (input.salesCommission ?? 0) +
      (input.otherExpenses ?? 0),
  );
  const convertedLandedCost = money(totalLandedCost * conversionRate);
  const minimumSellingPrice = money(convertedLandedCost + vatTax);
  const targetPrice = targetMargin >= 80
    ? minimumSellingPrice
    : money(convertedLandedCost / (1 - targetMargin / 100) + vatTax);
  const comparablePrices = [input.marketPrice, input.competitorPrice].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  const comparableAverage = comparablePrices.length
    ? money(comparablePrices.reduce((sum, value) => sum + value, 0) / comparablePrices.length)
    : targetPrice;
  const suggestedSellingPrice = money(Math.max(minimumSellingPrice, (targetPrice + comparableAverage) / 2));
  const sellingPrice = input.sellingPrice && input.sellingPrice > 0
    ? input.sellingPrice
    : suggestedSellingPrice;
  const netSellingPrice = Math.max(0, sellingPrice - discount);
  const expectedProfit = money(netSellingPrice - convertedLandedCost);
  const profitMargin = netSellingPrice <= 0 ? 0 : money((expectedProfit / netSellingPrice) * 100);
  const recommendedDiscountLimit = money(Math.max(0, sellingPrice - minimumSellingPrice));
  const lowMarginWarning = profitMargin < targetMargin;

  return {
    totalLandedCost: convertedLandedCost,
    minimumSellingPrice,
    suggestedSellingPrice,
    expectedProfit,
    profitMargin,
    recommendedDiscountLimit,
    lowMarginWarning,
    aiRecommendation: buildRecommendation({
      profitMargin,
      targetMargin,
      suggestedSellingPrice,
      marketPrice: input.marketPrice,
      competitorPrice: input.competitorPrice,
      exportDestination: input.exportDestination,
      lowMarginWarning,
    }),
  };
}

function buildRecommendation({
  profitMargin,
  targetMargin,
  suggestedSellingPrice,
  marketPrice,
  competitorPrice,
  exportDestination,
  lowMarginWarning,
}: {
  profitMargin: number;
  targetMargin: number;
  suggestedSellingPrice: number;
  marketPrice?: number;
  competitorPrice?: number;
  exportDestination?: string;
  lowMarginWarning: boolean;
}) {
  const destination = exportDestination ? ` for ${exportDestination}` : "";

  if (lowMarginWarning) {
    return `Margin is below the ${targetMargin}% target${destination}. Protect profit by listing near ${money(suggestedSellingPrice)} or requesting manager approval before discounting.`;
  }

  if (marketPrice && competitorPrice && suggestedSellingPrice > Math.min(marketPrice, competitorPrice)) {
    return `Suggested price is above one market reference${destination}. Lead with export readiness, documents, and warranty value before offering discounts.`;
  }

  return `Pricing is healthy at ${profitMargin}% margin${destination}. Use the suggested price as the public offer and keep the discount limit for negotiation control.`;
}

