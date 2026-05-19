import { formatMoney } from "@/lib/vehicles/format";

export type MarketingVehicleInput = {
  stockNumber: string;
  brand: string;
  model: string;
  year: number;
  trim?: string | null;
  mileage: number;
  condition: string;
  sellingPrice: number;
  currencyCode: string;
  exportAvailable: boolean;
};

export type CampaignPerformanceInput = {
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
};

export function createListingDraftFromVehicle(vehicle: MarketingVehicleInput) {
  const trim = vehicle.trim ? ` ${vehicle.trim}` : "";
  const vehicleName = `${vehicle.year} ${vehicle.brand} ${vehicle.model}${trim}`;
  const price = formatMoney(vehicle.sellingPrice, vehicle.currencyCode).replace(/\s+/g, " ");

  return {
    title: vehicleName,
    shortDescription: `${capitalize(vehicle.condition)} ${vehicle.brand} ${vehicle.model}${trim} available for ${price}.`,
    fullDescription: `${vehicleName} in ${vehicle.condition} condition with ${vehicle.mileage.toLocaleString("en")} km. ${
      vehicle.exportAvailable ? "Export available." : "Local sale available."
    } Stock ${vehicle.stockNumber} is ready for showroom or export buyer inquiries.`,
    specifications: {
      stockNumber: vehicle.stockNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      mileage: vehicle.mileage,
      condition: vehicle.condition,
    },
  };
}

export function createSocialCaptionDraft({
  vehicle,
  channelType,
}: {
  vehicle: MarketingVehicleInput;
  channelType: string;
}) {
  const listing = createListingDraftFromVehicle(vehicle);
  const price = formatMoney(vehicle.sellingPrice, vehicle.currencyCode).replace(/\s+/g, " ");
  const hashtags = [
    `#${vehicle.brand.replaceAll(" ", "")}`,
    `#${vehicle.model.replaceAll(" ", "")}`,
    "#AutoSphere",
    vehicle.exportAvailable ? "#ExportAvailable" : "#ShowroomReady",
  ];

  if (channelType === "whatsapp") {
    return {
      caption: `${listing.title}\nPrice: ${price}\n${vehicle.exportAvailable ? "Export available." : "Available in showroom."}\nReply for photos and details.`,
      hashtags: [],
      callToAction: "Reply on WhatsApp for details.",
    };
  }

  return {
    caption: `${listing.title} now available. ${vehicle.exportAvailable ? "Export-ready stock" : "Showroom-ready stock"} with price at ${price}.`,
    hashtags,
    callToAction: "DM us for price and export details.",
  };
}

export function calculateCampaignPerformance(input: CampaignPerformanceInput) {
  return {
    remainingBudget: roundMoney(Math.max(input.budget - input.spend, 0)),
    clickThroughRate: input.impressions === 0 ? 0 : roundPercent((input.clicks / input.impressions) * 100),
    costPerLead: input.leads === 0 ? 0 : roundMoney(input.spend / input.leads),
    conversionRate: input.leads === 0 ? 0 : roundPercent((input.conversions / input.leads) * 100),
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}
