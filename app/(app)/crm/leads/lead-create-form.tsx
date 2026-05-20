"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLead } from "@/features/crm/actions";
import { formatCrmStatus } from "@/lib/crm/format";
import { customerTypes, leadSources } from "@/lib/validations/crm";

type BranchOption = { id: string; name: string };
type UserOption = { id: string; full_name: string; email: string };

export function LeadCreateForm({
  branches,
  companyId,
  defaultBranchId,
  profileId,
  users,
}: {
  branches: BranchOption[];
  companyId: string;
  defaultBranchId: string;
  profileId: string;
  users: UserOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(undefined);

    startTransition(async () => {
      const result = await createLead(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.leadId) {
        formRef.current?.reset();
        window.location.assign(`/crm/leads/${result.leadId}`);
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
        <Label htmlFor="leadBranchId">Branch</Label>
        <select id="leadBranchId" name="branchId" defaultValue={defaultBranchId} className="h-9 rounded-md border bg-white px-3 text-sm">
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="leadName">Name</Label>
        <Input id="leadName" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="customerType">Type</Label>
        <select id="customerType" name="customerType" defaultValue="individual" className="h-9 rounded-md border bg-white px-3 text-sm">
          {customerTypes.map((type) => (
            <option key={type} value={type}>
              {formatCrmStatus(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="leadSource">Source</Label>
        <select id="leadSource" name="leadSource" defaultValue="website" className="h-9 rounded-md border bg-white px-3 text-sm">
          {leadSources.map((source) => (
            <option key={source} value={source}>
              {formatCrmStatus(source)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input id="whatsapp" name="whatsapp" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="countryCode">Country</Label>
        <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preferredBrand">Preferred brand</Label>
        <Input id="preferredBrand" name="preferredBrand" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preferredModel">Preferred model</Label>
        <Input id="preferredModel" name="preferredModel" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="budget">Budget</Label>
        <Input id="budget" name="budget" type="number" min="0" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currencyCode">Currency</Label>
        <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="language">Language</Label>
        <Input id="language" name="language" defaultValue="en" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="assignedSalespersonId">Owner</Label>
        <select id="assignedSalespersonId" name="assignedSalespersonId" defaultValue={profileId} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 md:col-span-4">
        <Label htmlFor="notes">Notes</Label>
        <textarea id="notes" name="notes" className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex items-end md:col-span-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
