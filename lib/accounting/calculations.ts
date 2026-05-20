export type JournalLineInput = {
  debitAmount: number;
  creditAmount: number;
};

export type TrialBalanceLineInput = JournalLineInput & {
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
};

function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function summarizeJournalLines(lines: JournalLineInput[]) {
  const debitTotal = money(lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0));
  const creditTotal = money(lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0));

  return {
    debitTotal,
    creditTotal,
    difference: money(debitTotal - creditTotal),
  };
}

export function isBalancedJournal(lines: JournalLineInput[]) {
  const summary = summarizeJournalLines(lines);
  return summary.debitTotal > 0 && summary.creditTotal > 0 && summary.difference === 0;
}

export function calculateTrialBalance(lines: TrialBalanceLineInput[]) {
  const summary = summarizeJournalLines(lines);
  const byType = {
    asset: 0,
    liability: 0,
    equity: 0,
    revenue: 0,
    expense: 0,
  };

  for (const line of lines) {
    byType[line.accountType] = money(byType[line.accountType] + Number(line.debitAmount || 0) - Number(line.creditAmount || 0));
  }

  return { ...summary, byType };
}

export function calculateTaxAmount({ amount, ratePercent }: { amount: number; ratePercent: number }) {
  return money((Number(amount) || 0) * ((Number(ratePercent) || 0) / 100));
}

export function calculateBankReconciliationDifference({
  statementEndingBalance,
  systemEndingBalance,
}: {
  statementEndingBalance: number;
  systemEndingBalance: number;
}) {
  return money(Number(statementEndingBalance || 0) - Number(systemEndingBalance || 0));
}
