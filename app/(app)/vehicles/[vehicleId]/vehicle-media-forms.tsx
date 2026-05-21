"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addVehicleDocument, addVehiclePhoto } from "@/features/vehicles/actions";

const DOCUMENT_TYPES = [
  ["vehicle_title", "Vehicle title"],
  ["purchase_invoice", "Purchase invoice"],
  ["inspection_report", "Inspection report"],
  ["insurance", "Insurance"],
  ["export_certificate", "Export certificate"],
  ["certificate_of_origin", "Certificate of origin"],
  ["bill_of_lading", "Bill of lading"],
  ["customs_certificate", "Customs certificate"],
];

type VehicleFormMessage = {
  type: "success" | "error";
  text: string;
};

type VehicleMediaFormProps = {
  vehicleId: string;
};

function Message({ message }: { message?: VehicleFormMessage }) {
  if (!message) {
    return null;
  }

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

export function VehiclePhotoUploadForm({ vehicleId }: VehicleMediaFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<VehicleFormMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await addVehiclePhoto(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      formRef.current?.reset();
      const success = result?.success ?? "Vehicle photo uploaded.";
      setMessage({ type: "success", text: success });
      router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_auto]"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="md:col-span-3">
        <Message message={message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="photo">Photo file</Label>
        <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
        <p className="text-xs text-slate-500">JPEG, PNG, or WebP up to 10 MB.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="altText">Alt text</Label>
        <Input id="altText" name="altText" placeholder="Front exterior" />
      </div>
      <label className="flex items-end gap-2 pb-2 text-sm">
        <input name="isPrimary" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
        Primary
      </label>
      <div className="md:col-span-3">
        <Button type="submit" variant="outline" disabled={isPending}>
          <Upload className="h-4 w-4" />
          {isPending ? "Uploading..." : "Upload photo"}
        </Button>
      </div>
    </form>
  );
}

export function VehicleDocumentUploadForm({ vehicleId }: VehicleMediaFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<VehicleFormMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await addVehicleDocument(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      formRef.current?.reset();
      const success = result?.success ?? "Vehicle document saved.";
      setMessage({ type: "success", text: success });
      router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-md border p-4 md:grid-cols-3"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="md:col-span-3">
        <Message message={message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="documentType">Document type</Label>
        <select id="documentType" name="documentType" className="h-9 rounded-md border bg-white px-3 text-sm">
          {DOCUMENT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="documentTitle">Title</Label>
        <Input id="documentTitle" name="title" defaultValue="Vehicle title" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="documentStatus">Status</Label>
        <select id="documentStatus" name="status" defaultValue="complete" className="h-9 rounded-md border bg-white px-3 text-sm">
          <option value="missing">Missing</option>
          <option value="partial">Partial</option>
          <option value="complete">Complete</option>
          <option value="verified">Verified</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="document">Document file</Label>
        <Input id="document" name="document" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="expiresAt">Expiry date</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="outline" disabled={isPending}>
          <Upload className="h-4 w-4" />
          {isPending ? "Saving..." : "Save document"}
        </Button>
      </div>
    </form>
  );
}
