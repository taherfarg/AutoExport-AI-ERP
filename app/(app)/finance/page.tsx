import { Landmark, Plus, ReceiptText, WalletCards } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FinanceStatusBadge } from "@/components/finance/finance-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranches } from "@/features/branches/queries";
import {
  createExpense,
  createPayable,
  createSalespersonCommission,
} from "@/features/finance/actions";
import { getFinanceDashboardData, getFinancePermissions } from "@/features/finance/queries";
import { getCompanyUsers } from "@/features/users/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatFinanceStatus } from "@/lib/finance/format";
import { formatMoney } from "@/lib/vehicles/format";
import { financeCommissionStatuses, financeExpenseCategories } from "@/lib/validations/finance";

type CompanyUserRow = {
  profiles: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
};

function profileFrom(row: CompanyUserRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function FinancePage() {
  const workspace = await getCurrentWorkspace();
  const [finance, branches, users, permissions] = await Promise.all([
    getFinanceDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getCompanyUsers(workspace.companyId),
    getFinancePermissions(workspace.companyId),
  ]);

  const defaultBranchId = branches[0]?.id;
  const defaultVehicle = finance.vehicles[0];
  const defaultInvoice = finance.invoices[0];
  const userOptions = (users as unknown as CompanyUserRow[])
    .map(profileFrom)
    .filter(Boolean) as { id: string; full_name: string; email: string }[];
  const currencyCode = finance.invoices[0]?.currency_code ?? defaultVehicle?.currency_code ?? branches[0]?.currency_code ?? "AED";

  async function expenseFromForm(formData: FormData) {
    "use server";

    await createExpense(formData);
  }

  async function payableFromForm(formData: FormData) {
    "use server";

    await createPayable(formData);
  }

  async function commissionFromForm(formData: FormData) {
    "use server";

    await createSalespersonCommission(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Finance Lite</h2>
          <p className="text-sm text-slate-500">
            Vehicle trading finance: receivables, payables, expenses, profit, and salesperson commission.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <KpiCard title="Sales total" value={formatMoney(finance.summary.salesTotal, currencyCode)} hint="Invoice value" />
        <KpiCard title="Paid" value={formatMoney(finance.summary.paidTotal, currencyCode)} hint="Collected invoice value" />
        <KpiCard title="Receivables" value={formatMoney(finance.summary.receivablesTotal, currencyCode)} hint="Open customer balances" />
        <KpiCard title="Payables" value={formatMoney(finance.summary.payablesTotal, currencyCode)} hint="Supplier balances" />
        <KpiCard title="Expenses" value={formatMoney(finance.summary.expensesTotal, currencyCode)} hint="Recorded finance expenses" />
        <KpiCard title="Commissions" value={formatMoney(finance.summary.commissionsTotal, currencyCode)} hint="Salesperson commission" />
        <KpiCard title="Cash position" value={formatMoney(finance.summary.cashPosition, currencyCode)} hint="Paid minus expenses and open commissions" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle profit monitor</CardTitle>
              <CardDescription>Landed cost, selling price, finance expenses, commission, and net profit by vehicle.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3 text-right">Landed</th>
                      <th className="px-4 py-3 text-right">Expenses</th>
                      <th className="px-4 py-3 text-right">Commission</th>
                      <th className="px-4 py-3 text-right">Net profit</th>
                      <th className="px-4 py-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.vehicleProfitRows.slice(0, 12).map((vehicle) => (
                      <tr key={vehicle.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{vehicle.stock_number}</p>
                          <p className="text-xs text-slate-500">{vehicle.year} {vehicle.brand} {vehicle.model}</p>
                        </td>
                        <td className="px-4 py-3">{vehicle.branches?.name ?? "No branch"}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(vehicle.total_landed_cost, vehicle.currency_code)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(vehicle.financeExpenses, vehicle.currency_code)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(vehicle.commissionAmount, vehicle.currency_code)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(vehicle.netProfit, vehicle.currency_code)}</td>
                        <td className="px-4 py-3 text-right">{Number(vehicle.profitMargin).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receivables</CardTitle>
                <CardDescription>Customer balances synced from sales invoices.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {finance.receivables.slice(0, 8).map((receivable) => (
                    <div key={receivable.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{receivable.receivable_number}</p>
                          <p className="text-xs text-slate-500">{receivable.customers?.name ?? receivable.description}</p>
                        </div>
                        <FinanceStatusBadge status={receivable.status} />
                      </div>
                      <p className="mt-2 text-right font-medium">{formatMoney(receivable.balance_due, receivable.currency_code)} due</p>
                    </div>
                  ))}
                  {finance.receivables.length === 0 ? <p className="text-sm text-slate-500">No receivables yet.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payables</CardTitle>
                <CardDescription>Supplier and vendor balances.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {finance.payables.slice(0, 8).map((payable) => (
                    <div key={payable.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{payable.payable_number}</p>
                          <p className="text-xs text-slate-500">{payable.supplier_name}</p>
                        </div>
                        <FinanceStatusBadge status={payable.status} />
                      </div>
                      <p className="mt-2 text-right font-medium">{formatMoney(payable.balance_due, payable.currency_code)} due</p>
                    </div>
                  ))}
                  {finance.payables.length === 0 ? <p className="text-sm text-slate-500">No payables yet.</p> : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent expenses</CardTitle>
              <CardDescription>Vehicle and branch expenses recorded by finance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Expense</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.expenses.slice(0, 10).map((expense) => (
                      <tr key={expense.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{expense.expense_number}</p>
                          <p className="text-xs text-slate-500">{expense.description}</p>
                        </td>
                        <td className="px-4 py-3">{formatFinanceStatus(expense.category)}</td>
                        <td className="px-4 py-3">{expense.vehicles?.stock_number ?? "Branch expense"}</td>
                        <td className="px-4 py-3"><FinanceStatusBadge status={expense.status} /></td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(expense.amount, expense.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canManageFinance && defaultBranchId ? (
            <Card>
              <CardHeader>
                <CardTitle>Record expense</CardTitle>
                <CardDescription>Add vehicle, branch, supplier, or preparation expense.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={expenseFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <div className="grid gap-2">
                    <Label htmlFor="branchId">Branch</Label>
                    <select id="branchId" name="branchId" defaultValue={defaultBranchId} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicleId">Vehicle</Label>
                    <select id="vehicleId" name="vehicleId" defaultValue={defaultVehicle?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">Branch expense</option>
                      {finance.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.stock_number} - {vehicle.brand} {vehicle.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <select id="category" name="category" defaultValue="repair" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {financeExpenseCategories.map((category) => (
                        <option key={category} value={category}>{formatFinanceStatus(category)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" defaultValue="Vehicle preparation expense" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" min="0" defaultValue="2500" required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="currencyCode">Currency</Label>
                      <Input id="currencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="expenseDate">Expense date</Label>
                      <Input id="expenseDate" name="expenseDate" type="date" defaultValue={today()} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplierName">Supplier</Label>
                    <Input id="supplierName" name="supplierName" />
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Record expense
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageFinance && defaultBranchId ? (
            <Card>
              <CardHeader>
                <CardTitle>Create payable</CardTitle>
                <CardDescription>Track supplier and vendor obligations.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={payableFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId} />
                  <input type="hidden" name="vehicleId" value={defaultVehicle?.id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="payableSupplierName">Supplier</Label>
                    <Input id="payableSupplierName" name="supplierName" defaultValue="Repair Supplier" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="payableDescription">Description</Label>
                    <Input id="payableDescription" name="description" defaultValue="Supplier payable" required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="payableAmount">Amount</Label>
                      <Input id="payableAmount" name="amount" type="number" min="0" defaultValue="5000" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paidAmount">Paid</Label>
                      <Input id="paidAmount" name="paidAmount" type="number" min="0" defaultValue="0" />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="payableCurrencyCode">Currency</Label>
                      <Input id="payableCurrencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due date</Label>
                      <Input id="dueDate" name="dueDate" type="date" defaultValue={dateIn(14)} />
                    </div>
                  </div>
                  <Button type="submit" variant="outline">
                    <ReceiptText className="h-4 w-4" />
                    Create payable
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageCommissions && defaultBranchId ? (
            <Card>
              <CardHeader>
                <CardTitle>Create commission</CardTitle>
                <CardDescription>Calculate salesperson commission from invoice value.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={commissionFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultInvoice?.branch_id ?? defaultBranchId} />
                  <input type="hidden" name="salesInvoiceId" value={defaultInvoice?.id ?? ""} />
                  <input type="hidden" name="vehicleId" value={defaultInvoice?.vehicle_id ?? defaultVehicle?.id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="salespersonId">Salesperson</Label>
                    <select id="salespersonId" name="salespersonId" defaultValue={userOptions[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">No salesperson</option>
                      {userOptions.map((user) => (
                        <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="basisAmount">Basis amount</Label>
                      <Input id="basisAmount" name="basisAmount" type="number" min="0" defaultValue={defaultInvoice?.total ?? defaultVehicle?.selling_price ?? 0} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="commissionRate">Rate %</Label>
                      <Input id="commissionRate" name="commissionRate" type="number" min="0" step="0.1" defaultValue="2.5" required />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="commissionCurrencyCode">Currency</Label>
                      <Input id="commissionCurrencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <select id="status" name="status" defaultValue="pending" className="h-9 rounded-md border bg-white px-3 text-sm">
                        {financeCommissionStatuses.map((status) => (
                          <option key={status} value={status}>{formatFinanceStatus(status)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" variant="outline">
                    <WalletCards className="h-4 w-4" />
                    Create commission
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Commission ledger</CardTitle>
              <CardDescription>Salesperson commission records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {finance.commissions.slice(0, 8).map((commission) => (
                  <div key={commission.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{commission.commission_number}</p>
                        <p className="text-xs text-slate-500">{commission.salesperson?.full_name ?? commission.salesperson?.email ?? "Salesperson"}</p>
                      </div>
                      <FinanceStatusBadge status={commission.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{formatMoney(commission.commission_amount, commission.currency_code)}</p>
                  </div>
                ))}
                {finance.commissions.length === 0 ? <p className="text-sm text-slate-500">No commissions yet.</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch profit summary</CardTitle>
              <CardDescription>Current visible branch rollup from live finance records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {branches.map((branch) => {
                const branchInvoices = finance.invoices.filter((invoice) => invoice.branch_id === branch.id);
                const branchExpenses = finance.expenses.filter((expense) => expense.branch_id === branch.id);
                const salesTotal = branchInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
                const expensesTotal = branchExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

                return (
                  <div key={branch.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{branch.name}</p>
                        <p className="text-xs text-slate-500">{branch.code}</p>
                      </div>
                      <Landmark className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <p>Sales: <span className="font-medium">{formatMoney(salesTotal, branch.currency_code)}</span></p>
                      <p>Expenses: <span className="font-medium">{formatMoney(expensesTotal, branch.currency_code)}</span></p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
