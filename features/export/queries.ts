import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import {
  calculateShipmentCostSummary,
  getExportDocumentCompletion,
  getExportRiskFlags,
} from "@/lib/export/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export type ExportPermissions = {
  canViewExports: boolean;
  canManageExports: boolean;
  canUpdateExportStatus: boolean;
  canManageLogisticsPartners: boolean;
};

export type ExportOrderFilters = {
  search?: string;
  status?: string;
  shippingStatus?: string;
  destination?: string;
  branchId?: string;
};

export type DestinationCountryRow = {
  id: string;
  country_code: string;
  country_name: string;
  region: string;
  common_ports: string[];
  currency_code: string | null;
};

export type LogisticsPartnerRow = {
  id: string;
  partner_type: string;
  name: string;
  country_code: string | null;
  city: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
};

export type ExportOrderRow = {
  id: string;
  company_id: string;
  branch_id: string;
  export_order_number: string;
  customer_id: string | null;
  vehicle_id: string;
  sales_invoice_id: string | null;
  proforma_invoice_id: string | null;
  destination_country_code: string;
  destination_port: string;
  shipping_method: string;
  shipping_company_id: string | null;
  logistics_partner_id: string | null;
  booking_number: string | null;
  container_number: string | null;
  bl_number: string | null;
  estimated_departure_date: string | null;
  estimated_arrival_date: string | null;
  actual_departure_date: string | null;
  actual_arrival_date: string | null;
  shipping_status: string;
  customs_status: string;
  payment_status: string;
  document_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  branches: { name: string; code: string; country_code: string } | null;
  vehicles: { stock_number: string; brand: string; model: string; year: number; trim: string | null; selling_price: number; currency_code: string } | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
};

export type ImportOrderRow = {
  id: string;
  company_id: string;
  branch_id: string;
  import_order_number: string;
  supplier_name: string;
  origin_country_code: string;
  origin_port: string | null;
  destination_country_code: string;
  destination_port: string | null;
  shipping_method: string;
  logistics_partner_id: string | null;
  vehicle_count: number;
  estimated_departure_date: string | null;
  estimated_arrival_date: string | null;
  shipping_status: string;
  customs_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  branches: { name: string; code: string; country_code: string } | null;
};

export type ShippingEventRow = {
  id: string;
  event_status: string;
  event_date: string;
  location: string | null;
  notes: string | null;
  created_at: string;
};

export type CustomsClearanceRow = {
  id: string;
  broker_id: string | null;
  customs_status: string;
  declaration_number: string | null;
  inspection_date: string | null;
  cleared_date: string | null;
  duties_amount: number;
  currency_code: string;
  notes: string | null;
  logistics_partners: { name: string; partner_type: string } | null;
};

export type ExportDocumentRow = {
  id: string;
  document_type: string;
  title: string;
  status: string;
  is_required: boolean;
  storage_bucket: string | null;
  storage_path: string | null;
  expires_at: string | null;
  verified_at: string | null;
};

export type ShipmentCostRow = {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  currency_code: string;
  cost_date: string;
  supplier_name: string | null;
};

export async function getExportPermissions(companyId: string): Promise<ExportPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewExports: permissions.has(PERMISSIONS.VIEW_EXPORTS) || permissions.has(PERMISSIONS.MANAGE_EXPORTS),
    canManageExports: permissions.has(PERMISSIONS.MANAGE_EXPORTS),
    canUpdateExportStatus: permissions.has(PERMISSIONS.UPDATE_EXPORT_STATUS) || permissions.has(PERMISSIONS.MANAGE_EXPORTS),
    canManageLogisticsPartners: permissions.has(PERMISSIONS.MANAGE_LOGISTICS_PARTNERS),
  };
}

export async function getDestinationCountries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("destination_countries")
    .select("id, country_code, country_name, region, common_ports, currency_code")
    .eq("active", true)
    .order("region", { ascending: true })
    .order("country_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DestinationCountryRow[];
}

export async function getLogisticsPartners(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logistics_partners")
    .select("id, partner_type, name, country_code, city, contact_name, phone, email")
    .eq("company_id", companyId)
    .eq("active", true)
    .is("deleted_at", null)
    .order("partner_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LogisticsPartnerRow[];
}

export async function getExportOrders(companyId: string, filters: ExportOrderFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("export_orders")
    .select(
      "id, company_id, branch_id, export_order_number, customer_id, vehicle_id, sales_invoice_id, proforma_invoice_id, destination_country_code, destination_port, shipping_method, shipping_company_id, logistics_partner_id, booking_number, container_number, bl_number, estimated_departure_date, estimated_arrival_date, actual_departure_date, actual_arrival_date, shipping_status, customs_status, payment_status, document_status, status, notes, created_at, branches(name, code, country_code), vehicles(stock_number, brand, model, year, trim, selling_price, currency_code), customers(name, phone, email)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(
      `export_order_number.ilike.%${search}%,booking_number.ilike.%${search}%,container_number.ilike.%${search}%,bl_number.ilike.%${search}%,destination_port.ilike.%${search}%`,
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.shippingStatus && filters.shippingStatus !== "all") {
    query = query.eq("shipping_status", filters.shippingStatus);
  }

  if (filters.destination && filters.destination !== "all") {
    query = query.eq("destination_country_code", filters.destination);
  }

  if (filters.branchId && filters.branchId !== "all") {
    query = query.eq("branch_id", filters.branchId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ExportOrderRow[];
}

export async function getImportOrders(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_orders")
    .select(
      "id, company_id, branch_id, import_order_number, supplier_name, origin_country_code, origin_port, destination_country_code, destination_port, shipping_method, logistics_partner_id, vehicle_count, estimated_departure_date, estimated_arrival_date, shipping_status, customs_status, status, notes, created_at, branches(name, code, country_code)",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ImportOrderRow[];
}

export async function getExportOrderDetail(companyId: string, exportOrderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("export_orders")
    .select(
      "id, company_id, branch_id, export_order_number, customer_id, vehicle_id, sales_invoice_id, proforma_invoice_id, destination_country_code, destination_port, shipping_method, shipping_company_id, logistics_partner_id, booking_number, container_number, bl_number, estimated_departure_date, estimated_arrival_date, actual_departure_date, actual_arrival_date, shipping_status, customs_status, payment_status, document_status, status, notes, created_at, branches(name, code, country_code), vehicles(stock_number, brand, model, year, trim, selling_price, currency_code), customers(name, phone, email)",
    )
    .eq("company_id", companyId)
    .eq("id", exportOrderId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ExportOrderRow;
}

export async function getExportOrderTracking(companyId: string, exportOrderId: string) {
  const supabase = await createClient();
  const [eventsResult, customsResult, documentsResult, costsResult] = await Promise.all([
    supabase
      .from("shipping_events")
      .select("id, event_status, event_date, location, notes, created_at")
      .eq("company_id", companyId)
      .eq("export_order_id", exportOrderId)
      .order("event_date", { ascending: false }),
    supabase
      .from("customs_clearance")
      .select("id, broker_id, customs_status, declaration_number, inspection_date, cleared_date, duties_amount, currency_code, notes, logistics_partners(name, partner_type)")
      .eq("company_id", companyId)
      .eq("export_order_id", exportOrderId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("export_documents")
      .select("id, document_type, title, status, is_required, storage_bucket, storage_path, expires_at, verified_at")
      .eq("company_id", companyId)
      .eq("export_order_id", exportOrderId)
      .is("deleted_at", null)
      .order("is_required", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("shipment_costs")
      .select("id, cost_type, description, amount, currency_code, cost_date, supplier_name")
      .eq("company_id", companyId)
      .eq("export_order_id", exportOrderId)
      .is("deleted_at", null)
      .order("cost_date", { ascending: false }),
  ]);

  for (const result of [eventsResult, customsResult, documentsResult, costsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    events: (eventsResult.data ?? []) as ShippingEventRow[],
    customs: (customsResult.data ?? []) as unknown as CustomsClearanceRow[],
    documents: (documentsResult.data ?? []) as ExportDocumentRow[],
    costs: (costsResult.data ?? []) as ShipmentCostRow[],
  };
}

export function getExportDashboardStats(orders: ExportOrderRow[]) {
  return {
    total: orders.length,
    active: orders.filter((order) => order.status === "active").length,
    delayed: orders.filter((order) => order.status === "delayed").length,
    inTransit: orders.filter((order) => ["booked", "vehicle_delivered_to_port", "loaded", "shipped"].includes(order.shipping_status)).length,
    customsPending: orders.filter((order) => ["pending_documents", "submitted", "inspection", "duties_pending", "under_clearance", "delayed"].includes(order.customs_status)).length,
    missingDocuments: orders.filter((order) => ["missing", "expired"].includes(order.document_status)).length,
    readyForExport: orders.filter((order) => order.document_status === "verified" && ["waiting_booking", "booked"].includes(order.shipping_status)).length,
  };
}

export function getExportOrderOperationalSummary(order: ExportOrderRow, documents: ExportDocumentRow[], costs: ShipmentCostRow[]) {
  return {
    documents: getExportDocumentCompletion(documents),
    costs: calculateShipmentCostSummary(costs),
    risks: getExportRiskFlags({
      shippingStatus: order.shipping_status,
      customsStatus: order.customs_status,
      documentStatus: order.document_status,
      estimatedArrivalDate: order.estimated_arrival_date,
    }),
  };
}
