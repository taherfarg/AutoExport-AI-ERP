"use client";

import { FormEvent, ReactNode, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Clock, Plus, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAlert, createReminder, createTask, updateAlertStatus } from "@/features/operations/actions";
import { formatOperationsStatus } from "@/lib/operations/format";
import { alertPriorities, alertTypes } from "@/lib/validations/operations";

type UserOption = { id: string; full_name: string; email: string };
type ActionMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: ActionMessage }) {
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

function Field({ children }: { children: ReactNode }) {
  return <div className="grid gap-2">{children}</div>;
}

function useAlertSubmit<T extends { error?: string; success?: string } | undefined>(
  action: (formData: FormData) => Promise<T>,
  fallbackSuccess: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function refreshWith(success: string) {
    setMessage({ type: "success", text: success });
    router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
    router.refresh();
  }

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
      refreshWith(success);
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function ResolveAlertForm({ alertId }: { alertId: string }) {
  const { formRef, isPending, handleSubmit } = useAlertSubmit(updateAlertStatus, "Alert resolved.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-3 flex flex-wrap gap-2">
      <input type="hidden" name="alertId" value={alertId} />
      <input type="hidden" name="status" value="resolved" />
      <input type="hidden" name="resolutionNotes" value="Resolved from smart alert queue." />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        <Check className="h-4 w-4" />
        {isPending ? "Resolving..." : "Resolve alert"}
      </Button>
    </form>
  );
}

export function AlertCreateForm({ branchId, companyId }: { branchId?: string; companyId: string }) {
  const { formRef, message, isPending, handleSubmit } = useAlertSubmit(createAlert, "Alert created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <Field>
        <Label htmlFor="alertTitle">Title</Label>
        <Input id="alertTitle" name="title" defaultValue="Payment follow-up required" required />
      </Field>
      <Field>
        <Label htmlFor="alertType">Type</Label>
        <select id="alertType" name="alertType" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="customer_payment_overdue">
          {alertTypes.map((type) => (
            <option key={type} value={type}>
              {formatOperationsStatus(type)}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <Label htmlFor="priority">Priority</Label>
        <select id="priority" name="priority" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="high">
          {alertPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {formatOperationsStatus(priority)}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={isPending}>
        <Siren className="h-4 w-4" />
        {isPending ? "Creating..." : "Create alert"}
      </Button>
    </form>
  );
}

export function TaskCreateForm({
  alertId,
  branchId,
  companyId,
  profileId,
  users,
}: {
  alertId?: string;
  branchId?: string;
  companyId: string;
  profileId: string;
  users: UserOption[];
}) {
  const { formRef, message, isPending, handleSubmit } = useAlertSubmit(createTask, "Task created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <input type="hidden" name="alertId" value={alertId ?? ""} />
      <Field>
        <Label htmlFor="taskTitle">Title</Label>
        <Input id="taskTitle" name="title" defaultValue="Call customer about overdue payment" required />
      </Field>
      <Field>
        <Label htmlFor="assignedTo">Assignee</Label>
        <select id="assignedTo" name="assignedTo" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue={profileId}>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>
      </Field>
      <input type="hidden" name="priority" value="medium" />
      <Button type="submit" variant="outline" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create task"}
      </Button>
    </form>
  );
}

export function ReminderCreateForm({
  branchId,
  companyId,
  defaultRemindAt,
}: {
  branchId?: string;
  companyId: string;
  defaultRemindAt: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useAlertSubmit(createReminder, "Reminder created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <Field>
        <Label htmlFor="reminderTitle">Title</Label>
        <Input id="reminderTitle" name="title" defaultValue="Review alert queue" required />
      </Field>
      <Field>
        <Label htmlFor="remindAt">Remind at</Label>
        <Input id="remindAt" type="datetime-local" name="remindAt" defaultValue={defaultRemindAt} required />
      </Field>
      <Button type="submit" variant="outline" disabled={isPending}>
        <Clock className="h-4 w-4" />
        {isPending ? "Creating..." : "Create reminder"}
      </Button>
    </form>
  );
}
