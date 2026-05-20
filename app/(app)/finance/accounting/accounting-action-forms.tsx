"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Banknote, BookOpenCheck, FileDown, Landmark, Plus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAccountingExport,
  createBankReconciliation,
  createBankTransaction,
  createGlAccount,
  createManualJournalEntry,
  createTaxRate,
  createTaxReport,
  postJournalEntry,
} from "@/features/accounting/actions";
import type { BankAccountOption, GlAccountRow } from "@/features/accounting/queries";
import {
  accountingExportFormats,
  bankReconciliationStatuses,
  bankTransactionTypes,
  glAccountTypes,
  taxReportStatuses,
} from "@/lib/validations/accounting";

type BranchOption = { id: string; name: string; currency_code?: string };
type AccountingMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: AccountingMessage }) {
  if (!message) return null;
  return (
    <div className={message.type === "error"
      ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}
    >
      {message.text}
    </div>
  );
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function useAccountingSubmit(
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | undefined>,
  fallbackSuccess: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<AccountingMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      const success = result?.success ?? fallbackSuccess;
      formRef.current?.reset();
      setMessage({ type: "success", text: success });
      router.replace(`${pathname}?notice=${encodeURIComponent(success)}&accounting=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function GlAccountForm({ companyId, currencyCode }: { companyId: string; currencyCode: string }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createGlAccount, "GL account created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="accountCode">Code</Label>
          <Input id="accountCode" name="accountCode" defaultValue="6100" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="accountType">Type</Label>
          <select id="accountType" name="accountType" defaultValue="expense" className="h-9 rounded-md border bg-white px-3 text-sm">
            {glAccountTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accountName">Name</Label>
        <Input id="accountName" name="accountName" defaultValue="Workshop Supplies Expense" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accountCurrencyCode">Currency</Label>
        <Input id="accountCurrencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create GL account"}
      </Button>
    </form>
  );
}

export function ManualJournalForm({
  companyId,
  branches,
  accounts,
  currencyCode,
  today,
}: {
  companyId: string;
  branches: BranchOption[];
  accounts: GlAccountRow[];
  currencyCode: string;
  today: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createManualJournalEntry, "Journal entry created.");
  const debitAccount = accounts.find((account) => account.system_key === "vehicle_inventory") ?? accounts.find((account) => account.account_type === "asset") ?? accounts[0];
  const creditAccount = accounts.find((account) => account.system_key === "owner_equity") ?? accounts.find((account) => account.account_type === "equity") ?? accounts[1];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-2">
        <Label htmlFor="branchId">Branch</Label>
        <select id="branchId" name="branchId" defaultValue={branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">Company level</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="memo">Memo</Label>
        <Input id="memo" name="memo" defaultValue="Opening inventory accounting entry" required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="entryDate">Entry date</Label>
          <Input id="entryDate" name="entryDate" type="date" defaultValue={today} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="journalCurrencyCode">Currency</Label>
          <Input id="journalCurrencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="debitAccountId">Debit</Label>
          <select id="debitAccountId" name="debitAccountId" defaultValue={debitAccount?.id} className="h-9 rounded-md border bg-white px-3 text-sm">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="creditAccountId">Credit</Label>
          <select id="creditAccountId" name="creditAccountId" defaultValue={creditAccount?.id} className="h-9 rounded-md border bg-white px-3 text-sm">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="journalAmount">Amount</Label>
        <Input id="journalAmount" name="amount" type="number" min="1" defaultValue="25000" required />
      </div>
      <Button type="submit" disabled={isPending || accounts.length < 2}>
        <BookOpenCheck className="h-4 w-4" />
        {isPending ? "Creating..." : "Create journal entry"}
      </Button>
    </form>
  );
}

export function PostJournalForm({ companyId, journalEntryId }: { companyId: string; journalEntryId: string }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(postJournalEntry, "Journal entry posted.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-2">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="journalEntryId" value={journalEntryId} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Posting..." : "Post journal entry"}
      </Button>
    </form>
  );
}

export function TaxRateForm({ companyId, accounts }: { companyId: string; accounts: GlAccountRow[] }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createTaxRate, "Tax rate created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="isActive" value="true" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="countryCode">Country</Label>
          <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ratePercent">Rate %</Label>
          <Input id="ratePercent" name="ratePercent" type="number" min="0" step="0.01" defaultValue="5" required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="taxName">Tax name</Label>
        <Input id="taxName" name="taxName" defaultValue="Reduced VAT" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="taxAccountId">Tax account</Label>
        <select id="taxAccountId" name="taxAccountId" defaultValue={accounts.find((account) => account.system_key === "vat_payable")?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">No account</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <ReceiptText className="h-4 w-4" />
        {isPending ? "Creating..." : "Create tax rate"}
      </Button>
    </form>
  );
}

export function TaxReportForm({ companyId, defaultBranchId, periodStart, periodEnd }: { companyId: string; defaultBranchId?: string; periodStart: string; periodEnd: string }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createTaxReport, "Tax report created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
      <input type="hidden" name="status" value={taxReportStatuses[1]} />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="countryCode" defaultValue="AE" maxLength={2} aria-label="Tax report country" />
        <Input name="periodStart" type="date" defaultValue={periodStart} aria-label="Tax report period start" />
        <Input name="periodEnd" type="date" defaultValue={periodEnd} aria-label="Tax report period end" />
        <Input name="taxableSales" type="number" min="0" defaultValue="100000" aria-label="Taxable sales" />
        <Input name="taxablePurchases" type="number" min="0" defaultValue="40000" aria-label="Taxable purchases" />
        <Input name="taxCollected" type="number" min="0" defaultValue="5000" aria-label="Tax collected" />
        <Input name="taxPaid" type="number" min="0" defaultValue="2000" aria-label="Tax paid" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Creating..." : "Create tax report"}
      </Button>
    </form>
  );
}

export function BankTransactionForm({ companyId, branches, bankAccounts, currencyCode, today }: { companyId: string; branches: BranchOption[]; bankAccounts: BankAccountOption[]; currencyCode: string; today: string }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createBankTransaction, "Bank transaction created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="branchId" defaultValue={branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Bank transaction branch">
        <option value="">Company level</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <select name="bankAccountId" defaultValue={bankAccounts[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Bank account">
        <option value="">No bank account</option>
        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.account_name}</option>)}
      </select>
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="transactionDate" type="date" defaultValue={today} aria-label="Bank transaction date" />
        <select name="transactionType" defaultValue="deposit" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Bank transaction type">
          {bankTransactionTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
        </select>
        <Input name="amount" type="number" min="1" defaultValue="5000" aria-label="Bank transaction amount" />
        <Input name="currencyCode" defaultValue={currencyCode} maxLength={3} aria-label="Bank transaction currency" />
      </div>
      <Input name="description" defaultValue="Customer deposit received" aria-label="Bank transaction description" />
      <Input name="reference" defaultValue="BANK-REF-001" aria-label="Bank transaction reference" />
      <Button type="submit" variant="outline" disabled={isPending}>
        <Banknote className="h-4 w-4" />
        {isPending ? "Creating..." : "Create bank transaction"}
      </Button>
    </form>
  );
}

export function BankReconciliationForm({ companyId, bankAccounts, periodStart, periodEnd }: { companyId: string; bankAccounts: BankAccountOption[]; periodStart: string; periodEnd: string }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createBankReconciliation, "Bank reconciliation created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="bankAccountId" defaultValue={bankAccounts[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Reconciliation bank account">
        <option value="">No bank account</option>
        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.account_name}</option>)}
      </select>
      <input type="hidden" name="status" value={bankReconciliationStatuses[0]} />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="statementStartDate" type="date" defaultValue={periodStart} aria-label="Statement start" />
        <Input name="statementEndDate" type="date" defaultValue={periodEnd} aria-label="Statement end" />
        <Input name="statementEndingBalance" type="number" defaultValue="82500" aria-label="Statement ending balance" />
        <Input name="systemEndingBalance" type="number" defaultValue="82000" aria-label="System ending balance" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <Landmark className="h-4 w-4" />
        {isPending ? "Creating..." : "Create bank reconciliation"}
      </Button>
    </form>
  );
}

export function AccountingExportForm({ companyId, periodStart, periodEnd }: { companyId: string; periodStart: string; periodEnd: string }) {
  const { formRef, message, isPending, handleSubmit } = useAccountingSubmit(createAccountingExport, "Accounting export queued.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-3 md:grid-cols-3">
        <select name="exportFormat" defaultValue="csv" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Accounting export format">
          {accountingExportFormats.map((format) => <option key={format} value={format}>{labelize(format)}</option>)}
        </select>
        <Input name="periodStart" type="date" defaultValue={periodStart} aria-label="Export period start" />
        <Input name="periodEnd" type="date" defaultValue={periodEnd} aria-label="Export period end" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <FileDown className="h-4 w-4" />
        {isPending ? "Queueing..." : "Queue accounting export"}
      </Button>
    </form>
  );
}
