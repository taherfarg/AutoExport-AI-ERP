import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type VehicleInventoryFilters = {
  search?: string;
  status?: string;
  branchId?: string;
  brand?: string;
  exportAvailable?: string;
};

export type VehicleListRow = {
  id: string;
  stock_number: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  trim: string | null;
  condition: string;
  mileage: number;
  branch_id: string;
  current_country_code: string;
  total_landed_cost: number;
  selling_price: number;
  expected_profit: number;
  profit_margin: number;
  currency_code: string;
  status: string;
  export_available: boolean;
  documents_status: string;
  photos_status: string;
  acquired_at: string;
  branches: { name: string; code: string; country_code: string } | null;
};

export type VehicleDetail = VehicleListRow & {
  exterior_color: string | null;
  interior_color: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  fuel_type: string | null;
  body_type: string | null;
  seats: number | null;
  doors: number | null;
  origin_country_code: string;
  current_location: string | null;
  purchase_price: number;
  shipping_cost: number;
  customs_cost: number;
  preparation_cost: number;
  marketing_cost: number;
  other_expenses: number;
  website_listing_status: string;
  social_media_status: string;
  created_at: string;
};

export type VehiclePermissions = {
  canViewCost: boolean;
  canViewProfit: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canUploadDocuments: boolean;
  canVerifyDocuments: boolean;
  canManageIntelligence: boolean;
};

export type VehiclePhotoRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  signed_url: string | null;
};

export type VehicleDocumentRow = {
  id: string;
  document_type: string;
  title: string;
  storage_bucket: string | null;
  storage_path: string | null;
  status: string;
  expires_at: string | null;
  signed_url: string | null;
};

export type VehicleChecklistRow = {
  id: string;
  document_type: string;
  title: string;
  is_required: boolean;
  is_export_required: boolean;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  vehicle_document_id: string | null;
};

export type VehiclePricingRow = VehicleListRow & {
  purchase_price: number;
  shipping_cost: number;
  customs_cost: number;
  preparation_cost: number;
  marketing_cost: number;
  other_expenses: number;
  vehicle_costs:
    | {
        transport_cost: number;
        inspection_cost: number;
        repair_cost: number;
        detailing_cost: number;
        commission_cost: number;
      }[]
    | null;
};

export type VinDecodeRequestRow = {
  id: string;
  vin: string;
  provider: string;
  status: string;
  decoded_brand: string | null;
  decoded_model: string | null;
  decoded_year: number | null;
  decoded_trim: string | null;
  decoded_body_type: string | null;
  decoded_engine: string | null;
  decoded_transmission: string | null;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
};

export type VehicleMarketValueRow = {
  id: string;
  provider: string;
  market_country_code: string;
  market_currency_code: string;
  market_low: number;
  market_average: number;
  market_high: number;
  recommended_price: number;
  confidence_score: number | null;
  sample_size: number;
  notes: string | null;
  created_at: string;
};

export type VehicleCompetitorPriceRow = {
  id: string;
  source_name: string;
  competitor_name: string | null;
  listing_url: string | null;
  price: number;
  currency_code: string;
  mileage: number;
  location: string | null;
  observed_at: string;
  notes: string | null;
};

export type VehicleHistoryReportRow = {
  id: string;
  provider: string;
  provider_report_id: string | null;
  report_url: string | null;
  report_status: string;
  risk_summary: string;
  accident_count: number;
  owner_count: number;
  odometer_issue: boolean;
  salvage_or_theft_flag: boolean;
  notes: string | null;
  created_at: string;
};

export type VehicleEnrichmentLogRow = {
  id: string;
  event_type: string;
  source_table: string | null;
  source_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
};

export type VehicleIntelligence = {
  latestVinDecode: VinDecodeRequestRow | null;
  latestMarketValue: VehicleMarketValueRow | null;
  competitorPrices: VehicleCompetitorPriceRow[];
  latestHistoryReport: VehicleHistoryReportRow | null;
  enrichmentLogs: VehicleEnrichmentLogRow[];
};

export async function getVehiclePermissions(companyId: string): Promise<VehiclePermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewCost: permissions.has(PERMISSIONS.VIEW_VEHICLE_COST),
    canViewProfit: permissions.has(PERMISSIONS.VIEW_VEHICLE_PROFIT),
    canCreate: permissions.has(PERMISSIONS.CREATE_VEHICLE),
    canUpdate: permissions.has(PERMISSIONS.UPDATE_VEHICLE),
    canDelete: permissions.has(PERMISSIONS.DELETE_VEHICLE),
    canUploadDocuments: permissions.has(PERMISSIONS.UPLOAD_DOCUMENTS),
    canVerifyDocuments: permissions.has(PERMISSIONS.VERIFY_DOCUMENTS),
    canManageIntelligence: permissions.has(PERMISSIONS.MANAGE_VEHICLE_INTELLIGENCE),
  };
}

export async function getVehicles(companyId: string, filters: VehicleInventoryFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("vehicles")
    .select(
      "id, stock_number, vin, brand, model, year, trim, condition, mileage, branch_id, current_country_code, total_landed_cost, selling_price, expected_profit, profit_margin, currency_code, status, export_available, documents_status, photos_status, acquired_at, branches(name, code, country_code)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(
      `stock_number.ilike.%${search}%,vin.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,trim.ilike.%${search}%`,
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.branchId && filters.branchId !== "all") {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.brand && filters.brand !== "all") {
    query = query.eq("brand", filters.brand);
  }

  if (filters.exportAvailable === "true") {
    query = query.eq("export_available", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as VehicleListRow[];
}

export async function getVehicleDetail(companyId: string, vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, stock_number, vin, brand, model, year, trim, condition, mileage, branch_id, current_country_code, total_landed_cost, selling_price, expected_profit, profit_margin, currency_code, status, export_available, documents_status, photos_status, acquired_at, branches(name, code, country_code), exterior_color, interior_color, engine, transmission, drivetrain, fuel_type, body_type, seats, doors, origin_country_code, current_location, purchase_price, shipping_cost, customs_cost, preparation_cost, marketing_cost, other_expenses, website_listing_status, social_media_status, created_at",
    )
    .eq("company_id", companyId)
    .eq("id", vehicleId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as VehicleDetail;
}

export async function getVehiclePricingRows(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, stock_number, vin, brand, model, year, trim, condition, mileage, branch_id, current_country_code, total_landed_cost, selling_price, expected_profit, profit_margin, currency_code, status, export_available, documents_status, photos_status, acquired_at, purchase_price, shipping_cost, customs_cost, preparation_cost, marketing_cost, other_expenses, branches(name, code, country_code), vehicle_costs(transport_cost, inspection_cost, repair_cost, detailing_cost, commission_cost)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as VehiclePricingRow[];
}

export async function getVehiclePricingRow(companyId: string, vehicleId: string) {
  const rows = await getVehiclePricingRows(companyId);
  return rows.find((row) => row.id === vehicleId) ?? rows[0] ?? null;
}

export async function getVehicleIntelligence(companyId: string, vehicleId: string): Promise<VehicleIntelligence> {
  const supabase = await createClient();
  const [
    vinDecodeResult,
    marketValueResult,
    competitorPricesResult,
    historyReportResult,
    enrichmentLogsResult,
  ] = await Promise.all([
    supabase
      .from("vin_decode_requests")
      .select("id, vin, provider, status, decoded_brand, decoded_model, decoded_year, decoded_trim, decoded_body_type, decoded_engine, decoded_transmission, confidence_score, notes, created_at")
      .eq("company_id", companyId)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("vehicle_market_values")
      .select("id, provider, market_country_code, market_currency_code, market_low, market_average, market_high, recommended_price, confidence_score, sample_size, notes, created_at")
      .eq("company_id", companyId)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("vehicle_competitor_prices")
      .select("id, source_name, competitor_name, listing_url, price, currency_code, mileage, location, observed_at, notes")
      .eq("company_id", companyId)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("observed_at", { ascending: false })
      .limit(8),
    supabase
      .from("vehicle_history_reports")
      .select("id, provider, provider_report_id, report_url, report_status, risk_summary, accident_count, owner_count, odometer_issue, salvage_or_theft_flag, notes, created_at")
      .eq("company_id", companyId)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("vehicle_enrichment_logs")
      .select("id, event_type, source_table, source_id, title, description, created_at")
      .eq("company_id", companyId)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  for (const result of [vinDecodeResult, marketValueResult, competitorPricesResult, historyReportResult, enrichmentLogsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    latestVinDecode: ((vinDecodeResult.data ?? [])[0] ?? null) as VinDecodeRequestRow | null,
    latestMarketValue: ((marketValueResult.data ?? [])[0] ?? null) as VehicleMarketValueRow | null,
    competitorPrices: (competitorPricesResult.data ?? []) as VehicleCompetitorPriceRow[],
    latestHistoryReport: ((historyReportResult.data ?? [])[0] ?? null) as VehicleHistoryReportRow | null,
    enrichmentLogs: (enrichmentLogsResult.data ?? []) as VehicleEnrichmentLogRow[],
  };
}

export async function getVehiclePricingIntelligence(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_market_values")
    .select("vehicle_id, market_average, recommended_price, market_currency_code, sample_size, created_at")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((row) => [
      row.vehicle_id as string,
      {
        marketAverage: Number(row.market_average),
        recommendedPrice: Number(row.recommended_price),
        currencyCode: String(row.market_currency_code),
        sampleSize: Number(row.sample_size),
      },
    ]),
  );
}

export async function getVehicleStatusHistory(companyId: string, vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_status_history")
    .select("id, previous_status, new_status, reason, changed_at")
    .eq("company_id", companyId)
    .eq("vehicle_id", vehicleId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getVehicleBranchMovements(companyId: string, vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_branch_movements")
    .select("id, from_branch_id, to_branch_id, reason, moved_at")
    .eq("company_id", companyId)
    .eq("vehicle_id", vehicleId)
    .order("moved_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function signedUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function getVehiclePhotos(companyId: string, vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_photos")
    .select("id, storage_bucket, storage_path, alt_text, sort_order, is_primary")
    .eq("company_id", companyId)
    .eq("vehicle_id", vehicleId)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    ((data ?? []) as VehiclePhotoRow[]).map(async (photo) => ({
      ...photo,
      signed_url: await signedUrl(photo.storage_bucket, photo.storage_path),
    })),
  );
}

export async function getVehicleDocuments(companyId: string, vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select("id, document_type, title, storage_bucket, storage_path, status, expires_at")
    .eq("company_id", companyId)
    .eq("vehicle_id", vehicleId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    ((data ?? []) as VehicleDocumentRow[]).map(async (document) => ({
      ...document,
      signed_url: await signedUrl(document.storage_bucket, document.storage_path),
    })),
  );
}

export async function getVehicleDocumentChecklist(companyId: string, vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_document_checklists")
    .select(
      "id, document_type, title, is_required, is_export_required, status, due_at, completed_at, vehicle_document_id",
    )
    .eq("company_id", companyId)
    .eq("vehicle_id", vehicleId)
    .order("is_required", { ascending: false })
    .order("is_export_required", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VehicleChecklistRow[];
}

export function getInventoryStats(vehicles: VehicleListRow[]) {
  return {
    total: vehicles.length,
    available: vehicles.filter((vehicle) => vehicle.status === "available").length,
    reserved: vehicles.filter((vehicle) => vehicle.status === "reserved").length,
    sold: vehicles.filter((vehicle) => vehicle.status === "sold").length,
    inTransit: vehicles.filter((vehicle) => vehicle.status === "in_transit").length,
    inventoryValue: vehicles.reduce((sum, vehicle) => sum + Number(vehicle.selling_price), 0),
  };
}

export function getVehicleFilterOptions(vehicles: VehicleListRow[]) {
  return {
    brands: Array.from(new Set(vehicles.map((vehicle) => vehicle.brand))).sort(),
  };
}
