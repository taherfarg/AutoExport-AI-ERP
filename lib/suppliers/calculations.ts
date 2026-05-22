type SupplierPayableInput = {
  amount?: number;
  paidAmount?: number;
  balanceDue: number;
  dueDate?: string | null;
  status: string;
};

type SupplierExpenseInput = {
  amount: number;
};

type SupplierPurchaseOrderInput = {
  totalAmount: number;
  status: string;
};

export type SupplierFinancialSummary = {
  totalPayables: number;
  paidAmount: number;
  openBalance: number;
  totalExpenses: number;
  openPurchaseOrderValue: number;
};

export type SupplierAgingSummary = {
  current: number;
  days1To30: number;
  days31To60: number;
  days61Plus: number;
  total: number;
};

function money(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

export function calculateSupplierFinancials({
  payables,
  expenses,
  purchaseOrders,
}: {
  payables: SupplierPayableInput[];
  expenses: SupplierExpenseInput[];
  purchaseOrders: SupplierPurchaseOrderInput[];
}): SupplierFinancialSummary {
  return {
    totalPayables: money(payables.reduce((sum, payable) => sum + Number(payable.amount), 0)),
    paidAmount: money(payables.reduce((sum, payable) => sum + Number(payable.paidAmount), 0)),
    openBalance: money(payables.reduce((sum, payable) => sum + Number(payable.balanceDue), 0)),
    totalExpenses: money(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)),
    openPurchaseOrderValue: money(
      purchaseOrders
        .filter((order) => !["received", "cancelled"].includes(order.status))
        .reduce((sum, order) => sum + Number(order.totalAmount), 0),
    ),
  };
}

export function calculateSupplierAging(payables: SupplierPayableInput[], asOfDate: string): SupplierAgingSummary {
  const aging: SupplierAgingSummary = {
    current: 0,
    days1To30: 0,
    days31To60: 0,
    days61Plus: 0,
    total: 0,
  };

  for (const payable of payables) {
    if (["paid", "cancelled"].includes(payable.status)) continue;
    const balanceDue = money(payable.balanceDue);
    if (balanceDue <= 0) continue;
    const overdueDays = payable.dueDate ? daysBetween(payable.dueDate, asOfDate) : 0;

    if (overdueDays <= 0) {
      aging.current += balanceDue;
    } else if (overdueDays <= 30) {
      aging.days1To30 += balanceDue;
    } else if (overdueDays <= 60) {
      aging.days31To60 += balanceDue;
    } else {
      aging.days61Plus += balanceDue;
    }
    aging.total += balanceDue;
  }

  return {
    current: money(aging.current),
    days1To30: money(aging.days1To30),
    days31To60: money(aging.days31To60),
    days61Plus: money(aging.days61Plus),
    total: money(aging.total),
  };
}

export function getSupplierRiskLevel({ openBalance, days61Plus }: { openBalance: number; days61Plus: number }) {
  if (days61Plus > 0) return "high";
  if (openBalance > 0) return "medium";
  return "low";
}
