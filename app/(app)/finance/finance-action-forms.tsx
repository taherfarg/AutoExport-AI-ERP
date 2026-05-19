"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createExpense,
  createPayable,
  createSalespersonCommission,
} from "@/features/finance/actions";
import { formatFinanceStatus } from "@/lib/finance/format";
import { financeCommissionStatuses, financeExpenseCategories } from "@/lib/validations/finance";

type BranchOption = { id: string; name: string };
type VehicleOption = { id: string; stock_number: string; brand: string; model: string; selling_price?: number };
type InvoiceOption = { id: string; branch_id: string; vehicle_id?: string | null; total: number };
type UserOption = { id: string; full_name: string; email: string };
type FinanceMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: FinanceMessage }) {
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

function useFinanceSubmit(
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | undefined>,
  fallbackSuccess: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<FinanceMessage>();
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
      router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function FinanceExpenseForm({
  branches,
  vehicles,
  companyId,
  defaultBranchId,
  defaultVehicleId,
  currencyCode,
  today,
}: {
  branches: BranchOption[];
  vehicles: VehicleOption[];
  companyId: string;
  defaultBranchId: string;
  defaultVehicleId?: string;
  currencyCode: string;
  today: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useFinanceSubmit(createExpense, "Expense recorded.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-2">
        <Label htmlFor="branchId">Branch</Label>
        <select id="branchId" name="branchId" defaultValue={defaultBranchId} className="h-9 rounded-md border bg-white px-3 text-sm">
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vehicleId">Vehicle</Label>
        <select id="vehicleId" name="vehicleId" defaultValue={defaultVehicleId ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">Branch expense</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>{vehicle.stock_number} - {vehicle.brand} {vehicle.model}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <select id="category" name="category" defaultValue="repair" className="h-9 rounded-md border bg-white px-3 text-sm">
          {financeExpenseCategories.map((category) => <option key={category} value={category}>{formatFinanceStatus(category)}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue="Vehicle preparation expense" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" name="amount" type="number" min="0" defaultValue="2500" required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="currencyCode">Currency</Label>
          <Input id="currencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expenseDate">Expense date</Label>
          <Input id="expenseDate" name="expenseDate" type="date" defaultValue={today} required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="supplierName">Supplier</Label>
        <Input id="supplierName" name="supplierName" />
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending ? "Recording..." : "Record expense"}
      </Button>
    </form>
  );
}

export function FinancePayableForm({
  companyId,
  defaultBranchId,
  defaultVehicleId,
  currencyCode,
  dueDate,
}: {
  companyId: string;
  defaultBranchId: string;
  defaultVehicleId?: string;
  currencyCode: string;
  dueDate: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useFinanceSubmit(createPayable, "Payable created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={defaultBranchId} />
      <input type="hidden" name="vehicleId" value={defaultVehicleId ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="payableSupplierName">Supplier</Label>
        <Input id="payableSupplierName" name="supplierName" defaultValue="Repair Supplier" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="payableDescription">Description</Label>
        <Input id="payableDescription" name="description" defaultValue="Supplier payable" required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="payableAmount">Amount</Label>
          <Input id="payableAmount" name="amount" type="number" min="0" defaultValue="5000" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paidAmount">Paid</Label>
          <Input id="paidAmount" name="paidAmount" type="number" min="0" defaultValue="0" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="payableCurrencyCode">Currency</Label>
          <Input id="payableCurrencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={dueDate} />
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <ReceiptText className="h-4 w-4" />
        {isPending ? "Creating..." : "Create payable"}
      </Button>
    </form>
  );
}

export function FinanceCommissionForm({
  companyId,
  defaultBranchId,
  defaultInvoice,
  defaultVehicle,
  users,
  currencyCode,
}: {
  companyId: string;
  defaultBranchId: string;
  defaultInvoice?: InvoiceOption;
  defaultVehicle?: VehicleOption;
  users: UserOption[];
  currencyCode: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useFinanceSubmit(
    createSalespersonCommission,
    "Commission created.",
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={defaultInvoice?.branch_id ?? defaultBranchId} />
      <input type="hidden" name="salesInvoiceId" value={defaultInvoice?.id ?? ""} />
      <input type="hidden" name="vehicleId" value={defaultInvoice?.vehicle_id ?? defaultVehicle?.id ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="salespersonId">Salesperson</Label>
        <select id="salespersonId" name="salespersonId" defaultValue={users[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">No salesperson</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="basisAmount">Basis amount</Label>
          <Input id="basisAmount" name="basisAmount" type="number" min="0" defaultValue={defaultInvoice?.total ?? defaultVehicle?.selling_price ?? 0} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="commissionRate">Rate %</Label>
          <Input id="commissionRate" name="commissionRate" type="number" min="0" step="0.1" defaultValue="2.5" required />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="commissionCurrencyCode">Currency</Label>
          <Input id="commissionCurrencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue="pending" className="h-9 rounded-md border bg-white px-3 text-sm">
            {financeCommissionStatuses.map((status) => <option key={status} value={status}>{formatFinanceStatus(status)}</option>)}
          </select>
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <WalletCards className="h-4 w-4" />
        {isPending ? "Creating..." : "Create commission"}
      </Button>
    </form>
  );
}
