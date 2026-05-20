function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calculateJobLaborAmount({ hours, hourlyRate }: { hours: number; hourlyRate: number }) {
  return money(hours * hourlyRate);
}

export function calculateServiceOrderTotals({
  laborTotal,
  partsTotal,
}: {
  laborTotal: number;
  partsTotal: number;
}) {
  const normalizedLabor = money(laborTotal);
  const normalizedParts = money(partsTotal);

  return {
    laborTotal: normalizedLabor,
    partsTotal: normalizedParts,
    totalAmount: money(normalizedLabor + normalizedParts),
  };
}

export function calculateInspectionScore(statuses: string[]) {
  if (statuses.length === 0) return 100;

  const score = statuses.reduce((sum, status) => {
    if (status === "pass") return sum + 100;
    if (status === "attention") return sum + 50;
    if (status === "not_applicable") return sum + 100;
    return sum;
  }, 0) / statuses.length;

  return Math.round(score);
}

export function calculateWarrantyClaimBalance({
  claimAmount,
  approvedAmount,
  paidAmount,
}: {
  claimAmount: number;
  approvedAmount: number;
  paidAmount: number;
}) {
  return {
    approvedBalance: money(Math.max(approvedAmount - paidAmount, 0)),
    unapprovedAmount: money(Math.max(claimAmount - approvedAmount, 0)),
  };
}
