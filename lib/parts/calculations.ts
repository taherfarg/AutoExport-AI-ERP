function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calculatePartStockStatus({
  quantityOnHand,
  quantityReserved,
  reorderPoint,
}: {
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
}) {
  const available = quantityOnHand - quantityReserved;

  if (available <= 0) return "out_of_stock";
  if (available <= reorderPoint) return "low_stock";
  return "in_stock";
}

export function calculatePartLineTotals({
  quantity,
  unitCost,
  sellingPrice,
}: {
  quantity: number;
  unitCost: number;
  sellingPrice: number;
}) {
  const lineCost = money(quantity * unitCost);
  const lineTotal = money(quantity * sellingPrice);

  return {
    lineCost,
    lineTotal,
    grossProfit: money(lineTotal - lineCost),
  };
}

export function calculatePartProfit({ revenue, cost }: { revenue: number; cost: number }) {
  const grossProfit = money(revenue - cost);

  return {
    grossProfit,
    marginPercent: revenue > 0 ? money((grossProfit / revenue) * 100) : 0,
  };
}

export function calculatePurchaseOrderTotals(items: Array<{ quantity: number; unitCost: number }>) {
  const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0));

  return {
    subtotal,
    totalAmount: subtotal,
  };
}

export function shouldCreateReorderAlert({
  availableQuantity,
  reorderPoint,
}: {
  availableQuantity: number;
  reorderPoint: number;
}) {
  return reorderPoint > 0 && availableQuantity <= reorderPoint;
}
