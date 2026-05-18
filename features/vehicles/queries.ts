import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

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
};

export async function getVehiclePermissions(companyId: string): Promise<VehiclePermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewCost: permissions.has(PERMISSIONS.VIEW_VEHICLE_COST),
    canViewProfit: permissions.has(PERMISSIONS.VIEW_VEHICLE_PROFIT),
    canCreate: permissions.has(PERMISSIONS.CREATE_VEHICLE),
    canUpdate: permissions.has(PERMISSIONS.UPDATE_VEHICLE),
    canDelete: permissions.has(PERMISSIONS.DELETE_VEHICLE),
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

