export type ShipmentCostInput = {
  amount: number;
  currency_code: string;
};

export type ExportDocumentStatusInput = {
  is_required: boolean;
  status: string;
};

export type ExportRiskInput = {
  shippingStatus: string;
  customsStatus: string;
  documentStatus: string;
  estimatedArrivalDate?: string | null;
  today?: string;
};

export function calculateShipmentCostSummary(costs: ShipmentCostInput[]) {
  const totals = new Map<string, number>();

  for (const cost of costs) {
    const currencyCode = cost.currency_code.toUpperCase();
    totals.set(currencyCode, Math.round(((totals.get(currencyCode) ?? 0) + Number(cost.amount)) * 100) / 100);
  }

  return {
    count: costs.length,
    totalsByCurrency: Array.from(totals.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currencyCode, amount]) => ({ currencyCode, amount })),
  };
}

export function getExportDocumentCompletion(documents: ExportDocumentStatusInput[]) {
  const requiredDocuments = documents.filter((document) => document.is_required);
  const completedCount = requiredDocuments.filter((document) => ["uploaded", "verified"].includes(document.status)).length;
  const missingCount = requiredDocuments.filter((document) => ["missing", "expired"].includes(document.status)).length;

  return {
    requiredCount: requiredDocuments.length,
    completedCount,
    missingCount,
    completionPercentage:
      requiredDocuments.length === 0 ? 100 : Math.round((completedCount / requiredDocuments.length) * 100),
  };
}

export function getExportRiskFlags({
  shippingStatus,
  customsStatus,
  documentStatus,
  estimatedArrivalDate,
  today,
}: ExportRiskInput) {
  const risks: string[] = [];
  const todayDate = today ? new Date(`${today}T00:00:00.000Z`) : new Date();
  const arrivalDate = estimatedArrivalDate ? new Date(`${estimatedArrivalDate}T00:00:00.000Z`) : null;

  if (["missing", "expired"].includes(documentStatus)) {
    risks.push("missing_documents");
  }

  if (
    arrivalDate &&
    arrivalDate < todayDate &&
    !["arrived", "under_clearance", "delivered_to_customer"].includes(shippingStatus)
  ) {
    risks.push("shipment_delayed");
  }

  if (customsStatus === "pending_documents") {
    risks.push("customs_pending_documents");
  }

  if (customsStatus === "delayed") {
    risks.push("customs_delayed");
  }

  return risks;
}
