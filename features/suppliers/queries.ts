import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import {
  calculateSupplierAging,
  calculateSupplierFinancials,
  getSupplierRiskLevel,
  type SupplierAgingSummary,
  type SupplierFinancialSummary,
} from "@/lib/suppliers/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type SupplierPermissions = {
  canViewSuppliers: boolean;
  canManageSuppliers: boolean;
};

export type SupplierRow = {
  id: string;
  supplier_code: string | null;
  supplier_name: string;
  legal_name: string | null;
  category: string;
  status: string;
  country_code: string | null;
  city: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tax_registration_number: string | null;
  payment_terms_days: number;
  currency_code: string;
  bank_name: string | null;
  notes: string | null;
};

export type SupplierPayableRow = {
  id: string;
  supplier_id: string | null;
  payable_number: string;
  supplier_name: string;
  description: string;
  amount: number;
  paid_amount: number;
  balance_due: number;
  currency_code: string;
  due_date: string | null;
  status: string;
};

export type SupplierExpenseRow = {
  id: string;
  supplier_id: string | null;
  expense_number: string;
  description: string;
  amount: number;
  currency_code: string;
  expense_date: string;
  supplier_name: string | null;
  status: string;
};

export type SupplierPurchaseOrderRow = {
  id: string;
  supplier_id: string | null;
  purchase_order_number: string;
  total_amount: number;
  currency_code: string;
  status: string;
};

export type SupplierWithSummary = SupplierRow & {
  financials: SupplierFinancialSummary;
  aging: SupplierAgingSummary;
  riskLevel: "low" | "medium" | "high";
  payables: SupplierPayableRow[];
  expenses: SupplierExpenseRow[];
  purchaseOrders: SupplierPurchaseOrderRow[];
};

export async function getSupplierPermissions(companyId: string): Promise<SupplierPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);
  const canView =
    permissions.has(PERMISSIONS.MANAGE_SUPPLIERS) ||
    permissions.has(PERMISSIONS.VIEW_FINANCE) ||
    permissions.has(PERMISSIONS.MANAGE_FINANCE) ||
    permissions.has(PERMISSIONS.VIEW_ACCOUNTING) ||
    permissions.has(PERMISSIONS.MANAGE_ACCOUNTING) ||
    permissions.has(PERMISSIONS.VIEW_PARTS) ||
    permissions.has(PERMISSIONS.MANAGE_PARTS);

  return {
    canViewSuppliers: canView,
    canManageSuppliers:
      permissions.has(PERMISSIONS.MANAGE_SUPPLIERS) ||
      permissions.has(PERMISSIONS.MANAGE_FINANCE) ||
      permissions.has(PERMISSIONS.MANAGE_ACCOUNTING) ||
      permissions.has(PERMISSIONS.MANAGE_PARTS),
  };
}

export async function getSupplierDashboardData(companyId: string) {
  const supabase = createServiceRoleClient();
  const [suppliersResult, payablesResult, expensesResult, purchaseOrdersResult] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, supplier_code, supplier_name, legal_name, category, status, country_code, city, contact_name, email, phone, tax_registration_number, payment_terms_days, currency_code, bank_name, notes")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("supplier_name", { ascending: true }),
    supabase
      .from("payables")
      .select("id, supplier_id, payable_number, supplier_name, description, amount, paid_amount, balance_due, currency_code, due_date, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("due_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, supplier_id, expense_number, description, amount, currency_code, expense_date, supplier_name, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false }),
    supabase
      .from("part_purchase_orders")
      .select("id, supplier_id, purchase_order_number, total_amount, currency_code, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [suppliersResult, payablesResult, expensesResult, purchaseOrdersResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const suppliers = (suppliersResult.data ?? []) as SupplierRow[];
  const payables = (payablesResult.data ?? []) as SupplierPayableRow[];
  const expenses = (expensesResult.data ?? []) as SupplierExpenseRow[];
  const purchaseOrders = (purchaseOrdersResult.data ?? []) as SupplierPurchaseOrderRow[];
  const asOfDate = new Date().toISOString().slice(0, 10);

  const suppliersWithSummary: SupplierWithSummary[] = suppliers.map((supplier) => {
    const supplierPayables = payables.filter((payable) => payable.supplier_id === supplier.id || payable.supplier_name === supplier.supplier_name);
    const supplierExpenses = expenses.filter((expense) => expense.supplier_id === supplier.id || expense.supplier_name === supplier.supplier_name);
    const supplierPurchaseOrders = purchaseOrders.filter((order) => order.supplier_id === supplier.id);
    const financials = calculateSupplierFinancials({
      payables: supplierPayables.map((payable) => ({
        amount: Number(payable.amount),
        paidAmount: Number(payable.paid_amount),
        balanceDue: Number(payable.balance_due),
        dueDate: payable.due_date,
        status: payable.status,
      })),
      expenses: supplierExpenses.map((expense) => ({ amount: Number(expense.amount) })),
      purchaseOrders: supplierPurchaseOrders.map((order) => ({ totalAmount: Number(order.total_amount), status: order.status })),
    });
    const aging = calculateSupplierAging(
      supplierPayables.map((payable) => ({
        amount: Number(payable.amount),
        paidAmount: Number(payable.paid_amount),
        balanceDue: Number(payable.balance_due),
        dueDate: payable.due_date,
        status: payable.status,
      })),
      asOfDate,
    );
    const riskLevel = getSupplierRiskLevel({ openBalance: financials.openBalance, days61Plus: aging.days61Plus });
    return { ...supplier, financials, aging, riskLevel, payables: supplierPayables, expenses: supplierExpenses, purchaseOrders: supplierPurchaseOrders };
  });

  const agingTotals = suppliersWithSummary.reduce(
    (totals, supplier) => ({
      current: totals.current + supplier.aging.current,
      days1To30: totals.days1To30 + supplier.aging.days1To30,
      days31To60: totals.days31To60 + supplier.aging.days31To60,
      days61Plus: totals.days61Plus + supplier.aging.days61Plus,
      total: totals.total + supplier.aging.total,
    }),
    { current: 0, days1To30: 0, days31To60: 0, days61Plus: 0, total: 0 },
  );

  return {
    suppliers: suppliersWithSummary,
    payables,
    expenses,
    purchaseOrders,
    summary: {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter((supplier) => supplier.status === "active").length,
      openBalance: suppliersWithSummary.reduce((sum, supplier) => sum + supplier.financials.openBalance, 0),
      openPurchaseOrderValue: suppliersWithSummary.reduce((sum, supplier) => sum + supplier.financials.openPurchaseOrderValue, 0),
      highRiskSuppliers: suppliersWithSummary.filter((supplier) => supplier.riskLevel === "high").length,
      aging: agingTotals,
    },
  };
}
