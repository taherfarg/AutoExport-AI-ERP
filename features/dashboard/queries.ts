import { createClient } from "@/lib/supabase/server";
import type { VehicleListRow } from "@/features/vehicles/queries";
import type { LeadListRow } from "@/features/crm/queries";
import type { InvoiceRow } from "@/features/sales/queries";
import type { ExportOrderRow } from "@/features/export/queries";

/* ---------- Aggregate KPIs ---------- */

export type DashboardKpis = {
  totalCars: number;
  availableCars: number;
  reservedCars: number;
  soldThisMonth: number;
  inTransit: number;
  underCustoms: number;
  readyForExport: number;
  inventoryValue: number;
  monthlySales: number;
  monthlyProfit: number;
  pendingPayments: number;
  newLeads: number;
  hotLeads: number;
  followUpsDueToday: number;
  missingDocuments: number;
  lowMarginCars: number;
  agingStock60Days: number;
  currency: string;
};

export function computeDashboardKpis(
  vehicles: VehicleListRow[],
  leads: LeadListRow[],
  invoices: InvoiceRow[],
  exportOrders: ExportOrderRow[],
): DashboardKpis {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().split("T")[0];
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const currency = vehicles[0]?.currency_code ?? "AED";

  const soldThisMonth = vehicles.filter(
    (v) => v.status === "sold" && new Date(v.acquired_at) >= monthStart,
  ).length;

  const monthlySales = invoices
    .filter((i) => new Date(i.created_at) >= monthStart)
    .reduce((s, i) => s + Number(i.total), 0);

  const monthlyProfit = vehicles
    .filter((v) => v.status === "sold" && new Date(v.acquired_at) >= monthStart)
    .reduce((s, v) => s + Number(v.expected_profit), 0);

  const pendingPayments = invoices
    .filter((i) => i.invoice_status !== "paid" && i.invoice_status !== "cancelled")
    .reduce((s, i) => s + Number(i.balance_due), 0);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const newLeads = leads.filter((l) => new Date(l.created_at) >= thirtyDaysAgo).length;
  const hotLeads = leads.filter((l) => l.lead_score >= 70).length;

  const followUpsDueToday = leads.filter(
    (l) => l.next_follow_up_at && l.next_follow_up_at.startsWith(todayStr),
  ).length;

  const missingDocuments = vehicles.filter((v) => v.documents_status !== "complete").length;
  const lowMarginCars = vehicles.filter(
    (v) => v.status === "available" && Number(v.profit_margin) < 5,
  ).length;
  const agingStock60Days = vehicles.filter(
    (v) =>
      v.status === "available" &&
      new Date(v.acquired_at) <= sixtyDaysAgo,
  ).length;

  return {
    totalCars: vehicles.length,
    availableCars: vehicles.filter((v) => v.status === "available").length,
    reservedCars: vehicles.filter((v) => v.status === "reserved").length,
    soldThisMonth,
    inTransit: exportOrders.filter((o) =>
      ["booked", "vehicle_delivered_to_port", "loaded", "shipped"].includes(o.shipping_status),
    ).length,
    underCustoms: exportOrders.filter((o) =>
      ["under_clearance", "inspection", "duties_pending"].includes(o.customs_status),
    ).length,
    readyForExport: vehicles.filter((v) => v.status === "ready_for_export").length,
    inventoryValue: vehicles
      .filter((v) => !["sold", "cancelled", "delivered"].includes(v.status))
      .reduce((s, v) => s + Number(v.selling_price), 0),
    monthlySales,
    monthlyProfit,
    pendingPayments,
    newLeads,
    hotLeads,
    followUpsDueToday,
    missingDocuments,
    lowMarginCars,
    agingStock60Days,
    currency,
  };
}

/* ---------- Chart data aggregators ---------- */

/** Sales by month (last 6 months) */
export function salesByMonth(invoices: InvoiceRow[]) {
  const now = new Date();
  const months: { label: string; revenue: number; profit: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const monthInvoices = invoices.filter((inv) => {
      const date = new Date(inv.created_at);
      return date >= d && date < nextMonth;
    });

    months.push({
      label,
      revenue: monthInvoices.reduce((s, inv) => s + Number(inv.total), 0),
      profit: monthInvoices.reduce((s, inv) => s + (Number(inv.total) - Number(inv.paid_amount)), 0),
    });
  }
  return months;
}

/** Stock by brand */
export function stockByBrand(vehicles: VehicleListRow[]) {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    if (["sold", "cancelled", "delivered"].includes(v.status)) continue;
    map.set(v.brand, (map.get(v.brand) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/** Stock by branch */
export function stockByBranch(vehicles: VehicleListRow[]) {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    if (["sold", "cancelled", "delivered"].includes(v.status)) continue;
    const branchName = v.branches?.name ?? "Unknown";
    map.set(branchName, (map.get(branchName) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([branch, count]) => ({ branch, count }));
}

/** Leads by source */
export function leadsBySource(leads: LeadListRow[]) {
  const map = new Map<string, number>();
  for (const l of leads) {
    const source = l.lead_source || "unknown";
    map.set(source, (map.get(source) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([source, count]) => ({ source: formatLabel(source), count }))
    .sort((a, b) => b.count - a.count);
}

/** Cars by status */
export function carsByStatus(vehicles: VehicleListRow[]) {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    map.set(v.status, (map.get(v.status) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({
    status: formatLabel(status),
    count,
  }));
}

/** Export destinations */
export function exportDestinations(orders: ExportOrderRow[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    map.set(o.destination_country_code, (map.get(o.destination_country_code) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/** Stock aging distribution */
export function stockAging(vehicles: VehicleListRow[]) {
  const now = Date.now();
  const buckets = { "0-30d": 0, "31-60d": 0, "61-90d": 0, "90d+": 0 };

  for (const v of vehicles) {
    if (["sold", "cancelled", "delivered"].includes(v.status)) continue;
    const days = Math.floor((now - new Date(v.acquired_at).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 30) buckets["0-30d"]++;
    else if (days <= 60) buckets["31-60d"]++;
    else if (days <= 90) buckets["61-90d"]++;
    else buckets["90d+"]++;
  }

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

/** Profit by branch */
export function profitByBranch(vehicles: VehicleListRow[]) {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    if (v.status !== "sold") continue;
    const branchName = v.branches?.name ?? "Unknown";
    map.set(branchName, (map.get(branchName) ?? 0) + Number(v.expected_profit));
  }
  return Array.from(map.entries())
    .map(([branch, profit]) => ({ branch, profit: Math.round(profit) }))
    .sort((a, b) => b.profit - a.profit);
}

/** Inventory value trend (simulated from current data) */
export function inventoryValueByBranch(vehicles: VehicleListRow[]) {
  const map = new Map<string, number>();
  for (const v of vehicles) {
    if (["sold", "cancelled", "delivered"].includes(v.status)) continue;
    const branchName = v.branches?.name ?? "Unknown";
    map.set(branchName, (map.get(branchName) ?? 0) + Number(v.selling_price));
  }
  return Array.from(map.entries())
    .map(([branch, value]) => ({ branch, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

/* ---------- Helpers ---------- */

function formatLabel(raw: string) {
  return raw
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/* ---------- Dashboard data loader ---------- */

export async function loadDashboardData(companyId: string) {
  const supabase = await createClient();

  const [vehiclesResult, leadsResult, invoicesResult, exportsResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, stock_number, vin, brand, model, year, trim, condition, mileage, branch_id, current_country_code, total_landed_cost, selling_price, expected_profit, profit_margin, currency_code, status, export_available, documents_status, photos_status, acquired_at, branches(name, code, country_code)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null),
    supabase
      .from("leads")
      .select(
        "id, company_id, branch_id, customer_id, name, customer_type, phone, whatsapp, email, country_code, city, preferred_brand, preferred_model, budget, currency_code, language, lead_source, assigned_salesperson_id, status, lead_score, last_contact_at, next_follow_up_at, notes, created_at, branches(name, code, country_code)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null),
    supabase
      .from("sales_invoices")
      .select(
        "id, invoice_number, quotation_id, reservation_id, customer_id, vehicle_id, final_price, tax, total, paid_amount, balance_due, currency_code, due_date, invoice_status, created_at, branches(name, code), vehicles(stock_number, brand, model, year), customers(name, phone, email)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null),
    supabase
      .from("export_orders")
      .select(
        "id, company_id, branch_id, export_order_number, customer_id, vehicle_id, sales_invoice_id, proforma_invoice_id, destination_country_code, destination_port, shipping_method, shipping_company_id, logistics_partner_id, booking_number, container_number, bl_number, estimated_departure_date, estimated_arrival_date, actual_departure_date, actual_arrival_date, shipping_status, customs_status, payment_status, document_status, status, notes, created_at, branches(name, code, country_code), vehicles(stock_number, brand, model, year, trim, selling_price, currency_code), customers(name, phone, email)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null),
  ]);

  const vehicles = (vehiclesResult.data ?? []) as unknown as VehicleListRow[];
  const leads = (leadsResult.data ?? []) as unknown as LeadListRow[];
  const invoices = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
  const exportOrders = (exportsResult.data ?? []) as unknown as ExportOrderRow[];

  return { vehicles, leads, invoices, exportOrders };
}
