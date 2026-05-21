import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounting Dashboard | AutoSphere ERP",
  description: "General ledger, journals, VAT/tax snapshots, bank reconciliation, and export-ready accounting records.",
};

import Link from "next/link";
import { ArrowLeft, BookOpenCheck, FileDown, Landmark } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FinanceStatusBadge } from "@/components/finance/finance-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBranches } from "@/features/branches/queries";
import { getAccountingDashboardData, getAccountingPermissions } from "@/features/accounting/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatAccountingStatus } from "@/lib/accounting/format";
import { formatMoney } from "@/lib/vehicles/format";
import {
  AccountingExportForm,
  BankReconciliationForm,
  BankTransactionForm,
  GlAccountForm,
  ManualJournalForm,
  PostJournalForm,
  TaxRateForm,
  TaxReportForm,
} from "./accounting-action-forms";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function AccountingPage() {
  const workspace = await getCurrentWorkspace();
  const [accounting, branches, permissions] = await Promise.all([
    getAccountingDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getAccountingPermissions(workspace.companyId),
  ]);

  const currencyCode = accounting.accounts[0]?.currency_code ?? branches[0]?.currency_code ?? "AED";
  const draftJournals = accounting.journalEntries.filter((entry) => entry.status === "draft");
  const postedJournals = accounting.journalEntries.filter((entry) => entry.status === "posted");
  const periodStart = dateIn(-30);
  const periodEnd = today();

  if (!permissions.canViewAccounting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accounting access required</CardTitle>
          <CardDescription>Ask an administrator for `view_accounting` or finance permissions.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/finance" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Finance Lite
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Full Accounting</h2>
          <p className="text-sm text-slate-500">
            General ledger, journals, VAT/tax snapshots, bank reconciliation, and export-ready accounting records.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="GL accounts" value={String(accounting.accounts.length)} hint="Active chart records" />
        <KpiCard title="Draft journals" value={String(draftJournals.length)} hint="Waiting to post" />
        <KpiCard title="Posted journals" value={String(postedJournals.length)} hint="Locked into ledger" />
        <KpiCard title="Debit total" value={formatMoney(accounting.trialBalance.debitTotal, currencyCode)} hint="Visible journal lines" />
        <KpiCard title="Credit total" value={formatMoney(accounting.trialBalance.creditTotal, currencyCode)} hint="Visible journal lines" />
        <KpiCard title="Difference" value={formatMoney(accounting.trialBalance.difference, currencyCode)} hint="Trial balance check" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart of accounts</CardTitle>
              <CardDescription>Company-scoped GL accounts seeded for dealership accounting.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Normal</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounting.accounts.map((account) => (
                      <tr key={account.id} className="border-t">
                        <td className="px-4 py-3 font-medium text-slate-950">{account.account_code}</td>
                        <td className="px-4 py-3">
                          {account.account_name}
                          {account.is_system_account ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">System</span> : null}
                        </td>
                        <td className="px-4 py-3">{formatAccountingStatus(account.account_type)}</td>
                        <td className="px-4 py-3">{formatAccountingStatus(account.normal_balance)}</td>
                        <td className="px-4 py-3"><FinanceStatusBadge status={account.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Journal entries</CardTitle>
              <CardDescription>Draft entries can be posted after balanced debit and credit lines are present.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounting.journalEntries.map((entry) => {
                  const debitTotal = entry.journal_entry_lines.reduce((sum, line) => sum + Number(line.debit_amount), 0);
                  const creditTotal = entry.journal_entry_lines.reduce((sum, line) => sum + Number(line.credit_amount), 0);
                  return (
                    <div key={entry.id} className="rounded-md border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-slate-950">{entry.entry_number}</p>
                          <p className="text-sm text-slate-500">{entry.memo}</p>
                          <p className="mt-1 text-xs text-slate-500">{entry.branches?.name ?? "Company level"} · {entry.entry_date}</p>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <FinanceStatusBadge status={entry.status} />
                          <p className="text-sm text-slate-600">
                            Dr {formatMoney(debitTotal, entry.currency_code)} / Cr {formatMoney(creditTotal, entry.currency_code)}
                          </p>
                          {permissions.canManageAccounting && entry.status === "draft" ? (
                            <PostJournalForm companyId={workspace.companyId} journalEntryId={entry.id} />
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                        {entry.journal_entry_lines.map((line) => (
                          <div key={line.id} className="rounded bg-slate-50 px-3 py-2">
                            <span className="font-medium">{line.gl_accounts?.account_code}</span> {line.gl_accounts?.account_name}
                            <span className="float-right">
                              {Number(line.debit_amount) > 0 ? `Dr ${formatMoney(line.debit_amount, line.currency_code)}` : `Cr ${formatMoney(line.credit_amount, line.currency_code)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {accounting.journalEntries.length === 0 ? <p className="text-sm text-slate-500">No journal entries yet.</p> : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tax reports</CardTitle>
                <CardDescription>VAT/tax snapshots for country and branch reporting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accounting.taxReports.slice(0, 6).map((report) => (
                  <div key={report.id} className="rounded-md border p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{report.report_number}</p>
                        <p className="text-xs text-slate-500">{report.country_code} · {report.period_start} to {report.period_end}</p>
                      </div>
                      <FinanceStatusBadge status={report.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{formatMoney(report.net_tax_due, currencyCode)} net due</p>
                  </div>
                ))}
                {accounting.taxReports.length === 0 ? <p className="text-sm text-slate-500">No tax reports yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bank reconciliation</CardTitle>
                <CardDescription>Statement comparison and difference tracking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accounting.bankReconciliations.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{item.reconciliation_number}</p>
                        <p className="text-xs text-slate-500">{item.statement_start_date} to {item.statement_end_date}</p>
                      </div>
                      <FinanceStatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{formatMoney(item.difference_amount, currencyCode)} difference</p>
                  </div>
                ))}
                {accounting.bankReconciliations.length === 0 ? <p className="text-sm text-slate-500">No reconciliations yet.</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bank transactions and exports</CardTitle>
              <CardDescription>Manual transaction records and accounting export queue.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {accounting.bankTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{transaction.transaction_number}</p>
                    <p className="text-xs text-slate-500">{formatAccountingStatus(transaction.transaction_type)} · {transaction.description}</p>
                    <p className="mt-2 text-right font-medium">{formatMoney(transaction.amount, transaction.currency_code)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {accounting.accountingExports.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{item.export_number}</p>
                        <p className="text-xs text-slate-500">{formatAccountingStatus(item.export_format)} · {item.period_start} to {item.period_end}</p>
                      </div>
                      <FinanceStatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canManageAccounting ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-orange-500" />Manual journal</CardTitle>
                  <CardDescription>Create a balanced two-line journal entry.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ManualJournalForm companyId={workspace.companyId} branches={branches} accounts={accounting.accounts} currencyCode={currencyCode} today={today()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create GL account</CardTitle>
                  <CardDescription>Add company-specific accounts without changing seeded system accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GlAccountForm companyId={workspace.companyId} currencyCode={currencyCode} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax and VAT</CardTitle>
                  <CardDescription>Maintain tax rates and generate tax report snapshots.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TaxRateForm companyId={workspace.companyId} accounts={accounting.accounts} />
                  <TaxReportForm companyId={workspace.companyId} defaultBranchId={branches[0]?.id} periodStart={periodStart} periodEnd={periodEnd} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4 text-orange-500" />Bank operations</CardTitle>
                  <CardDescription>Record bank activity and prepare reconciliation evidence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BankTransactionForm companyId={workspace.companyId} branches={branches} bankAccounts={accounting.bankAccounts} currencyCode={currencyCode} today={today()} />
                  <BankReconciliationForm companyId={workspace.companyId} bankAccounts={accounting.bankAccounts} periodStart={periodStart} periodEnd={periodEnd} />
                </CardContent>
              </Card>
            </>
          ) : null}

          {permissions.canExportAccounting ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileDown className="h-4 w-4 text-orange-500" />Accounting exports</CardTitle>
                <CardDescription>Queue CSV and provider-ready exports for external accounting systems.</CardDescription>
              </CardHeader>
              <CardContent>
                <AccountingExportForm companyId={workspace.companyId} periodStart={periodStart} periodEnd={periodEnd} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
