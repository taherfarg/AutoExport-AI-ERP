import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PartsPermissions = {
  canViewParts: boolean;
  canManageParts: boolean;
  canManagePartOrders: boolean;
  canTransferParts: boolean;
};

export type PartSupplierRow = {
  id: string;
  supplier_name: string;
  country_code: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

export type PartRow = {
  id: string;
  part_number: string;
  sku: string | null;
  name: string;
  category: string | null;
  brand: string | null;
  unit_cost: number;
  selling_price: number;
  currency_code: string;
  status: string;
  reorder_point: number;
  reorder_quantity: number;
};

export type PartStockRow = {
  id: string;
  branch_id: string;
  part_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  average_cost: number;
  currency_code: string;
  bin_location: string | null;
  status: string;
  parts: { part_number: string; name: string; reorder_point: number } | null;
  branches: { name: string; code: string } | null;
};

export type PartPurchaseOrderRow = {
  id: string;
  branch_id: string;
  supplier_id: string | null;
  purchase_order_number: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  part_suppliers: { supplier_name: string } | null;
  branches: { name: string; code: string } | null;
};

export type PartPurchaseOrderItemRow = {
  id: string;
  purchase_order_id: string;
  part_id: string;
  description: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
  parts: { part_number: string; name: string } | null;
  part_purchase_orders: { purchase_order_number: string; branch_id: string } | null;
};

export type PartReceiptRow = {
  id: string;
  branch_id: string;
  receipt_number: string;
  status: string;
  received_at: string;
  part_purchase_orders: { purchase_order_number: string } | null;
  branches: { name: string; code: string } | null;
};

export type PartTransferRow = {
  id: string;
  part_id: string;
  from_branch_id: string;
  to_branch_id: string;
  transfer_number: string;
  quantity: number;
  status: string;
  parts: { part_number: string; name: string } | null;
};

export type ServicePartLineRow = {
  id: string;
  service_order_id: string;
  service_job_id: string | null;
  part_id: string;
  line_number: string;
  description: string;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  line_total: number;
  gross_profit: number;
  status: string;
  service_orders: { order_number: string; title: string } | null;
  parts: { part_number: string; name: string } | null;
};

export type PartReorderAlertRow = {
  id: string;
  branch_id: string;
  part_id: string;
  alert_number: string;
  current_quantity: number;
  reorder_point: number;
  status: string;
  parts: { part_number: string; name: string } | null;
  branches: { name: string; code: string } | null;
};

export type PartServiceOrderOption = {
  id: string;
  branch_id: string;
  order_number: string;
  title: string;
  currency_code: string;
};

export type PartServiceJobOption = {
  id: string;
  service_order_id: string;
  job_number: string;
  title: string;
};

export async function getPartsPermissions(companyId: string): Promise<PartsPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewParts: permissions.has(PERMISSIONS.VIEW_PARTS) || permissions.has(PERMISSIONS.MANAGE_PARTS),
    canManageParts: permissions.has(PERMISSIONS.MANAGE_PARTS),
    canManagePartOrders: permissions.has(PERMISSIONS.MANAGE_PART_ORDERS),
    canTransferParts: permissions.has(PERMISSIONS.TRANSFER_PARTS) || permissions.has(PERMISSIONS.MANAGE_PARTS),
  };
}

export async function getPartsInventoryData(companyId: string) {
  const supabase = createServiceRoleClient();
  const [
    suppliersResult,
    partsResult,
    stockResult,
    purchaseOrdersResult,
    purchaseItemsResult,
    receiptsResult,
    transfersResult,
    servicePartsResult,
    reorderAlertsResult,
    serviceOrdersResult,
    serviceJobsResult,
  ] = await Promise.all([
    supabase.from("part_suppliers").select("id, supplier_name, country_code, contact_name, email, phone, status").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("parts").select("id, part_number, sku, name, category, brand, unit_cost, selling_price, currency_code, status, reorder_point, reorder_quantity").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("part_stock").select("id, branch_id, part_id, quantity_on_hand, quantity_reserved, quantity_available, average_cost, currency_code, bin_location, status, parts(part_number, name, reorder_point), branches(name, code)").eq("company_id", companyId).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("part_purchase_orders").select("id, branch_id, supplier_id, purchase_order_number, status, subtotal, tax_amount, total_amount, currency_code, part_suppliers(supplier_name), branches(name, code)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("part_purchase_order_items").select("id, purchase_order_id, part_id, description, quantity_ordered, quantity_received, unit_cost, line_total, parts(part_number, name), part_purchase_orders(purchase_order_number, branch_id)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("part_receipts").select("id, branch_id, receipt_number, status, received_at, part_purchase_orders(purchase_order_number), branches(name, code)").eq("company_id", companyId).is("deleted_at", null).order("received_at", { ascending: false }),
    supabase.from("part_transfers").select("id, part_id, from_branch_id, to_branch_id, transfer_number, quantity, status, parts(part_number, name)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_parts_lines").select("id, service_order_id, service_job_id, part_id, line_number, description, quantity, unit_cost, selling_price, line_total, gross_profit, status, service_orders(order_number, title), parts(part_number, name)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("part_reorder_alerts").select("id, branch_id, part_id, alert_number, current_quantity, reorder_point, status, parts(part_number, name), branches(name, code)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_orders").select("id, branch_id, order_number, title, currency_code").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("service_jobs").select("id, service_order_id, job_number, title").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
  ]);

  for (const result of [suppliersResult, partsResult, stockResult, purchaseOrdersResult, purchaseItemsResult, receiptsResult, transfersResult, servicePartsResult, reorderAlertsResult, serviceOrdersResult, serviceJobsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const parts = (partsResult.data ?? []) as PartRow[];
  const stock = (stockResult.data ?? []) as unknown as PartStockRow[];
  const purchaseOrders = (purchaseOrdersResult.data ?? []) as unknown as PartPurchaseOrderRow[];
  const serviceParts = (servicePartsResult.data ?? []) as unknown as ServicePartLineRow[];
  const reorderAlerts = (reorderAlertsResult.data ?? []) as unknown as PartReorderAlertRow[];

  return {
    suppliers: (suppliersResult.data ?? []) as PartSupplierRow[],
    parts,
    stock,
    purchaseOrders,
    purchaseItems: (purchaseItemsResult.data ?? []) as unknown as PartPurchaseOrderItemRow[],
    receipts: (receiptsResult.data ?? []) as unknown as PartReceiptRow[],
    transfers: (transfersResult.data ?? []) as unknown as PartTransferRow[],
    serviceParts,
    reorderAlerts,
    serviceOrders: (serviceOrdersResult.data ?? []) as PartServiceOrderOption[],
    serviceJobs: (serviceJobsResult.data ?? []) as PartServiceJobOption[],
    summary: {
      catalogParts: parts.length,
      stockUnits: stock.reduce((sum, item) => sum + Number(item.quantity_on_hand), 0),
      lowStock: stock.filter((item) => ["low_stock", "out_of_stock"].includes(item.status)).length,
      openPurchaseValue: purchaseOrders.filter((order) => !["received", "cancelled"].includes(order.status)).reduce((sum, order) => sum + Number(order.total_amount), 0),
      servicePartsProfit: serviceParts.reduce((sum, line) => sum + Number(line.gross_profit), 0),
      openReorderAlerts: reorderAlerts.filter((alert) => alert.status === "open").length,
    },
  };
}
