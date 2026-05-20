"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, PackagePlus, Plus, Repeat2, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPart,
  createPartPurchaseOrder,
  createPartPurchaseOrderItem,
  createPartReceipt,
  createPartSupplier,
  createPartTransfer,
  createServicePartLine,
} from "@/features/parts/actions";
import type {
  PartPurchaseOrderItemRow,
  PartPurchaseOrderRow,
  PartRow,
  PartServiceJobOption,
  PartServiceOrderOption,
  PartSupplierRow,
} from "@/features/parts/queries";
import {
  partOrderStatuses,
  partStatuses,
  partTransferStatuses,
  servicePartLineStatuses,
} from "@/lib/validations/parts";

type BranchOption = { id: string; name: string; currency_code?: string };
type PartsMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: PartsMessage }) {
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
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function usePartsSubmit(action: (formData: FormData) => Promise<{ error?: string; success?: string } | undefined>, fallbackSuccess: string) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<PartsMessage>();
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
      router.replace(`${pathname}?notice=${encodeURIComponent(success)}&parts=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function PartSupplierForm({ companyId }: { companyId: string }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createPartSupplier, "Parts supplier created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <Input name="supplierName" defaultValue="Gulf Genuine Parts" aria-label="Supplier name" required />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="countryCode" defaultValue="AE" maxLength={2} aria-label="Supplier country" />
        <Input name="contactName" defaultValue="Parts Desk" aria-label="Supplier contact" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="email" type="email" defaultValue="parts@example.test" aria-label="Supplier email" />
        <Input name="phone" defaultValue="+971500000099" aria-label="Supplier phone" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <Truck className="h-4 w-4" />
        {isPending ? "Creating..." : "Create supplier"}
      </Button>
    </form>
  );
}

export function PartForm({ companyId, currencyCode }: { companyId: string; currencyCode: string }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createPart, "Part created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="partNumber" defaultValue="LX-FILTER-002" aria-label="Part number" required />
        <Input name="sku" defaultValue="LX-FILTER-001" aria-label="Part SKU" />
      </div>
      <Input name="name" defaultValue="LX 600 Oil Filter" aria-label="Part name" required />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="category" defaultValue="Engine" aria-label="Part category" />
        <Input name="brand" defaultValue="Lexus" aria-label="Part brand" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="unitCost" type="number" min="0" defaultValue="120" aria-label="Part unit cost" />
        <Input name="sellingPrice" type="number" min="0" defaultValue="185" aria-label="Part selling price" />
        <Input name="currencyCode" defaultValue={currencyCode} maxLength={3} aria-label="Part currency" />
        <Input name="reorderPoint" type="number" min="0" defaultValue="3" aria-label="Part reorder point" />
        <Input name="reorderQuantity" type="number" min="0" defaultValue="10" aria-label="Part reorder quantity" />
        <select name="status" defaultValue="active" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Part status">
          {partStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        <PackagePlus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create part"}
      </Button>
    </form>
  );
}

export function PartPurchaseOrderForm({ companyId, branches, suppliers, currencyCode }: { companyId: string; branches: BranchOption[]; suppliers: PartSupplierRow[]; currencyCode: string }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createPartPurchaseOrder, "Parts purchase order created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="branchId" defaultValue={branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Purchase order branch">
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <select name="supplierId" defaultValue={suppliers[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Purchase order supplier">
        <option value="">No supplier</option>
        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}
      </select>
      <div className="grid gap-3 md:grid-cols-3">
        <select name="status" defaultValue="ordered" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Purchase order status">
          {partOrderStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
        <Input name="taxAmount" type="number" min="0" defaultValue="0" aria-label="Purchase tax amount" />
        <Input name="currencyCode" defaultValue={currencyCode} maxLength={3} aria-label="Purchase currency" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending || branches.length === 0}>
        <ShoppingCart className="h-4 w-4" />
        {isPending ? "Creating..." : "Create purchase order"}
      </Button>
    </form>
  );
}

export function PartPurchaseOrderItemForm({ companyId, purchaseOrders, parts }: { companyId: string; purchaseOrders: PartPurchaseOrderRow[]; parts: PartRow[] }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createPartPurchaseOrderItem, "Purchase order item created.");
  const part = parts[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="purchaseOrderId" defaultValue={purchaseOrders[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Purchase order">
        {purchaseOrders.map((order) => <option key={order.id} value={order.id}>{order.purchase_order_number}</option>)}
      </select>
      <select name="partId" defaultValue={part?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Purchase order part">
        {parts.map((item) => <option key={item.id} value={item.id}>{item.part_number} - {item.name}</option>)}
      </select>
      <Input name="description" defaultValue={part?.name ?? "Oil filter"} aria-label="Purchase item description" />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="quantityOrdered" type="number" min="0" defaultValue="5" aria-label="Quantity ordered" />
        <Input name="unitCost" type="number" min="0" defaultValue={part?.unit_cost ?? 120} aria-label="Purchase unit cost" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending || purchaseOrders.length === 0 || parts.length === 0}>
        <Plus className="h-4 w-4" />
        {isPending ? "Adding..." : "Add PO item"}
      </Button>
    </form>
  );
}

export function PartReceiptForm({ companyId, purchaseItems }: { companyId: string; purchaseItems: PartPurchaseOrderItemRow[] }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createPartReceipt, "Parts receipt posted.");
  const item = purchaseItems[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="purchaseOrderId" value={item?.purchase_order_id ?? ""} />
      <input type="hidden" name="purchaseOrderItemId" value={item?.id ?? ""} />
      <input type="hidden" name="partId" value={item?.part_id ?? ""} />
      <input type="hidden" name="branchId" value={item?.part_purchase_orders?.branch_id ?? ""} />
      <Input value={item ? `${item.part_purchase_orders?.purchase_order_number} - ${item.parts?.name}` : "Create a purchase order item first"} aria-label="Receipt source" readOnly />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="quantityReceived" type="number" min="0" defaultValue="5" aria-label="Quantity received" />
        <Input name="unitCost" type="number" min="0" defaultValue={item?.unit_cost ?? 120} aria-label="Receipt unit cost" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending || !item}>
        <Boxes className="h-4 w-4" />
        {isPending ? "Posting..." : "Post receipt"}
      </Button>
    </form>
  );
}

export function PartTransferForm({ companyId, branches, parts }: { companyId: string; branches: BranchOption[]; parts: PartRow[] }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createPartTransfer, "Parts transfer created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="partId" defaultValue={parts[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Transfer part">
        {parts.map((part) => <option key={part.id} value={part.id}>{part.part_number} - {part.name}</option>)}
      </select>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="fromBranchId" defaultValue={branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Transfer from branch">
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select name="toBranchId" defaultValue={branches[1]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Transfer to branch">
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="quantity" type="number" min="0" defaultValue="1" aria-label="Transfer quantity" />
        <select name="status" defaultValue="received" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Transfer status">
          {partTransferStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={isPending || branches.length < 2 || parts.length === 0}>
        <Repeat2 className="h-4 w-4" />
        {isPending ? "Creating..." : "Create transfer"}
      </Button>
    </form>
  );
}

export function ServicePartLineForm({ companyId, parts, serviceOrders, serviceJobs }: { companyId: string; parts: PartRow[]; serviceOrders: PartServiceOrderOption[]; serviceJobs: PartServiceJobOption[] }) {
  const { formRef, message, isPending, handleSubmit } = usePartsSubmit(createServicePartLine, "Service part line created.");
  const part = parts[0];
  const order = serviceOrders[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={order?.branch_id ?? ""} />
      <select name="serviceOrderId" defaultValue={order?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service order for part">
        {serviceOrders.map((item) => <option key={item.id} value={item.id}>{item.order_number} - {item.title}</option>)}
      </select>
      <select name="serviceJobId" defaultValue={serviceJobs[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service job for part">
        <option value="">No job</option>
        {serviceJobs.map((job) => <option key={job.id} value={job.id}>{job.job_number} - {job.title}</option>)}
      </select>
      <select name="partId" defaultValue={part?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service part">
        {parts.map((item) => <option key={item.id} value={item.id}>{item.part_number} - {item.name}</option>)}
      </select>
      <Input name="description" defaultValue={part ? `${part.name} replacement` : "Part replacement"} aria-label="Service part description" required />
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="quantity" type="number" min="0" defaultValue="1" aria-label="Service part quantity" />
        <Input name="unitCost" type="number" min="0" defaultValue={part?.unit_cost ?? 120} aria-label="Service part unit cost" />
        <Input name="sellingPrice" type="number" min="0" defaultValue={part?.selling_price ?? 185} aria-label="Service part selling price" />
        <select name="status" defaultValue="used" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service part status">
          {servicePartLineStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={isPending || !order || !part}>
        <PackagePlus className="h-4 w-4" />
        {isPending ? "Adding..." : "Add service part"}
      </Button>
    </form>
  );
}
