"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, Plus, ShieldCheck, UserRoundCog, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createInspectionResult,
  createServiceAppointment,
  createServiceJob,
  createServiceLaborLine,
  createServiceOrder,
  createTechnician,
  createWarrantyClaim,
} from "@/features/service/actions";
import type {
  InspectionChecklistRow,
  ServiceCustomerOption,
  ServiceJobRow,
  ServiceOrderRow,
  ServiceVehicleOption,
  TechnicianRow,
} from "@/features/service/queries";
import {
  inspectionResultStatuses,
  serviceJobStatuses,
  serviceLaborTypes,
  servicePriorities,
  technicianStatuses,
  warrantyClaimStatuses,
} from "@/lib/validations/service";

type BranchOption = { id: string; name: string; currency_code?: string };
type ServiceMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: ServiceMessage }) {
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

function useServiceSubmit(action: (formData: FormData) => Promise<{ error?: string; success?: string } | undefined>, fallbackSuccess: string) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<ServiceMessage>();
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
      router.replace(`${pathname}?notice=${encodeURIComponent(success)}&service=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function TechnicianForm({ companyId, branches, currencyCode }: { companyId: string; branches: BranchOption[]; currencyCode: string }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createTechnician, "Technician created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="branchId" defaultValue={branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Technician branch">
        <option value="">Company level</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <Input id="displayName" name="displayName" defaultValue="Senior Technician" aria-label="Technician name" required />
      <Input id="specialization" name="specialization" defaultValue="Diagnostics and repair" aria-label="Technician specialization" />
      <div className="grid gap-3 md:grid-cols-3">
        <Input id="hourlyRate" name="hourlyRate" type="number" min="0" defaultValue="180" aria-label="Technician hourly rate" />
        <Input name="currencyCode" defaultValue={currencyCode} maxLength={3} aria-label="Technician currency" />
        <select name="status" defaultValue="active" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Technician status">
          {technicianStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        <UserRoundCog className="h-4 w-4" />
        {isPending ? "Creating..." : "Create technician"}
      </Button>
    </form>
  );
}

export function ServiceAppointmentForm({ companyId, branches, vehicles, customers, startIso }: { companyId: string; branches: BranchOption[]; vehicles: ServiceVehicleOption[]; customers: ServiceCustomerOption[]; startIso: string }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createServiceAppointment, "Service appointment created.");
  const vehicle = vehicles[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="branchId" defaultValue={vehicle?.branch_id ?? branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Appointment branch">
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <Input id="appointmentTitle" name="title" defaultValue="Vehicle health check appointment" aria-label="Appointment title" required />
      <select name="vehicleId" defaultValue={vehicle?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Appointment vehicle">
        <option value="">No vehicle</option>
        {vehicles.map((item) => <option key={item.id} value={item.id}>{item.stock_number} - {item.brand} {item.model}</option>)}
      </select>
      <select name="customerId" defaultValue={customers[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Appointment customer">
        <option value="">No customer</option>
        {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
      </select>
      <Input name="scheduledStart" defaultValue={startIso} aria-label="Appointment start" />
      <Button type="submit" variant="outline" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create appointment"}
      </Button>
    </form>
  );
}

export function ServiceOrderForm({ companyId, branches, vehicles, customers, currencyCode }: { companyId: string; branches: BranchOption[]; vehicles: ServiceVehicleOption[]; customers: ServiceCustomerOption[]; currencyCode: string }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createServiceOrder, "Service order created.");
  const vehicle = vehicles[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <select name="branchId" defaultValue={vehicle?.branch_id ?? branches[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service order branch">
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <Input id="serviceTitle" name="title" defaultValue="Brake vibration diagnosis" aria-label="Service order title" required />
      <Input id="complaint" name="complaint" defaultValue="Customer reports brake vibration at speed" aria-label="Customer complaint" />
      <div className="grid gap-3 md:grid-cols-2">
        <select name="vehicleId" defaultValue={vehicle?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service vehicle">
          <option value="">No vehicle</option>
          {vehicles.map((item) => <option key={item.id} value={item.id}>{item.stock_number} - {item.brand} {item.model}</option>)}
        </select>
        <select name="customerId" defaultValue={customers[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service customer">
          <option value="">No customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="odometer" type="number" min="0" defaultValue="25000" aria-label="Odometer" />
        <select name="priority" defaultValue="normal" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Service priority">
          {servicePriorities.map((priority) => <option key={priority} value={priority}>{labelize(priority)}</option>)}
        </select>
        <Input name="currencyCode" defaultValue={currencyCode} maxLength={3} aria-label="Service currency" />
      </div>
      <Button type="submit" disabled={isPending}>
        <Wrench className="h-4 w-4" />
        {isPending ? "Creating..." : "Create service order"}
      </Button>
    </form>
  );
}

export function ServiceJobForm({ companyId, orders, technicians }: { companyId: string; orders: ServiceOrderRow[]; technicians: TechnicianRow[] }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createServiceJob, "Service job created.");
  const order = orders[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={order?.branch_id ?? ""} />
      <select name="serviceOrderId" defaultValue={order?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Job service order">
        {orders.map((item) => <option key={item.id} value={item.id}>{item.order_number} - {item.title}</option>)}
      </select>
      <select name="technicianId" defaultValue={technicians[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Job technician">
        <option value="">Unassigned</option>
        {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.display_name}</option>)}
      </select>
      <Input id="jobTitle" name="title" defaultValue="Brake diagnosis" aria-label="Job title" required />
      <div className="grid gap-3 md:grid-cols-3">
        <select name="laborType" defaultValue="diagnosis" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Job labor type">
          {serviceLaborTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
        </select>
        <select name="status" defaultValue={serviceJobStatuses[1]} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Job status">
          {serviceJobStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
        <Input name="estimatedHours" type="number" step="0.1" min="0" defaultValue="1.5" aria-label="Estimated hours" />
        <Input name="laborRate" type="number" min="0" defaultValue={technicians[0]?.hourly_rate ?? 180} aria-label="Job labor rate" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending || !order}>
        {isPending ? "Creating..." : "Create service job"}
      </Button>
    </form>
  );
}

export function LaborLineForm({ companyId, orders, jobs, technicians }: { companyId: string; orders: ServiceOrderRow[]; jobs: ServiceJobRow[]; technicians: TechnicianRow[] }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createServiceLaborLine, "Labor line created.");
  const order = orders[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={order?.branch_id ?? ""} />
      <select name="serviceOrderId" defaultValue={order?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Labor service order">
        {orders.map((item) => <option key={item.id} value={item.id}>{item.order_number}</option>)}
      </select>
      <select name="serviceJobId" defaultValue={jobs[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Labor service job">
        <option value="">No job</option>
        {jobs.map((job) => <option key={job.id} value={job.id}>{job.job_number} - {job.title}</option>)}
      </select>
      <select name="technicianId" defaultValue={technicians[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Labor technician">
        <option value="">No technician</option>
        {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.display_name}</option>)}
      </select>
      <Input id="laborDescription" name="description" defaultValue="Initial brake diagnosis labor" aria-label="Labor description" required />
      <div className="grid gap-3 md:grid-cols-3">
        <select name="laborType" defaultValue="diagnosis" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Labor type">
          {serviceLaborTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
        </select>
        <Input name="hours" type="number" step="0.1" min="0" defaultValue="2" aria-label="Labor hours" />
        <Input name="hourlyRate" type="number" min="0" defaultValue={technicians[0]?.hourly_rate ?? 180} aria-label="Labor hourly rate" />
      </div>
      <Button type="submit" variant="outline" disabled={isPending || !order}>
        {isPending ? "Creating..." : "Create labor line"}
      </Button>
    </form>
  );
}

export function InspectionResultForm({ companyId, orders, technicians, checklists }: { companyId: string; orders: ServiceOrderRow[]; technicians: TechnicianRow[]; checklists: InspectionChecklistRow[] }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createInspectionResult, "Inspection result created.");
  const order = orders[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={order?.branch_id ?? ""} />
      <input type="hidden" name="serviceOrderId" value={order?.id ?? ""} />
      <input type="hidden" name="vehicleId" value={order?.vehicle_id ?? ""} />
      <select name="checklistId" defaultValue={checklists[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Inspection checklist">
        <option value="">No checklist</option>
        {checklists.map((checklist) => <option key={checklist.id} value={checklist.id}>{checklist.name}</option>)}
      </select>
      <select name="technicianId" defaultValue={technicians[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Inspection technician">
        <option value="">No technician</option>
        {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.display_name}</option>)}
      </select>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="overallStatus" defaultValue="attention" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Inspection status">
          {inspectionResultStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
        <Input name="scorePercent" type="number" min="0" max="100" defaultValue="82" aria-label="Inspection score" />
      </div>
      <Input name="results" defaultValue='{"brakes":"attention","engine":"pass"}' aria-label="Inspection results" />
      <Button type="submit" variant="outline" disabled={isPending || !order}>
        <ClipboardCheck className="h-4 w-4" />
        {isPending ? "Creating..." : "Create inspection result"}
      </Button>
    </form>
  );
}

export function WarrantyClaimForm({ companyId, orders }: { companyId: string; orders: ServiceOrderRow[] }) {
  const { formRef, message, isPending, handleSubmit } = useServiceSubmit(createWarrantyClaim, "Warranty claim created.");
  const order = orders[0];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={order?.branch_id ?? ""} />
      <input type="hidden" name="serviceOrderId" value={order?.id ?? ""} />
      <input type="hidden" name="vehicleId" value={order?.vehicle_id ?? ""} />
      <input type="hidden" name="customerId" value={order?.customer_id ?? ""} />
      <Input id="providerName" name="providerName" defaultValue="Factory Warranty" aria-label="Warranty provider" required />
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="claimAmount" type="number" min="0" defaultValue="3000" aria-label="Claim amount" />
        <Input name="approvedAmount" type="number" min="0" defaultValue="2500" aria-label="Approved amount" />
        <Input name="paidAmount" type="number" min="0" defaultValue="1000" aria-label="Paid amount" />
        <Input name="currencyCode" defaultValue={order?.currency_code ?? "AED"} maxLength={3} aria-label="Warranty currency" />
        <select name="status" defaultValue="approved" className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Warranty status">
          {warrantyClaimStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={isPending || !order}>
        <ShieldCheck className="h-4 w-4" />
        {isPending ? "Creating..." : "Create warranty claim"}
      </Button>
    </form>
  );
}
