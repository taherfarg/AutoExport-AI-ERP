type ValuationInput = {
  marketLow?: number | null;
  marketAverage?: number | null;
  marketHigh?: number | null;
  competitorPrices?: number[];
  targetMarginPrice?: number | null;
  currencyCode?: string;
};

type IntelligenceSummaryInput = {
  vinStatus?: string | null;
  valuationPrice?: number | null;
  competitorCount?: number;
  historyRisk?: string | null;
  currencyCode?: string;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return 0;
  return roundMoney(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function formatMoney(value: number, currencyCode = "AED") {
  return `${currencyCode} ${Math.round(value).toLocaleString("en-US")}`;
}

export function normalizeVin(vin: string) {
  return vin.trim().toUpperCase().replace(/\s+/g, "");
}

export function isLikelyVin(vin: string) {
  const normalized = normalizeVin(vin);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized);
}

export function calculateValuationRecommendation({
  marketLow,
  marketAverage,
  marketHigh,
  competitorPrices = [],
  targetMarginPrice,
  currencyCode = "AED",
}: ValuationInput) {
  const competitorAverage = average(competitorPrices);
  const signals = [marketAverage ?? 0, competitorAverage].filter((value) => value > 0);
  const signalAverage = average(signals);
  const floor = Math.max(targetMarginPrice ?? 0, marketLow ?? 0);
  const recommendedPrice = roundMoney(Math.max(floor, signalAverage || marketAverage || targetMarginPrice || 0));
  const marketSpread = roundMoney(Math.max((marketHigh ?? 0) - (marketLow ?? 0), 0));
  const aligned = competitorAverage > 0 && marketAverage
    ? Math.abs(competitorAverage - marketAverage) / marketAverage <= 0.08
    : false;

  return {
    competitorAverage,
    recommendedPrice,
    marketSpread,
    recommendation: aligned
      ? `List near ${formatMoney(recommendedPrice, currencyCode)}. Market and competitor signals are aligned, while target margin is protected.`
      : `List near ${formatMoney(recommendedPrice, currencyCode)}. Review market spread and competitor context before approving a discount.`,
  };
}

export function summarizeVehicleIntelligence({
  vinStatus,
  valuationPrice,
  competitorCount = 0,
  historyRisk,
  currencyCode = "AED",
}: IntelligenceSummaryInput) {
  const summary: string[] = [];

  if (vinStatus === "completed") {
    summary.push("VIN decoded");
  } else if (vinStatus) {
    summary.push(`VIN decode ${vinStatus}`);
  }

  if (valuationPrice && valuationPrice > 0) {
    summary.push(`Recommended market price ${formatMoney(valuationPrice, currencyCode)}`);
  }

  if (competitorCount > 0) {
    summary.push(`${competitorCount} competitor ${competitorCount === 1 ? "price" : "prices"} tracked`);
  }

  if (historyRisk) {
    summary.push(`History risk: ${historyRisk}`);
  }

  return summary;
}
