"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVehicle } from "@/features/vehicles/actions";

type VehicleCreateBranch = {
  id: string;
  name: string;
};

type VehicleCreateFormProps = {
  branches: VehicleCreateBranch[];
  companyId: string;
  initialError?: string;
};

export function VehicleCreateForm({ branches, companyId, initialError }: VehicleCreateFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(undefined);

    startTransition(async () => {
      const result = await createVehicle(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.vehicleId) {
        formRef.current?.reset();
        router.push(`/vehicles/${result.vehicleId}`);
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-4">
          {error}
        </div>
      ) : null}
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-2">
        <Label htmlFor="branchIdCreate">Branch</Label>
        <select id="branchIdCreate" name="branchId" defaultValue={branches[0]?.id} className="h-9 rounded-md border bg-white px-3 text-sm">
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="stockNumber">Stock number</Label>
        <Input id="stockNumber" name="stockNumber" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vin">VIN</Label>
        <Input id="vin" name="vin" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vehicleBrand">Brand</Label>
        <Input id="vehicleBrand" name="brand" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="model">Model</Label>
        <Input id="model" name="model" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="year">Year</Label>
        <Input id="year" name="year" type="number" defaultValue="2026" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="trim">Trim</Label>
        <Input id="trim" name="trim" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="condition">Condition</Label>
        <select id="condition" name="condition" defaultValue="new" className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="certified_pre_owned">Certified pre-owned</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="purchasePrice">Purchase price</Label>
        <Input id="purchasePrice" name="purchasePrice" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="shippingCost">Shipping</Label>
        <Input id="shippingCost" name="shippingCost" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="customsCost">Customs</Label>
        <Input id="customsCost" name="customsCost" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preparationCost">Preparation</Label>
        <Input id="preparationCost" name="preparationCost" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sellingPrice">Selling price</Label>
        <Input id="sellingPrice" name="sellingPrice" type="number" min="0" defaultValue="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currencyCode">Currency</Label>
        <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currentCountryCode">Current country</Label>
        <Input id="currentCountryCode" name="currentCountryCode" defaultValue="AE" maxLength={2} />
      </div>
      <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
        <input name="exportAvailable" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
        Export available
      </label>
      <div className="flex items-end gap-2 md:col-span-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create vehicle"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/vehicles">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
