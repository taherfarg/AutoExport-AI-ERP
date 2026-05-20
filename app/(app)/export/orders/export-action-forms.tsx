"use client";

import { FormEvent, ReactNode, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExportOrder, createImportOrder } from "@/features/export/actions";
import { formatExportStatus } from "@/lib/export/format";
import { shippingMethods } from "@/lib/validations/export";

type BranchOption = { id: string; name: string };
type DestinationOption = { country_code: string; country_name: string };
type PartnerOption = { id: string; name: string };
type VehicleOption = { id: string; stock_number: string; brand: string; model: string; year: number };
type ExportMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: ExportMessage }) {
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

function useExportSubmit<T extends { error?: string; success?: string } | undefined>(
  action: (formData: FormData) => Promise<T>,
  onSuccess: (result: Exclude<T, undefined>) => void,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<ExportMessage>();
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

      if (result) {
        formRef.current?.reset();
        setMessage({ type: "success", text: result.success ?? "Saved." });
        onSuccess(result as Exclude<T, undefined>);
      }
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

function Field({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-2 ${className}`}>{children}</div>;
}

export function ExportOrderCreateForm({
  branches,
  companyId,
  defaultBranchId,
  defaultVehicleId,
  destinations,
  vehicles,
  shippingPartners,
  brokerPartners,
  etd,
  eta,
}: {
  branches: BranchOption[];
  companyId: string;
  defaultBranchId: string;
  defaultVehicleId: string;
  destinations: DestinationOption[];
  vehicles: VehicleOption[];
  shippingPartners: PartnerOption[];
  brokerPartners: PartnerOption[];
  etd: string;
  eta: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useExportSubmit(createExportOrder, (result) => {
    if ("orderId" in result && result.orderId) {
      window.location.assign(`/export/orders/${result.orderId}`);
    }
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
      <div className="md:col-span-4">
        <Message message={message} />
      </div>
      <input type="hidden" name="companyId" value={companyId} />
      <Field>
        <Label htmlFor="branchIdForm">Branch</Label>
        <select id="branchIdForm" name="branchId" defaultValue={defaultBranchId} className="h-9 rounded-md border bg-white px-3 text-sm">
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </Field>
      <Field className="md:col-span-2">
        <Label htmlFor="vehicleId">Vehicle</Label>
        <select id="vehicleId" name="vehicleId" defaultValue={defaultVehicleId} className="h-9 rounded-md border bg-white px-3 text-sm">
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.stock_number} - {vehicle.year} {vehicle.brand} {vehicle.model}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <Label htmlFor="destinationCountryCode">Destination</Label>
        <select id="destinationCountryCode" name="destinationCountryCode" defaultValue="DZ" className="h-9 rounded-md border bg-white px-3 text-sm">
          {destinations.map((country) => (
            <option key={country.country_code} value={country.country_code}>
              {country.country_name}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <Label htmlFor="destinationPort">Destination port</Label>
        <Input id="destinationPort" name="destinationPort" defaultValue="Algiers" required />
      </Field>
      <Field>
        <Label htmlFor="shippingMethod">Shipping method</Label>
        <select id="shippingMethod" name="shippingMethod" defaultValue="container" className="h-9 rounded-md border bg-white px-3 text-sm">
          {shippingMethods.map((method) => (
            <option key={method} value={method}>
              {formatExportStatus(method)}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <Label htmlFor="shippingCompanyId">Shipping partner</Label>
        <select id="shippingCompanyId" name="shippingCompanyId" defaultValue={shippingPartners[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">No partner</option>
          {shippingPartners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <Label htmlFor="logisticsPartnerId">Customs broker</Label>
        <select id="logisticsPartnerId" name="logisticsPartnerId" defaultValue={brokerPartners[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="">No broker</option>
          {brokerPartners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <Label htmlFor="bookingNumber">Booking number</Label>
        <Input id="bookingNumber" name="bookingNumber" />
      </Field>
      <Field>
        <Label htmlFor="containerNumber">Container number</Label>
        <Input id="containerNumber" name="containerNumber" />
      </Field>
      <Field>
        <Label htmlFor="blNumber">BL number</Label>
        <Input id="blNumber" name="blNumber" />
      </Field>
      <Field>
        <Label htmlFor="estimatedDepartureDate">ETD</Label>
        <Input id="estimatedDepartureDate" name="estimatedDepartureDate" type="date" defaultValue={etd} />
      </Field>
      <Field>
        <Label htmlFor="estimatedArrivalDate">ETA</Label>
        <Input id="estimatedArrivalDate" name="estimatedArrivalDate" type="date" defaultValue={eta} />
      </Field>
      <Field className="md:col-span-3">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Export handling notes" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={isPending}>
          <Ship className="h-4 w-4" />
          {isPending ? "Creating..." : "Create order"}
        </Button>
      </div>
    </form>
  );
}

export function ImportOrderCreateForm({
  companyId,
  defaultBranchId,
}: {
  companyId: string;
  defaultBranchId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { formRef, message, isPending, handleSubmit } = useExportSubmit(createImportOrder, (result) => {
    const success = result.success ?? "Import order created.";
    router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
    router.refresh();
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 rounded-md border p-4">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={defaultBranchId} />
      <Field>
        <Label htmlFor="supplierName">Supplier</Label>
        <Input id="supplierName" name="supplierName" defaultValue="Belgium Auto Supplier" required />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Label htmlFor="originCountryCode">Origin</Label>
          <Input id="originCountryCode" name="originCountryCode" defaultValue="BE" maxLength={2} required />
        </Field>
        <Field>
          <Label htmlFor="destinationCountryCodeImport">Destination</Label>
          <Input id="destinationCountryCodeImport" name="destinationCountryCode" defaultValue="AE" maxLength={2} required />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Label htmlFor="originPort">Origin port</Label>
          <Input id="originPort" name="originPort" defaultValue="Antwerp" />
        </Field>
        <Field>
          <Label htmlFor="destinationPortImport">Destination port</Label>
          <Input id="destinationPortImport" name="destinationPort" defaultValue="Jebel Ali" />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Label htmlFor="shippingMethodImport">Method</Label>
          <select id="shippingMethodImport" name="shippingMethod" defaultValue="ro_ro" className="h-9 rounded-md border bg-white px-3 text-sm">
            {shippingMethods.map((method) => (
              <option key={method} value={method}>
                {formatExportStatus(method)}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <Label htmlFor="vehicleCount">Vehicle count</Label>
          <Input id="vehicleCount" name="vehicleCount" type="number" min="1" defaultValue="1" required />
        </Field>
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create import order"}
      </Button>
    </form>
  );
}
