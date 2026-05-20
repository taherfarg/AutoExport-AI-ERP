import { z } from "zod";
import { normalizeVin } from "@/lib/vehicles/intelligence";

export const vehicleStatusSchema = z.enum([
  "available",
  "reserved",
  "sold",
  "in_transit",
  "under_customs_clearance",
  "under_preparation",
  "ready_for_export",
  "delivered",
  "cancelled",
]);

export const vehicleConditionSchema = z.enum(["new", "used", "certified_pre_owned"]);

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional();

const money = z.coerce.number().min(0).default(0);
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().min(0).optional(),
);
const optionalInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(1).optional(),
);
const vinInput = z.string().trim().min(5).max(64).transform(normalizeVin);

export const createVehicleSchema = z.object({
  companyId: z.uuid(),
  branchId: z.uuid(),
  stockNumber: z.string().trim().min(2).max(60),
  vin: z.string().trim().min(5).max(64),
  brand: z.string().trim().min(2).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1900).max(2100),
  trim: optionalText,
  condition: vehicleConditionSchema.default("new"),
  mileage: z.coerce.number().int().min(0).default(0),
  exteriorColor: optionalText,
  interiorColor: optionalText,
  engine: optionalText,
  transmission: optionalText,
  drivetrain: optionalText,
  fuelType: optionalText,
  bodyType: optionalText,
  seats: optionalInt.pipe(z.number().int().min(1).max(100).optional()),
  doors: optionalInt.pipe(z.number().int().min(1).max(20).optional()),
  originCountryCode: z.string().trim().length(2).default("AE"),
  currentCountryCode: z.string().trim().length(2).default("AE"),
  currentLocation: optionalText,
  purchasePrice: money,
  shippingCost: money,
  customsCost: money,
  preparationCost: money,
  marketingCost: money,
  otherExpenses: money,
  sellingPrice: money,
  currencyCode: z.string().trim().length(3).default("AED"),
  status: vehicleStatusSchema.default("available"),
  exportAvailable: z.coerce.boolean().default(false),
});

export const vehicleIdSchema = z.object({
  vehicleId: z.uuid(),
});

export const updateVehicleStatusSchema = vehicleIdSchema.extend({
  status: vehicleStatusSchema,
});

export const moveVehicleBranchSchema = vehicleIdSchema.extend({
  branchId: z.uuid(),
});

export const updateVehiclePricingSchema = vehicleIdSchema.extend({
  purchasePrice: money,
  shippingCost: money,
  customsCost: money,
  registrationCost: money,
  inspectionCost: money,
  repairPreparationCost: money,
  detailingCost: money,
  marketingCost: money,
  salesCommission: money,
  otherExpenses: money,
  sellingPrice: money,
  currencyCode: z.string().trim().length(3).default("AED"),
});

export const vehicleDocumentStatusSchema = z.enum(["missing", "partial", "complete", "verified"]);

export const addVehiclePhotoSchema = vehicleIdSchema.extend({
  altText: optionalText,
  isPrimary: z.coerce.boolean().default(false),
});

export const addVehicleDocumentSchema = vehicleIdSchema.extend({
  documentType: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(140),
  status: vehicleDocumentStatusSchema.default("complete"),
  expiresAt: optionalText,
});

export const vinDecodeProviderStatusSchema = z.enum(["pending", "completed", "failed", "manual_review"]);
export const vehicleHistoryReportStatusSchema = z.enum(["requested", "available", "completed", "failed"]);
export const vehicleHistoryRiskSchema = z.enum(["unknown", "low", "medium", "high"]);

export const createVinDecodeRequestSchema = vehicleIdSchema.extend({
  vin: vinInput,
  provider: z.string().trim().min(2).max(80).default("manual"),
  providerRequestId: optionalText,
  status: vinDecodeProviderStatusSchema.default("completed"),
  decodedBrand: optionalText,
  decodedModel: optionalText,
  decodedYear: optionalInt,
  decodedTrim: optionalText,
  decodedBodyType: optionalText,
  decodedEngine: optionalText,
  decodedTransmission: optionalText,
  confidenceScore: optionalMoney,
  notes: optionalText,
});

export const createVehicleMarketValueSchema = vehicleIdSchema.extend({
  provider: z.string().trim().min(2).max(80).default("manual"),
  marketCountryCode: z.string().trim().length(2).default("AE").transform((value) => value.toUpperCase()),
  marketCurrencyCode: z.string().trim().length(3).default("AED").transform((value) => value.toUpperCase()),
  marketLow: optionalMoney.default(0),
  marketAverage: optionalMoney.default(0),
  marketHigh: optionalMoney.default(0),
  recommendedPrice: optionalMoney.default(0),
  confidenceScore: optionalMoney,
  sampleSize: z.coerce.number().int().min(0).default(0),
  notes: optionalText,
});

export const createVehicleCompetitorPriceSchema = vehicleIdSchema.extend({
  sourceName: z.string().trim().min(2).max(100),
  competitorName: optionalText,
  listingUrl: optionalText,
  price: money,
  currencyCode: z.string().trim().length(3).default("AED").transform((value) => value.toUpperCase()),
  mileage: z.coerce.number().int().min(0).default(0),
  location: optionalText,
  observedAt: z.string().trim().min(10).max(10),
  notes: optionalText,
});

export const createVehicleHistoryReportSchema = vehicleIdSchema.extend({
  provider: z.string().trim().min(2).max(80).default("manual"),
  providerReportId: optionalText,
  reportUrl: optionalText,
  reportStatus: vehicleHistoryReportStatusSchema.default("completed"),
  riskSummary: vehicleHistoryRiskSchema.default("unknown"),
  accidentCount: z.coerce.number().int().min(0).default(0),
  ownerCount: z.coerce.number().int().min(0).default(0),
  odometerIssue: z.coerce.boolean().default(false),
  salvageOrTheftFlag: z.coerce.boolean().default(false),
  notes: optionalText,
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;
