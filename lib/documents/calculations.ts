export type DocumentChecklistInput = {
  category: string;
  is_required: boolean;
  status: string;
};

export type DocumentExpiryInput = {
  expiresAt?: string | null;
  today?: string;
  warningDays?: number;
};

export function calculateChecklistCompletion(checklist: DocumentChecklistInput[]) {
  const requiredDocuments = checklist.filter((item) => item.is_required);
  const completedCount = requiredDocuments.filter((item) => ["uploaded", "verified"].includes(item.status)).length;
  const missingCount = requiredDocuments.filter((item) => ["missing", "expired", "rejected"].includes(item.status)).length;

  return {
    requiredCount: requiredDocuments.length,
    completedCount,
    missingCount,
    completionPercentage:
      requiredDocuments.length === 0 ? 100 : Math.round((completedCount / requiredDocuments.length) * 100),
  };
}

export function getMissingRequiredDocuments(checklist: DocumentChecklistInput[]) {
  return checklist
    .filter((item) => item.is_required && ["missing", "expired", "rejected"].includes(item.status))
    .map((item) => item.category);
}

export function getDocumentExpiryState({ expiresAt, today, warningDays = 30 }: DocumentExpiryInput) {
  if (!expiresAt) {
    return "no_expiry";
  }

  const todayDate = today ? new Date(`${today}T00:00:00.000Z`) : new Date();
  const expiryDate = new Date(`${expiresAt}T00:00:00.000Z`);

  if (expiryDate < todayDate) {
    return "expired";
  }

  const warningDate = new Date(todayDate);
  warningDate.setUTCDate(warningDate.getUTCDate() + warningDays);

  if (expiryDate <= warningDate) {
    return "expiring_soon";
  }

  return "valid";
}
