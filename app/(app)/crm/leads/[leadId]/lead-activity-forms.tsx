"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFollowUp, logLeadMessage } from "@/features/crm/actions";
import { formatCrmStatus } from "@/lib/crm/format";
import { followUpPriorities, messageChannels, messageDirections } from "@/lib/validations/crm";

type LeadUserOption = {
  id: string;
  full_name: string;
};

type LeadActivityMessage = {
  type: "success" | "error";
  text: string;
};

function Message({ message }: { message?: LeadActivityMessage }) {
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

function refreshWithSuccess(router: ReturnType<typeof useRouter>, pathname: string, success: string) {
  router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
  router.refresh();
}

export function LeadMessageForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<LeadActivityMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await logLeadMessage(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      const success = result?.success ?? "Message logged.";
      formRef.current?.reset();
      setMessage({ type: "success", text: success });
      refreshWithSuccess(router, pathname, success);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 rounded-md border p-4 md:grid-cols-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="md:col-span-3">
        <Message message={message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="direction">Direction</Label>
        <select id="direction" name="direction" defaultValue="internal" className="h-9 rounded-md border bg-white px-3 text-sm">
          {messageDirections.map((direction) => (
            <option key={direction} value={direction}>{formatCrmStatus(direction)}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="channel">Channel</Label>
        <select id="channel" name="channel" defaultValue="whatsapp" className="h-9 rounded-md border bg-white px-3 text-sm">
          {messageChannels.map((channel) => (
            <option key={channel} value={channel}>{formatCrmStatus(channel)}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" />
      </div>
      <div className="grid gap-2 md:col-span-3">
        <Label htmlFor="body">Message</Label>
        <textarea id="body" name="body" required className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm" />
      </div>
      <div className="md:col-span-3">
        <Button type="submit" variant="outline" disabled={isPending}>
          <MessageSquare className="h-4 w-4" />
          {isPending ? "Logging..." : "Log message"}
        </Button>
      </div>
    </form>
  );
}

export function LeadFollowUpForm({
  leadId,
  defaultAssignedTo,
  defaultDueAt,
  users,
}: {
  leadId: string;
  defaultAssignedTo: string;
  defaultDueAt: string;
  users: LeadUserOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<LeadActivityMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await createFollowUp(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      const success = result?.success ?? "Follow-up created.";
      formRef.current?.reset();
      setMessage({ type: "success", text: success });
      refreshWithSuccess(router, pathname, success);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="leadId" value={leadId} />
      <Message message={message} />
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue="Call buyer" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dueAt">Due date</Label>
        <Input id="dueAt" name="dueAt" type="datetime-local" defaultValue={defaultDueAt} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="priority">Priority</Label>
        <select id="priority" name="priority" defaultValue="normal" className="h-9 rounded-md border bg-white px-3 text-sm">
          {followUpPriorities.map((priority) => (
            <option key={priority} value={priority}>{formatCrmStatus(priority)}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="assignedTo">Owner</Label>
        <select id="assignedTo" name="assignedTo" defaultValue={defaultAssignedTo} className="h-9 rounded-md border bg-white px-3 text-sm">
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.full_name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="followUpNotes">Notes</Label>
        <textarea id="followUpNotes" name="notes" className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm" />
      </div>
      <Button type="submit" disabled={isPending}>
        <CalendarClock className="h-4 w-4" />
        {isPending ? "Creating..." : "Create follow-up"}
      </Button>
    </form>
  );
}
