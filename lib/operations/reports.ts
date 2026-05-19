export type OperationsVehicleMetric = {
  status: string;
  sellingPrice: number;
  totalLandedCost: number;
  branchName?: string | null;
};

export type OperationsInvoiceMetric = {
  total: number;
  paidAmount: number;
  balanceDue: number;
};

export type OperationsExportMetric = {
  status: string;
};

export type OperationsLeadMetric = {
  status: string;
  source?: string | null;
};

export type OperationsCampaignMetric = {
  spend: number;
  leads: number;
};

export type OperationsSummaryInput = {
  vehicles: OperationsVehicleMetric[];
  invoices: OperationsInvoiceMetric[];
  exportOrders: OperationsExportMetric[];
  leads: OperationsLeadMetric[];
  campaigns: OperationsCampaignMetric[];
};

export function calculateOperationsReportSummary(input: OperationsSummaryInput) {
  const salesTotal = input.invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const paidTotal = input.invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
  const pendingPayments = input.invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue), 0);
  const expectedProfit = input.vehicles.reduce(
    (sum, vehicle) => sum + Math.max(0, Number(vehicle.sellingPrice) - Number(vehicle.totalLandedCost)),
    0,
  );
  const campaignSpend = input.campaigns.reduce((sum, campaign) => sum + Number(campaign.spend), 0);
  const campaignLeads = input.campaigns.reduce((sum, campaign) => sum + Number(campaign.leads), 0);

  return {
    totalVehicles: input.vehicles.length,
    availableVehicles: input.vehicles.filter((vehicle) => vehicle.status === "available").length,
    reservedVehicles: input.vehicles.filter((vehicle) => vehicle.status === "reserved").length,
    soldVehicles: input.vehicles.filter((vehicle) => vehicle.status === "sold").length,
    salesTotal,
    paidTotal,
    pendingPayments,
    expectedProfit,
    activeExports: input.exportOrders.filter((order) => order.status === "active").length,
    delayedExports: input.exportOrders.filter((order) => order.status === "delayed").length,
    leadCount: input.leads.length,
    wonLeads: input.leads.filter((lead) => lead.status === "won").length,
    campaignSpend,
    marketingCostPerLead: campaignLeads > 0 ? Math.round((campaignSpend / campaignLeads) * 100) / 100 : 0,
  };
}

export function groupRowsByLabel<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    const label = String(row[key] ?? "Unassigned");
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildChatPreview(value: string, maxLength = 80) {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const nextSpace = trimmed.indexOf(" ", maxLength);
  const boundary = nextSpace > maxLength ? nextSpace : maxLength;

  return `${trimmed.slice(0, boundary).trimEnd()}...`;
}
