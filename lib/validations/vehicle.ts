import { z } from "zod";

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
  seats: z.coerce.number().int().min(1).max(100).optional(),
  doors: z.coerce.number().int().min(1).max(20).optional(),
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

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

