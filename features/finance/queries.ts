import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { calculateFinanceSummary, calculateFinanceVehicleProfit } from "@/lib/finance/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type FinancePermissions = {
  canViewFinance: boolean;
  canManageFinance: boolean;
  canManageCommissions: boolean;
};

export type FinanceInvoiceRow = {
  id: string;
  branch_id: string;
  customer_id: string | null;
  vehicle_id: string;
  invoice_number: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  currency_code: string;
  due_date: string;
  invoice_status: string;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
  customers: { name: string } | null;
};

export type FinanceExpenseRow = {
  id: string;
  branch_id: string;
  vehicle_id: string | null;
  category: string;
  expense_number: string;
  description: string;
  amount: number;
  currency_code: string;
  expense_date: string;
  supplier_name: string | null;
  status: string;
  branches: { name: string; code: string } | null;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
};

export type FinanceReceivableRow = {
  id: string;
  receivable_number: string;
  description: string;
  amount: number;
  paid_amount: number;
  balance_due: number;
  currency_code: string;
  due_date: string | null;
  status: string;
  customers: { name: string } | null;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
};

export type FinancePayableRow = {
  id: string;
  payable_number: string;
  supplier_name: string;
  description: string;
  amount: number;
  paid_amount: number;
  balance_due: number;
  currency_code: string;
  due_date: string | null;
  status: string;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
};

export type FinanceCommissionRow = {
  id: string;
  commission_number: string;
  salesperson_id: string | null;
  sales_invoice_id: string | null;
  vehicle_id: string | null;
  basis_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency_code: string;
  status: string;
  sales_invoices: { invoice_number: string } | null;
  vehicles: { stock_number: string; brand: string; model: string; year: number } | null;
  salesperson: { full_name: string | null; email: string } | null;
};

export type FinanceVehicleRow = {
  id: string;
  branch_id: string;
  stock_number: string;
  brand: string;
  model: string;
  year: number;
  total_landed_cost: number;
  selling_price: number;
  currency_code: string;
  status: string;
  branches: { name: string; code: string } | null;
};

export async function getFinancePermissions(companyId: string): Promise<FinancePermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewFinance: permissions.has(PERMISSIONS.VIEW_FINANCE),
    canManageFinance: permissions.has(PERMISSIONS.MANAGE_FINANCE),
    canManageCommissions: permissions.has(PERMISSIONS.MANAGE_COMMISSIONS),
  };
}

export async function getFinanceDashboardData(companyId: string) {
  const supabase = createServiceRoleClient();
  const [invoicesResult, expensesResult, receivablesResult, payablesResult, commissionsResult, vehiclesResult] = await Promise.all([
    supabase
      .from("sales_invoices")
      .select("id, branch_id, customer_id, vehicle_id, invoice_number, total, paid_amount, balance_due, currency_code, due_date, invoice_status, vehicles(stock_number, brand, model, year), customers(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, branch_id, vehicle_id, category, expense_number, description, amount, currency_code, expense_date, supplier_name, status, branches(name, code), vehicles(stock_number, brand, model, year)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false }),
    supabase
      .from("receivables")
      .select("id, receivable_number, description, amount, paid_amount, balance_due, currency_code, due_date, status, customers(name), vehicles(stock_number, brand, model, year)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("payables")
      .select("id, payable_number, supplier_name, description, amount, paid_amount, balance_due, currency_code, due_date, status, vehicles(stock_number, brand, model, year)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("salesperson_commissions")
      .select("id, commission_number, salesperson_id, sales_invoice_id, vehicle_id, basis_amount, commission_rate, commission_amount, currency_code, status, sales_invoices(invoice_number), vehicles(stock_number, brand, model, year), salesperson:profiles!salesperson_commissions_salesperson_id_fkey(full_name, email)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("vehicles")
      .select("id, branch_id, stock_number, brand, model, year, total_landed_cost, selling_price, currency_code, status, branches(name, code)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [invoicesResult, expensesResult, receivablesResult, payablesResult, commissionsResult, vehiclesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const invoices = (invoicesResult.data ?? []) as unknown as FinanceInvoiceRow[];
  const expenses = (expensesResult.data ?? []) as unknown as FinanceExpenseRow[];
  const receivables = (receivablesResult.data ?? []) as unknown as FinanceReceivableRow[];
  const payables = (payablesResult.data ?? []) as unknown as FinancePayableRow[];
  const commissions = (commissionsResult.data ?? []) as unknown as FinanceCommissionRow[];
  const vehicles = (vehiclesResult.data ?? []) as unknown as FinanceVehicleRow[];

  return {
    invoices,
    expenses,
    receivables,
    payables,
    commissions,
    vehicles,
    summary: calculateFinanceSummary({ invoices, expenses, receivables, payables, commissions }),
    vehicleProfitRows: vehicles.map((vehicle) => {
      const financeExpenses = expenses
        .filter((expense) => expense.vehicle_id === vehicle.id)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const commissionAmount = commissions
        .filter((commission) => commission.vehicle_id === vehicle.id && commission.status !== "cancelled")
        .reduce((sum, commission) => sum + Number(commission.commission_amount), 0);
      const profit = calculateFinanceVehicleProfit({
        sellingPrice: Number(vehicle.selling_price),
        totalLandedCost: Number(vehicle.total_landed_cost),
        financeExpenses,
        commissionAmount,
      });

      return { ...vehicle, financeExpenses, commissionAmount, ...profit };
    }),
  };
}
