"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  addVehicleDocumentSchema,
  addVehiclePhotoSchema,
  createVehicleCompetitorPriceSchema,
  createVehicleHistoryReportSchema,
  createVehicleMarketValueSchema,
  createVehicleSchema,
  createVinDecodeRequestSchema,
  moveVehicleBranchSchema,
  updateVehiclePricingSchema,
  updateVehicleStatusSchema,
  vehicleIdSchema,
} from "@/lib/validations/vehicle";
import { calculateValuationRecommendation } from "@/lib/vehicles/intelligence";

function formNumber(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.length > 0 ? value : 0;
}

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function formFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

async function ensureVehicleInWorkspace(vehicleId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("id, company_id, branch_id, selling_price, currency_code")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !vehicle) {
    throw new Error("Vehicle was not found.");
  }

  return vehicle;
}

async function writeAuditLog({
  companyId,
  branchId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  branchId?: string | null;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    branch_id: branchId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

async function writeEnrichmentLog({
  companyId,
  branchId,
  vehicleId,
  eventType,
  sourceTable,
  sourceId,
  title,
  description,
  createdBy,
  payload,
}: {
  companyId: string;
  branchId: string | null;
  vehicleId: string;
  eventType: string;
  sourceTable: string;
  sourceId: string;
  title: string;
  description?: string;
  createdBy: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("vehicle_enrichment_logs").insert({
    company_id: companyId,
    branch_id: branchId,
    vehicle_id: vehicleId,
    event_type: eventType,
    source_table: sourceTable,
    source_id: sourceId,
    title,
    description,
    payload: payload ?? {},
    created_by: createdBy,
  });
}

export async function createVehicle(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createVehicleSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    stockNumber: formData.get("stockNumber"),
    vin: formData.get("vin"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    year: formData.get("year"),
    trim: formOptional(formData.get("trim")),
    condition: formData.get("condition") || "new",
    mileage: formNumber(formData.get("mileage")),
    exteriorColor: formOptional(formData.get("exteriorColor")),
    interiorColor: formOptional(formData.get("interiorColor")),
    engine: formOptional(formData.get("engine")),
    transmission: formOptional(formData.get("transmission")),
    drivetrain: formOptional(formData.get("drivetrain")),
    fuelType: formOptional(formData.get("fuelType")),
    bodyType: formOptional(formData.get("bodyType")),
    seats: formOptional(formData.get("seats")),
    doors: formOptional(formData.get("doors")),
    originCountryCode: formData.get("originCountryCode") || "AE",
    currentCountryCode: formData.get("currentCountryCode") || "AE",
    currentLocation: formOptional(formData.get("currentLocation")),
    purchasePrice: formNumber(formData.get("purchasePrice")),
    shippingCost: formNumber(formData.get("shippingCost")),
    customsCost: formNumber(formData.get("customsCost")),
    preparationCost: formNumber(formData.get("preparationCost")),
    marketingCost: formNumber(formData.get("marketingCost")),
    otherExpenses: formNumber(formData.get("otherExpenses")),
    sellingPrice: formNumber(formData.get("sellingPrice")),
    currencyCode: formData.get("currencyCode") || "AED",
    status: formData.get("status") || "available",
    exportAvailable: formData.get("exportAvailable") === "on",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    const firstIssue = parsed.success ? null : parsed.error.issues[0];
    const field = firstIssue?.path.join(".");
    return { error: field ? `${field}: ${firstIssue?.message}` : "Vehicle details are invalid." };
  }

  const supabase = await createClient();
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert({
      company_id: parsed.data.companyId,
      branch_id: parsed.data.branchId,
      stock_number: parsed.data.stockNumber,
      vin: parsed.data.vin,
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      trim: parsed.data.trim,
      condition: parsed.data.condition,
      mileage: parsed.data.mileage,
      exterior_color: parsed.data.exteriorColor,
      interior_color: parsed.data.interiorColor,
      engine: parsed.data.engine,
      transmission: parsed.data.transmission,
      drivetrain: parsed.data.drivetrain,
      fuel_type: parsed.data.fuelType,
      body_type: parsed.data.bodyType,
      seats: parsed.data.seats,
      doors: parsed.data.doors,
      origin_country_code: parsed.data.originCountryCode,
      current_country_code: parsed.data.currentCountryCode,
      current_location: parsed.data.currentLocation,
      purchase_price: parsed.data.purchasePrice,
      shipping_cost: parsed.data.shippingCost,
      customs_cost: parsed.data.customsCost,
      preparation_cost: parsed.data.preparationCost,
      marketing_cost: parsed.data.marketingCost,
      other_expenses: parsed.data.otherExpenses,
      selling_price: parsed.data.sellingPrice,
      currency_code: parsed.data.currencyCode,
      status: parsed.data.status,
      export_available: parsed.data.exportAvailable,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !vehicle) {
    return { error: error?.message ?? "Vehicle could not be created." };
  }

  await supabase.from("vehicle_costs").insert({
    company_id: parsed.data.companyId,
    vehicle_id: vehicle.id,
    purchase_price: parsed.data.purchasePrice,
    shipping_cost: parsed.data.shippingCost,
    customs_cost: parsed.data.customsCost,
    repair_cost: parsed.data.preparationCost,
    marketing_cost: parsed.data.marketingCost,
    other_expenses: parsed.data.otherExpenses,
    selling_price: parsed.data.sellingPrice,
    currency_code: parsed.data.currencyCode,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  revalidatePath("/vehicles");
  return { vehicleId: vehicle.id };
}

export async function updateVehicleStatus(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = updateVehicleStatusSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "Vehicle status is invalid." };
  }

  const supabase = await createClient();
  const { data: currentVehicle, error: currentError } = await supabase
    .from("vehicles")
    .select("status")
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", workspace.companyId)
    .single();

  if (currentError || !currentVehicle) {
    return { error: "Vehicle was not found." };
  }

  if (currentVehicle.status === "reserved" && parsed.data.status === "reserved") {
    return { error: "Reserved vehicles cannot be reserved again." };
  }

  const { error } = await supabase
    .from("vehicles")
    .update({
      status: parsed.data.status,
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", workspace.companyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
}

export async function moveVehicleBranch(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = moveVehicleBranchSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    branchId: formData.get("branchId"),
  });

  if (!parsed.success) {
    return { error: "Branch movement is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({
      branch_id: parsed.data.branchId,
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", workspace.companyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
}

export async function updateVehiclePricing(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = updateVehiclePricingSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    purchasePrice: formNumber(formData.get("purchasePrice")),
    shippingCost: formNumber(formData.get("shippingCost")),
    customsCost: formNumber(formData.get("customsCost")),
    registrationCost: formNumber(formData.get("registrationCost")),
    inspectionCost: formNumber(formData.get("inspectionCost")),
    repairPreparationCost: formNumber(formData.get("repairPreparationCost")),
    detailingCost: formNumber(formData.get("detailingCost")),
    marketingCost: formNumber(formData.get("marketingCost")),
    salesCommission: formNumber(formData.get("salesCommission")),
    otherExpenses: formNumber(formData.get("otherExpenses")),
    sellingPrice: formNumber(formData.get("sellingPrice")),
    currencyCode: formData.get("currencyCode") || "AED",
  });

  if (!parsed.success) {
    return { error: "Pricing details are invalid." };
  }

  await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);

  const detailedPreparationCost =
    parsed.data.registrationCost +
    parsed.data.inspectionCost +
    parsed.data.repairPreparationCost +
    parsed.data.detailingCost;
  const otherExpensesWithCommission = parsed.data.otherExpenses + parsed.data.salesCommission;
  const supabase = await createClient();
  const { error: vehicleError } = await supabase
    .from("vehicles")
    .update({
      purchase_price: parsed.data.purchasePrice,
      shipping_cost: parsed.data.shippingCost,
      customs_cost: parsed.data.customsCost,
      preparation_cost: detailedPreparationCost,
      marketing_cost: parsed.data.marketingCost,
      other_expenses: otherExpensesWithCommission,
      selling_price: parsed.data.sellingPrice,
      currency_code: parsed.data.currencyCode.toUpperCase(),
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", workspace.companyId);

  if (vehicleError) {
    return { error: vehicleError.message };
  }

  const { error: costError } = await supabase
    .from("vehicle_costs")
    .upsert(
      {
        company_id: workspace.companyId,
        vehicle_id: parsed.data.vehicleId,
        purchase_price: parsed.data.purchasePrice,
        shipping_cost: parsed.data.shippingCost,
        customs_cost: parsed.data.customsCost,
        transport_cost: parsed.data.registrationCost,
        inspection_cost: parsed.data.inspectionCost,
        repair_cost: parsed.data.repairPreparationCost,
        detailing_cost: parsed.data.detailingCost,
        marketing_cost: parsed.data.marketingCost,
        commission_cost: parsed.data.salesCommission,
        other_expenses: parsed.data.otherExpenses,
        selling_price: parsed.data.sellingPrice,
        currency_code: parsed.data.currencyCode.toUpperCase(),
        updated_by: workspace.profileId,
        created_by: workspace.profileId,
      },
      { onConflict: "company_id,vehicle_id" },
    );

  if (costError) {
    return { error: costError.message };
  }

  revalidatePath("/vehicles");
  revalidatePath("/vehicles/pricing");
  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
}

export async function archiveVehicle(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = vehicleIdSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
  });

  if (!parsed.success) {
    throw new Error("Vehicle id is invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", workspace.companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function addVehiclePhoto(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = addVehiclePhotoSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    altText: formOptional(formData.get("altText")),
    isPrimary: formData.get("isPrimary") === "on",
  });

  if (!parsed.success) {
    return { error: "Photo details are invalid." };
  }

  await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);

  const file = formFile(formData.get("photo"));
  if (!file) {
    return { error: "Choose a vehicle photo to upload." };
  }

  const supabase = createServiceRoleClient();
  const storagePath = `${workspace.companyId}/vehicles/${parsed.data.vehicleId}/photos/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("vehicle-media")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  if (parsed.data.isPrimary) {
    await supabase
      .from("vehicle_photos")
      .update({ is_primary: false })
      .eq("company_id", workspace.companyId)
      .eq("vehicle_id", parsed.data.vehicleId);
  }

  const { error } = await supabase.from("vehicle_photos").insert({
    company_id: workspace.companyId,
    vehicle_id: parsed.data.vehicleId,
    storage_bucket: "vehicle-media",
    storage_path: storagePath,
    alt_text: parsed.data.altText,
    is_primary: parsed.data.isPrimary,
    created_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
  return { success: "Vehicle photo uploaded." };
}

export async function addVehicleDocument(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = addVehicleDocumentSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    documentType: formData.get("documentType"),
    title: formData.get("title"),
    status: formData.get("status") || "complete",
    expiresAt: formOptional(formData.get("expiresAt")),
  });

  if (!parsed.success) {
    return { error: "Document details are invalid." };
  }

  await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);

  const supabase = createServiceRoleClient();
  const file = formFile(formData.get("document"));
  let storagePath: string | null = null;

  if (file) {
    storagePath = `${workspace.companyId}/vehicles/${parsed.data.vehicleId}/documents/${Date.now()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-media")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: uploadError.message };
    }
  }

  const { data: documentRow, error } = await supabase
    .from("vehicle_documents")
    .insert({
      company_id: workspace.companyId,
      vehicle_id: parsed.data.vehicleId,
      document_type: parsed.data.documentType,
      title: parsed.data.title,
      storage_bucket: storagePath ? "vehicle-media" : null,
      storage_path: storagePath,
      status: parsed.data.status,
      expires_at: parsed.data.expiresAt,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !documentRow) {
    return { error: error?.message ?? "Document could not be created." };
  }

  await supabase
    .from("vehicle_document_checklists")
    .upsert(
      {
        company_id: workspace.companyId,
        vehicle_id: parsed.data.vehicleId,
        document_type: parsed.data.documentType,
        title: parsed.data.title,
        status: parsed.data.status,
        vehicle_document_id: documentRow.id,
        completed_at: parsed.data.status === "complete" || parsed.data.status === "verified"
          ? new Date().toISOString()
          : null,
        updated_by: workspace.profileId,
      },
      { onConflict: "company_id,vehicle_id,document_type" },
    );

  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
  return { success: "Vehicle document saved." };
}

export async function createVinDecodeRequest(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createVinDecodeRequestSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    vin: formData.get("vin"),
    provider: formData.get("provider") || "manual",
    providerRequestId: formOptional(formData.get("providerRequestId")),
    status: formData.get("status") || "completed",
    decodedBrand: formOptional(formData.get("decodedBrand")),
    decodedModel: formOptional(formData.get("decodedModel")),
    decodedYear: formOptional(formData.get("decodedYear")),
    decodedTrim: formOptional(formData.get("decodedTrim")),
    decodedBodyType: formOptional(formData.get("decodedBodyType")),
    decodedEngine: formOptional(formData.get("decodedEngine")),
    decodedTransmission: formOptional(formData.get("decodedTransmission")),
    confidenceScore: formOptional(formData.get("confidenceScore")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "VIN decode details are invalid." };
  }

  const vehicle = await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("vin_decode_requests")
    .insert({
      company_id: workspace.companyId,
      branch_id: vehicle.branch_id,
      vehicle_id: vehicle.id,
      vin: parsed.data.vin,
      provider: parsed.data.provider,
      provider_request_id: parsed.data.providerRequestId,
      status: parsed.data.status,
      decoded_brand: parsed.data.decodedBrand,
      decoded_model: parsed.data.decodedModel,
      decoded_year: parsed.data.decodedYear,
      decoded_trim: parsed.data.decodedTrim,
      decoded_body_type: parsed.data.decodedBodyType,
      decoded_engine: parsed.data.decodedEngine,
      decoded_transmission: parsed.data.decodedTransmission,
      confidence_score: parsed.data.confidenceScore,
      notes: parsed.data.notes,
      requested_by: workspace.profileId,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "VIN decode request could not be saved." };
  }

  await writeEnrichmentLog({
    companyId: workspace.companyId,
    branchId: vehicle.branch_id,
    vehicleId: vehicle.id,
    eventType: "vin_decode",
    sourceTable: "vin_decode_requests",
    sourceId: data.id,
    title: "VIN decode saved",
    description: `${parsed.data.provider} decode recorded for ${parsed.data.vin}.`,
    createdBy: workspace.profileId,
    payload: { status: parsed.data.status },
  });
  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: vehicle.branch_id,
    actorProfileId: workspace.profileId,
    action: "create_vin_decode_request",
    entityType: "vehicle",
    entityId: vehicle.id,
    newValues: { provider: parsed.data.provider, vin: parsed.data.vin },
  });

  revalidatePath(`/vehicles/${vehicle.id}`);
  return { success: "VIN intelligence saved." };
}

export async function createVehicleMarketValue(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createVehicleMarketValueSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    provider: formData.get("provider") || "manual",
    marketCountryCode: formData.get("marketCountryCode") || "AE",
    marketCurrencyCode: formData.get("marketCurrencyCode") || "AED",
    marketLow: formNumber(formData.get("marketLow")),
    marketAverage: formNumber(formData.get("marketAverage")),
    marketHigh: formNumber(formData.get("marketHigh")),
    recommendedPrice: formNumber(formData.get("recommendedPrice")),
    confidenceScore: formOptional(formData.get("confidenceScore")),
    sampleSize: formNumber(formData.get("sampleSize")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "Market valuation details are invalid." };
  }

  const vehicle = await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);
  const recommendation = calculateValuationRecommendation({
    marketLow: parsed.data.marketLow,
    marketAverage: parsed.data.marketAverage,
    marketHigh: parsed.data.marketHigh,
    targetMarginPrice: Number(vehicle.selling_price ?? 0),
    currencyCode: parsed.data.marketCurrencyCode,
  });
  const recommendedPrice = parsed.data.recommendedPrice > 0
    ? parsed.data.recommendedPrice
    : recommendation.recommendedPrice;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("vehicle_market_values")
    .insert({
      company_id: workspace.companyId,
      branch_id: vehicle.branch_id,
      vehicle_id: vehicle.id,
      provider: parsed.data.provider,
      market_country_code: parsed.data.marketCountryCode,
      market_currency_code: parsed.data.marketCurrencyCode,
      market_low: parsed.data.marketLow,
      market_average: parsed.data.marketAverage,
      market_high: parsed.data.marketHigh,
      recommended_price: recommendedPrice,
      confidence_score: parsed.data.confidenceScore,
      sample_size: parsed.data.sampleSize,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Market valuation could not be saved." };
  }

  await writeEnrichmentLog({
    companyId: workspace.companyId,
    branchId: vehicle.branch_id,
    vehicleId: vehicle.id,
    eventType: "market_valuation",
    sourceTable: "vehicle_market_values",
    sourceId: data.id,
    title: "Market valuation saved",
    description: `Recommended price ${parsed.data.marketCurrencyCode} ${recommendedPrice}.`,
    createdBy: workspace.profileId,
    payload: { recommendation: recommendation.recommendation },
  });
  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: vehicle.branch_id,
    actorProfileId: workspace.profileId,
    action: "create_vehicle_market_value",
    entityType: "vehicle",
    entityId: vehicle.id,
    newValues: { recommendedPrice, provider: parsed.data.provider },
  });

  revalidatePath(`/vehicles/${vehicle.id}`);
  revalidatePath("/vehicles/pricing");
  return { success: "Market valuation saved." };
}

export async function createVehicleCompetitorPrice(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createVehicleCompetitorPriceSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    sourceName: formData.get("sourceName"),
    competitorName: formOptional(formData.get("competitorName")),
    listingUrl: formOptional(formData.get("listingUrl")),
    price: formNumber(formData.get("price")),
    currencyCode: formData.get("currencyCode") || "AED",
    mileage: formNumber(formData.get("mileage")),
    location: formOptional(formData.get("location")),
    observedAt: formData.get("observedAt"),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "Competitor price details are invalid." };
  }

  const vehicle = await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("vehicle_competitor_prices")
    .insert({
      company_id: workspace.companyId,
      branch_id: vehicle.branch_id,
      vehicle_id: vehicle.id,
      source_name: parsed.data.sourceName,
      competitor_name: parsed.data.competitorName,
      listing_url: parsed.data.listingUrl,
      price: parsed.data.price,
      currency_code: parsed.data.currencyCode,
      mileage: parsed.data.mileage,
      location: parsed.data.location,
      observed_at: parsed.data.observedAt,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Competitor price could not be saved." };
  }

  await writeEnrichmentLog({
    companyId: workspace.companyId,
    branchId: vehicle.branch_id,
    vehicleId: vehicle.id,
    eventType: "competitor_price",
    sourceTable: "vehicle_competitor_prices",
    sourceId: data.id,
    title: "Competitor price tracked",
    description: `${parsed.data.sourceName} price ${parsed.data.currencyCode} ${parsed.data.price}.`,
    createdBy: workspace.profileId,
  });

  revalidatePath(`/vehicles/${vehicle.id}`);
  revalidatePath("/vehicles/pricing");
  return { success: "Competitor price saved." };
}

export async function createVehicleHistoryReport(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createVehicleHistoryReportSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    provider: formData.get("provider") || "manual",
    providerReportId: formOptional(formData.get("providerReportId")),
    reportUrl: formOptional(formData.get("reportUrl")),
    reportStatus: formData.get("reportStatus") || "completed",
    riskSummary: formData.get("riskSummary") || "unknown",
    accidentCount: formNumber(formData.get("accidentCount")),
    ownerCount: formNumber(formData.get("ownerCount")),
    odometerIssue: formData.get("odometerIssue") === "on",
    salvageOrTheftFlag: formData.get("salvageOrTheftFlag") === "on",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "Vehicle history report details are invalid." };
  }

  const vehicle = await ensureVehicleInWorkspace(parsed.data.vehicleId, workspace.companyId);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("vehicle_history_reports")
    .insert({
      company_id: workspace.companyId,
      branch_id: vehicle.branch_id,
      vehicle_id: vehicle.id,
      provider: parsed.data.provider,
      provider_report_id: parsed.data.providerReportId,
      report_url: parsed.data.reportUrl,
      report_status: parsed.data.reportStatus,
      risk_summary: parsed.data.riskSummary,
      accident_count: parsed.data.accidentCount,
      owner_count: parsed.data.ownerCount,
      odometer_issue: parsed.data.odometerIssue,
      salvage_or_theft_flag: parsed.data.salvageOrTheftFlag,
      notes: parsed.data.notes,
      requested_by: workspace.profileId,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Vehicle history report could not be saved." };
  }

  await writeEnrichmentLog({
    companyId: workspace.companyId,
    branchId: vehicle.branch_id,
    vehicleId: vehicle.id,
    eventType: "history_report",
    sourceTable: "vehicle_history_reports",
    sourceId: data.id,
    title: "History report saved",
    description: `Risk summary: ${parsed.data.riskSummary}.`,
    createdBy: workspace.profileId,
  });

  revalidatePath(`/vehicles/${vehicle.id}`);
  return { success: "Vehicle history report saved." };
}
