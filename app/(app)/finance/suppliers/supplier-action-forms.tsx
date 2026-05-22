"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupplier, createSupplierLinkedPayable } from "@/features/suppliers/actions";
import { formatSupplierCategory } from "@/lib/suppliers/format";
import { supplierCategories, supplierStatuses } from "@/lib/validations/suppliers";

type BranchOption = { id: string; name: string; currency_code?: string };
type SupplierOption = { id: string; supplier_name: string; payment_terms_days: number; currency_code: string };
type SupplierMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: SupplierMessage }) {
  if (!message) return null;
  return (
    <div
      className={
        message.type === "error"
          ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      }
    >
      {message.text}
    </div>
  );
}

function useSupplierSubmit(
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | undefined>,
  fallbackSuccess: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<SupplierMessage>();
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
      router.replace(`${pathname}?success=${encodeURIComponent(success)}&supplier=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function SupplierForm({ companyId, currencyCode }: { companyId: string; currencyCode: string }) {
  const { formRef, message, isPending, handleSubmit } = useSupplierSubmit(createSupplier, "Supplier created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="supplierName">Supplier name</Label>
          <Input id="supplierName" name="supplierName" defaultValue="Gulf Prime Suppliers" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" defaultValue="general_vendor" className="h-9 rounded-md border bg-white px-3 text-sm">
            {supplierCategories.map((category) => (
              <option key={category} value={category}>{formatSupplierCategory(category)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="countryCode">Country</Label>
          <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currencyCode">Currency</Label>
          <Input id="currencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paymentTermsDays">Terms days</Label>
          <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min="0" max="365" defaultValue="30" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="contactName">Contact</Label>
          <Input id="contactName" name="contactName" defaultValue="Accounts Desk" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="accounts@supplier.test" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="+971500000000" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="taxRegistrationNumber">VAT / tax number</Label>
          <Input id="taxRegistrationNumber" name="taxRegistrationNumber" placeholder="100000000000003" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bankName">Bank</Label>
          <Input id="bankName" name="bankName" placeholder="Emirates NBD" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" name="iban" placeholder="AE..." />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue="active" className="h-9 rounded-md border bg-white px-3 text-sm">
          {supplierStatuses.map((status) => (
            <option key={status} value={status}>{formatSupplierCategory(status)}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        <Building2 className="h-4 w-4" />
        {isPending ? "Creating..." : "Create supplier"}
      </Button>
    </form>
  );
}

export function SupplierPayableForm({
  companyId,
  branches,
  suppliers,
  currencyCode,
  dueDate,
}: {
  companyId: string;
  branches: BranchOption[];
  suppliers: SupplierOption[];
  currencyCode: string;
  dueDate: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useSupplierSubmit(createSupplierLinkedPayable, "Supplier payable created.");
  const defaultSupplier = suppliers[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-2">
        <Label htmlFor="supplierId">Supplier</Label>
        <select id="supplierId" name="supplierId" defaultValue={defaultSupplier?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" required>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="branchId">Branch</Label>
        <select id="branchId" name="branchId" defaultValue={branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" required>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue="Supplier invoice payable" required />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" min="0" defaultValue="7500" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paidAmount">Paid</Label>
          <Input id="paidAmount" name="paidAmount" type="number" min="0" defaultValue="0" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="payableCurrencyCode">Currency</Label>
          <Input id="payableCurrencyCode" name="currencyCode" defaultValue={defaultSupplier?.currency_code ?? currencyCode} maxLength={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={dueDate} />
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={isPending || suppliers.length === 0}>
        <ReceiptText className="h-4 w-4" />
        {isPending ? "Creating..." : "Create supplier payable"}
      </Button>
    </form>
  );
}
