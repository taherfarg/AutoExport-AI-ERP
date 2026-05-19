function money(value: number) {
  return Math.round(value * 100) / 100;
}

export type FinanceVehicleProfitInput = {
  sellingPrice: number;
  totalLandedCost: number;
  financeExpenses?: number;
  shipmentCosts?: number;
  commissionAmount?: number;
};

export type FinanceSummaryInput = {
  invoices: { total: number; paid_amount: number; balance_due: number }[];
  expenses: { amount: number }[];
  receivables: { balance_due: number }[];
  payables: { balance_due: number }[];
  commissions: { commission_amount: number; status: string }[];
};

export function calculateFinanceVehicleProfit({
  sellingPrice,
  totalLandedCost,
  financeExpenses = 0,
  shipmentCosts = 0,
  commissionAmount = 0,
}: FinanceVehicleProfitInput) {
  const grossProfit = money(sellingPrice - totalLandedCost);
  const netProfit = money(grossProfit - financeExpenses - shipmentCosts - commissionAmount);

  return {
    grossProfit,
    netProfit,
    profitMargin: sellingPrice <= 0 ? 0 : money((netProfit / sellingPrice) * 100),
  };
}

export function calculateFinanceSummary({
  invoices,
  expenses,
  receivables,
  payables,
  commissions,
}: FinanceSummaryInput) {
  const salesTotal = money(invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0));
  const paidTotal = money(invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount), 0));
  const receivablesTotal = money(receivables.reduce((sum, receivable) => sum + Number(receivable.balance_due), 0));
  const payablesTotal = money(payables.reduce((sum, payable) => sum + Number(payable.balance_due), 0));
  const expensesTotal = money(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0));
  const commissionsTotal = money(commissions.reduce((sum, commission) => sum + Number(commission.commission_amount), 0));
  const openCommissionTotal = money(
    commissions
      .filter((commission) => !["paid", "cancelled"].includes(commission.status))
      .reduce((sum, commission) => sum + Number(commission.commission_amount), 0),
  );

  return {
    salesTotal,
    paidTotal,
    receivablesTotal,
    payablesTotal,
    expensesTotal,
    commissionsTotal,
    openCommissionTotal,
    cashPosition: money(paidTotal - expensesTotal - openCommissionTotal),
  };
}

export function getBalanceStatus({
  amount,
  paidAmount,
  dueDate,
  today,
}: {
  amount: number;
  paidAmount: number;
  dueDate?: string | null;
  today?: string;
}) {
  const balanceDue = money(Math.max(amount - paidAmount, 0));

  if (balanceDue <= 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  if (dueDate) {
    const due = new Date(`${dueDate}T00:00:00.000Z`);
    const reference = new Date(`${today ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    if (due < reference) {
      return "overdue";
    }
  }

  return "open";
}

export function calculateCommissionAmount({
  basisAmount,
  commissionRate,
}: {
  basisAmount: number;
  commissionRate: number;
}) {
  return money(Math.max(basisAmount, 0) * (Math.max(commissionRate, 0) / 100));
}
