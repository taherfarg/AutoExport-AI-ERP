"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuotation } from "@/features/sales/actions";

type BranchOption = {
  id: string;
  name: string;
};

type LeadOption = {
  id: string;
  name: string;
};

type VehicleOption = {
  id: string;
  stock_number: string;
  year: number;
  brand: string;
  model: string;
  selling_price: number;
  currency_code: string;
};

type UserOption = {
  id: string;
  full_name: string;
};

type QuotationCreateFormProps = {
  branches: BranchOption[];
  companyId: string;
  defaultBranchId: string;
  defaultValidUntil: string;
  defaultVehicle: VehicleOption;
  leads: LeadOption[];
  profileId: string;
  users: UserOption[];
};

export function QuotationCreateForm({
  branches,
  companyId,
  defaultBranchId,
  defaultValidUntil,
  defaultVehicle,
  leads,
  profileId,
  users,
}: QuotationCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(undefined);

    startTransition(async () => {
      let result;
      try {
        result = await createQuotation(formData);
      } catch {
        setError("Quotation could not be created. Please refresh and try again.");
        return;
      }

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/sales/quotations/${result.quotationId}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-4">
          {error}
        </div>
      ) : null}
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-2">
        <Label htmlFor="quotationBranchId">Branch</Label>
        <select id="quotationBranchId" name="branchId" defaultValue={defaultBranchId} className="h-9 rounded-md border bg-white px-3 text-sm">
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="leadId">Lead</Label>
        <select id="leadId" name="leadId" defaultValue={leads[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">No lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>{lead.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="vehicleId">Vehicle</Label>
        <select id="vehicleId" name="vehicleId" defaultValue={defaultVehicle.id} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value={defaultVehicle.id}>
            {defaultVehicle.stock_number} - {defaultVehicle.year} {defaultVehicle.brand} {defaultVehicle.model}
          </option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="price">Price</Label>
        <Input id="price" name="price" type="number" min="0" defaultValue={defaultVehicle.selling_price} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="discount">Discount</Label>
        <Input id="discount" name="discount" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tax">Tax</Label>
        <Input id="tax" name="tax" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currencyCode">Currency</Label>
        <Input id="currencyCode" name="currencyCode" defaultValue={defaultVehicle.currency_code} maxLength={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="validUntil">Valid until</Label>
        <Input id="validUntil" name="validUntil" type="date" defaultValue={defaultValidUntil} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="salespersonId">Salesperson</Label>
        <select id="salespersonId" name="salespersonId" defaultValue={profileId} className="h-9 rounded-md border bg-white px-3 text-sm">
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.full_name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Export price valid for seven days" />
      </div>
      <div className="flex items-end md:col-span-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create quotation"}
        </Button>
      </div>
    </form>
  );
}
