"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  addVehicleDocumentSchema,
  addVehiclePhotoSchema,
  createVehicleSchema,
  moveVehicleBranchSchema,
  updateVehicleStatusSchema,
  vehicleIdSchema,
} from "@/lib/validations/vehicle";

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
    .select("id, company_id")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !vehicle) {
    throw new Error("Vehicle was not found.");
  }

  return vehicle;
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
    throw new Error("Vehicle details are invalid.");
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
    throw new Error(error?.message ?? "Vehicle could not be created.");
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
  redirect(`/vehicles/${vehicle.id}`);
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
}
